# DAD War Room — design-sync notes

## CRITICAL: Mobile PWA focus
The PRIMARY target for this design system is **mobile PWA** (iPhone in
standalone mode, 375px viewport). Every component card, every preview, and
every design built with this system MUST be evaluated against the mobile
PWA experience FIRST.

- Render component previews at mobile viewport (375px) — not desktop
- Tap targets ≥ 44px
- Safe-area aware (`env(safe-area-inset-bottom)` for fixed bars)
- No `position: sticky` (iOS PWA bug — use `fixed`)
- Test in iPhone standalone PWA mode, not desktop browser
- Desktop layouts are SECONDARY — if a design only looks good on desktop,
  it has failed the primary use case
- Touch interaction first, mouse hover is decoration

Salles 2026-06-18: rejected multiple iterations where the designer
optimized for desktop preview. Mobile first or it's wrong.
