export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          display_name: string
          id: string
          ingame_nick: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          ingame_nick?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          ingame_nick?: string | null
        }
        Relationships: []
      }
      alliance_settings: {
        Row: {
          brand_accent: string | null
          brand_primary: string | null
          captured_at: string | null
          id: string
          motto: string | null
          rank: string | null
          singleton: boolean
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_accent?: string | null
          brand_primary?: string | null
          captured_at?: string | null
          id?: string
          motto?: string | null
          rank?: string | null
          singleton?: boolean
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_accent?: string | null
          brand_primary?: string | null
          captured_at?: string | null
          id?: string
          motto?: string | null
          rank?: string | null
          singleton?: boolean
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      event_occurrences: {
        Row: {
          cancelled: boolean
          created_at: string
          created_by: string | null
          duration_minutes: number
          event_id: string
          id: string
          notes: string | null
          phase_label: string | null
          recurrence_rule: string | null
          starts_at_utc: string
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          event_id: string
          id?: string
          notes?: string | null
          phase_label?: string | null
          recurrence_rule?: string | null
          starts_at_utc: string
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          event_id?: string
          id?: string
          notes?: string | null
          phase_label?: string | null
          recurrence_rule?: string | null
          starts_at_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          added_at: string
          added_by: string | null
          event_occurrence_id: string
          member_id: string
          notes: string | null
          participation_role: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          event_occurrence_id: string
          member_id: string
          notes?: string | null
          participation_role?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          event_occurrence_id?: string
          member_id?: string
          notes?: string | null
          participation_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_occurrence_id_fkey"
            columns: ["event_occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accent_color: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          guide_route: string | null
          icon_url: string | null
          id: string
          is_seasonal: boolean
          name: string
          short_name: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          guide_route?: string | null
          icon_url?: string | null
          id?: string
          is_seasonal?: boolean
          name: string
          short_name?: string | null
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          guide_route?: string | null
          icon_url?: string | null
          id?: string
          is_seasonal?: boolean
          name?: string
          short_name?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      heroes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          generation: number
          id: string
          name: string
          portrait_url: string | null
          preferred_branch: Database["public"]["Enums"]["troop_branch"] | null
          released_at: string | null
          role: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          generation: number
          id?: string
          name: string
          portrait_url?: string | null
          preferred_branch?: Database["public"]["Enums"]["troop_branch"] | null
          released_at?: string | null
          role?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          generation?: number
          id?: string
          name?: string
          portrait_url?: string | null
          preferred_branch?: Database["public"]["Enums"]["troop_branch"] | null
          released_at?: string | null
          role?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      kingdom_milestones: {
        Row: {
          achieved: boolean
          body_html: string | null
          category: Database["public"]["Enums"]["milestone_category"]
          created_at: string
          display_order: number
          generation: number | null
          icon_url: string | null
          id: string
          name: string
          notes: string | null
          slug: string
          source_url: string | null
          tg_level: number | null
          unlock_date_utc: string | null
          updated_at: string
        }
        Insert: {
          achieved?: boolean
          body_html?: string | null
          category: Database["public"]["Enums"]["milestone_category"]
          created_at?: string
          display_order?: number
          generation?: number | null
          icon_url?: string | null
          id?: string
          name: string
          notes?: string | null
          slug: string
          source_url?: string | null
          tg_level?: number | null
          unlock_date_utc?: string | null
          updated_at?: string
        }
        Update: {
          achieved?: boolean
          body_html?: string | null
          category?: Database["public"]["Enums"]["milestone_category"]
          created_at?: string
          display_order?: number
          generation?: number | null
          icon_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          slug?: string
          source_url?: string | null
          tg_level?: number | null
          unlock_date_utc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          account_id: string | null
          event_type: Database["public"]["Enums"]["login_event_type"]
          id: string
          ip_hash: string | null
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          account_id?: string | null
          event_type: Database["public"]["Enums"]["login_event_type"]
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string | null
          event_type?: Database["public"]["Enums"]["login_event_type"]
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      masters: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          portrait_url: string | null
          released_at: string | null
          slug: string
          unlock_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          portrait_url?: string | null
          released_at?: string | null
          slug: string
          unlock_order: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          portrait_url?: string | null
          released_at?: string | null
          slug?: string
          unlock_order?: number
        }
        Relationships: []
      }
      member_accounts: {
        Row: {
          active: boolean
          avatar_hero_slug: string | null
          avatar_image_url: string | null
          created_at: string
          created_by: string | null
          display_name: string
          first_login_at: string | null
          id: string
          language_code: string
          last_login_at: string | null
          member_id: string | null
          password_temporary: boolean
          pwa_installed_at: string | null
          role: Database["public"]["Enums"]["account_role"]
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          avatar_hero_slug?: string | null
          avatar_image_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          first_login_at?: string | null
          id: string
          language_code?: string
          last_login_at?: string | null
          member_id?: string | null
          password_temporary?: boolean
          pwa_installed_at?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          avatar_hero_slug?: string | null
          avatar_image_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          first_login_at?: string | null
          id?: string
          language_code?: string
          last_login_at?: string | null
          member_id?: string | null
          password_temporary?: boolean
          pwa_installed_at?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_power_snapshots: {
        Row: {
          id: string
          member_id: string
          power_m: number
          recorded_by: string | null
          snapshot_at: string
          tg_level: number | null
        }
        Insert: {
          id?: string
          member_id: string
          power_m: number
          recorded_by?: string | null
          snapshot_at?: string
          tg_level?: number | null
        }
        Update: {
          id?: string
          member_id?: string
          power_m?: number
          recorded_by?: string | null
          snapshot_at?: string
          tg_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_power_snapshots_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          dad_tag: string | null
          display_order: number
          id: string
          lang_hint: string | null
          nick: string
          note: string | null
          power_m: number
          rank: Database["public"]["Enums"]["alliance_rank"]
          status: Database["public"]["Enums"]["member_status"]
          status_note: string | null
          subgroup: Database["public"]["Enums"]["member_subgroup"] | null
          tag_position: string | null
          tg_level: number | null
          town_center_level: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dad_tag?: string | null
          display_order?: number
          id?: string
          lang_hint?: string | null
          nick: string
          note?: string | null
          power_m?: number
          rank: Database["public"]["Enums"]["alliance_rank"]
          status?: Database["public"]["Enums"]["member_status"]
          status_note?: string | null
          subgroup?: Database["public"]["Enums"]["member_subgroup"] | null
          tag_position?: string | null
          tg_level?: number | null
          town_center_level?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dad_tag?: string | null
          display_order?: number
          id?: string
          lang_hint?: string | null
          nick?: string
          note?: string | null
          power_m?: number
          rank?: Database["public"]["Enums"]["alliance_rank"]
          status?: Database["public"]["Enums"]["member_status"]
          status_note?: string | null
          subgroup?: Database["public"]["Enums"]["member_subgroup"] | null
          tag_position?: string | null
          tg_level?: number | null
          town_center_level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          active: boolean
          description: string | null
          display_order: number
          generation: number
          id: string
          name: string
          portrait_url: string | null
          released_at: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          description?: string | null
          display_order?: number
          generation: number
          id?: string
          name: string
          portrait_url?: string | null
          released_at?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          description?: string | null
          display_order?: number
          generation?: number
          id?: string
          name?: string
          portrait_url?: string | null
          released_at?: string | null
          slug?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          metadata: Json | null
          poll_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          metadata?: Json | null
          poll_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          metadata?: Json | null
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          account_id: string
          option_id: string
          poll_id: string
          voted_at: string
        }
        Insert: {
          account_id: string
          option_id: string
          poll_id: string
          voted_at?: string
        }
        Update: {
          account_id?: string
          option_id?: string
          poll_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closed_at: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_occurrence_id: string | null
          id: string
          opens_at: string | null
          results_visibility: Database["public"]["Enums"]["results_visibility"]
          share_token: string
          slug: string
          status: Database["public"]["Enums"]["poll_status"]
          title: string
          type: Database["public"]["Enums"]["poll_type"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_occurrence_id?: string | null
          id?: string
          opens_at?: string | null
          results_visibility?: Database["public"]["Enums"]["results_visibility"]
          share_token: string
          slug: string
          status?: Database["public"]["Enums"]["poll_status"]
          title: string
          type: Database["public"]["Enums"]["poll_type"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_occurrence_id?: string | null
          id?: string
          opens_at?: string | null
          results_visibility?: Database["public"]["Enums"]["results_visibility"]
          share_token?: string
          slug?: string
          status?: Database["public"]["Enums"]["poll_status"]
          title?: string
          type?: Database["public"]["Enums"]["poll_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_event_occurrence_id_fkey"
            columns: ["event_occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      push_message_deliveries: {
        Row: {
          attempted_at: string
          delivered_at: string | null
          error: string | null
          id: string
          message_id: string
          opened_at: string | null
          subscription_id: string
        }
        Insert: {
          attempted_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_id: string
          opened_at?: string | null
          subscription_id: string
        }
        Update: {
          attempted_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_id?: string
          opened_at?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_message_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "push_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_message_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_messages: {
        Row: {
          audience: string
          body: string
          cancelled: boolean
          created_at: string
          created_by: string | null
          custom_account_ids: string[] | null
          emoji: string | null
          id: string
          image_url: string | null
          recurrence_rule: string | null
          scheduled_for: string | null
          sent_at: string | null
          tap_target: string
          tap_url: string | null
          title: string
        }
        Insert: {
          audience: string
          body: string
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          custom_account_ids?: string[] | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          recurrence_rule?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          tap_target?: string
          tap_url?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          custom_account_ids?: string[] | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          recurrence_rule?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          tap_target?: string
          tap_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          account_id: string | null
          active: boolean
          auth_token: string
          endpoint: string
          id: string
          language_code: string
          last_used_at: string | null
          p256dh: string
          subscribed_at: string
          user_agent: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          auth_token: string
          endpoint: string
          id?: string
          language_code?: string
          last_used_at?: string | null
          p256dh: string
          subscribed_at?: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean
          auth_token?: string
          endpoint?: string
          id?: string
          language_code?: string
          last_used_at?: string | null
          p256dh?: string
          subscribed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      troop_tier_branch_icons: {
        Row: {
          branch: Database["public"]["Enums"]["troop_branch"]
          icon_url: string
          tier_id: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["troop_branch"]
          icon_url: string
          tier_id: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["troop_branch"]
          icon_url?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "troop_tier_branch_icons_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "troop_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      troop_tiers: {
        Row: {
          description: string | null
          display_order: number
          icon_url: string | null
          id: string
          is_truegold: boolean
          tier_label: string
          training_building_level: number | null
        }
        Insert: {
          description?: string | null
          display_order: number
          icon_url?: string | null
          id?: string
          is_truegold: boolean
          tier_label: string
          training_building_level?: number | null
        }
        Update: {
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_truegold?: boolean
          tier_label?: string
          training_building_level?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_role: {
        Args: never
        Returns: Database["public"]["Enums"]["account_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_ally: { Args: never; Returns: boolean }
      is_voting_member: { Args: never; Returns: boolean }
      record_login_event: {
        Args: {
          p_account_id?: string
          p_event_type: Database["public"]["Enums"]["login_event_type"]
          p_user_agent?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_role: "ally" | "member" | "r2" | "r3" | "r4" | "r5"
      alliance_rank: "r1" | "r2" | "r3" | "r4" | "r5"
      event_status: "active" | "coming-soon" | "archived"
      login_event_type:
        | "signin"
        | "signout"
        | "pwa_install"
        | "pwa_uninstall"
        | "password_change"
        | "failed_signin"
      member_status: "active" | "temporary_out" | "left"
      member_subgroup: "lieutenant" | "alpha" | "enforcerer" | "supreme"
      milestone_category:
        | "truegold"
        | "heroes"
        | "pets"
        | "pvp"
        | "feature"
        | "master"
        | "fog"
        | "war-academy"
        | "other"
      poll_status: "draft" | "open" | "closed" | "archived"
      poll_type: "single" | "multi"
      results_visibility: "during" | "after_close" | "admin_only"
      troop_branch: "infantry" | "cavalry" | "archer"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views']),
> = (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<
  T extends keyof DefaultSchema['Tables'],
> = DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<
  T extends keyof DefaultSchema['Tables'],
> = DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never

export type Enums<
  T extends keyof DefaultSchema['Enums'],
> = DefaultSchema['Enums'][T]
