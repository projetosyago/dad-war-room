// supabase/functions/send-push/index.ts
// Wave 3 — DAD War Room push fan-out worker.
//
// Reads `public.push_messages` rows that are due (scheduled_for <= now()),
// expands the audience into `public.push_subscriptions`, calls Web Push for each,
// records every attempt in `public.push_message_deliveries`, and stamps the
// message's `sent_at` so it is not picked up again.
//
// Trigger this Function periodically (e.g. every minute via pg_cron or an
// external scheduler). Idempotent: a row is locked by `sent_at IS NULL` and
// gets stamped before the next invocation can reach it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@dad-war-room.local";

const MAX_DELIVERIES_PER_INVOCATION = 500;

interface PushMessage {
  id: string;
  title: string;
  body: string;
  emoji: string | null;
  image_url: string | null;
  audience: "all" | "voting" | "admins" | "allies" | "custom";
  custom_account_ids: string[] | null;
  tap_target: "hub" | "events" | "polls" | "alliance" | "url";
  tap_url: string | null;
}

interface Subscription {
  id: string;
  account_id: string | null;
  endpoint: string;
  p256dh: string;
  auth_token: string;
}

function audienceRoles(audience: PushMessage["audience"]): string[] | null {
  switch (audience) {
    case "voting":
      return ["member", "r2", "r3", "r4", "r5"];
    case "admins":
      return ["r4", "r5"];
    case "allies":
      return ["ally"];
    default:
      return null;
  }
}

Deno.serve(async () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as Supabase secrets." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();

  // 1) Pick up due messages.
  const { data: messages, error: msgErr } = await supabase
    .from("push_messages")
    .select("id,title,body,emoji,image_url,audience,custom_account_ids,tap_target,tap_url")
    .is("sent_at", null)
    .eq("cancelled", false)
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (msgErr) {
    return new Response(JSON.stringify({ error: msgErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let totalProcessed = 0;
  let totalDelivered = 0;
  let totalFailed = 0;
  const errors: Array<{ message_id: string; subscription_id: string; error: string }> = [];
  const processedMessageIds: string[] = [];

  let remainingBudget = MAX_DELIVERIES_PER_INVOCATION;

  for (const message of (messages ?? []) as PushMessage[]) {
    if (remainingBudget <= 0) break;

    // 2) Expand audience to active subscriptions.
    let subsQuery = supabase
      .from("push_subscriptions")
      .select("id,account_id,endpoint,p256dh,auth_token")
      .eq("active", true);

    if (message.audience === "custom") {
      const ids = message.custom_account_ids ?? [];
      if (ids.length === 0) {
        // Nothing to do — still mark sent so we don't retry.
        processedMessageIds.push(message.id);
        totalProcessed++;
        continue;
      }
      subsQuery = subsQuery.in("account_id", ids);
    } else if (message.audience !== "all") {
      const roles = audienceRoles(message.audience);
      if (roles && roles.length > 0) {
        // Find accounts in scope, then filter subscriptions by account_id.
        const { data: accts, error: acctErr } = await supabase
          .from("member_accounts")
          .select("id")
          .in("role", roles);
        if (acctErr) {
          errors.push({ message_id: message.id, subscription_id: "", error: `audience expansion: ${acctErr.message}` });
          continue;
        }
        const ids = (accts ?? []).map((a: { id: string }) => a.id);
        if (ids.length === 0) {
          processedMessageIds.push(message.id);
          totalProcessed++;
          continue;
        }
        subsQuery = subsQuery.in("account_id", ids);
      }
    }

    const { data: subs, error: subErr } = await subsQuery.limit(remainingBudget);
    if (subErr) {
      errors.push({ message_id: message.id, subscription_id: "", error: `subs query: ${subErr.message}` });
      continue;
    }

    const subscriptions = (subs ?? []) as Subscription[];
    if (subscriptions.length === 0) {
      processedMessageIds.push(message.id);
      totalProcessed++;
      continue;
    }

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      emoji: message.emoji,
      image: message.image_url,
      tap_target: message.tap_target,
      tap_url: message.tap_url,
      message_id: message.id,
    });

    // 3) Send to each subscription, recording the attempt.
    const deliveryRows: Array<{
      message_id: string;
      subscription_id: string;
      delivered_at: string | null;
      error: string | null;
    }> = [];

    for (const sub of subscriptions) {
      if (remainingBudget <= 0) break;
      remainingBudget--;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_token },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        deliveryRows.push({
          message_id: message.id,
          subscription_id: sub.id,
          delivered_at: new Date().toISOString(),
          error: null,
        });
        totalDelivered++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        deliveryRows.push({
          message_id: message.id,
          subscription_id: sub.id,
          delivered_at: null,
          error: msg,
        });
        errors.push({ message_id: message.id, subscription_id: sub.id, error: msg });
        totalFailed++;
        // Deactivate subscriptions the push service has dropped (410/404).
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
        }
      }
    }

    if (deliveryRows.length > 0) {
      const { error: insErr } = await supabase.from("push_message_deliveries").insert(deliveryRows);
      if (insErr) {
        errors.push({ message_id: message.id, subscription_id: "", error: `deliveries insert: ${insErr.message}` });
      }
    }

    processedMessageIds.push(message.id);
    totalProcessed++;
  }

  // 4) Stamp processed messages so we don't pick them up again.
  if (processedMessageIds.length > 0) {
    const { error: upErr } = await supabase
      .from("push_messages")
      .update({ sent_at: new Date().toISOString() })
      .in("id", processedMessageIds);
    if (upErr) {
      errors.push({ message_id: processedMessageIds.join(","), subscription_id: "", error: `sent_at stamp: ${upErr.message}` });
    }
  }

  return new Response(
    JSON.stringify({
      processed: totalProcessed,
      delivered: totalDelivered,
      failed: totalFailed,
      errors,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
