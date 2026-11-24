# Test before sharing

## Automated local checks

Run `node --check app.js` and `node tests/model.test.cjs` (Node 18+). The model tests check reference distributions, variant counts, value formula, caps, and important migration guardrails. They do NOT execute Postgres or verify RLS behavior.

## Staging checklist (not run on your behalf)

### Install / auth
- Fresh migration completes without errors. Inspect every table, function grant, storage policy, and Security Advisor warning.
- Unauthenticated RPC fails. A forged JWT fails. An unverified email cannot call game RPCs.
- New user receives code at an address outside your project team. Expired and incorrect OTPs fail. Resend is rate limited.
- Choose username and password after verifying. Refresh before and after setup; complete pending setup.
- Test uppercase-duplicate usernames, invalid Unicode/space/punctuation, exact allowed separators, leetspeak blocked words and known false positives. Explicitly test the allowed-word exceptions.
- Sign out/in with password; recover password via email OTP.
- Browser localStorage must not contain a private Supabase key or plaintext password (normal Auth session tokens are expected).

### Roll and inventory integrity
- Two simultaneous roll calls by one user produce at most one grant within a server cooldown. Test different tabs and direct RPC calls.
- Repeated request attempts within cooldown do not consume buffs/bonus or create items/history.
- After roll 10, next successful roll consumes the 2× bonus; next bonus appears at 20. Confirm the effective luck cap includes this bonus.
- For a large seeded staging sample, compare tier/case/finish/accent frequencies statistically to the model. Do not expect rare Interface samples quickly.
- For each generated item, independently recompute its reference probability, actual probability at its luck, and numeric value. Test all accent sets and all three Interface bases.
- Value/ownership cannot be edited via direct REST writes. Account A cannot read B's private stats/inventory through RPC or direct tables.
- Catalog hides unrolled variants; base uppercase remains visible. Trading in a letter does not falsely increment rolled counts or discoveries.
- Hover/click stats show original first-roll modifiers/date/rarity and persistent counts even after trades and crafting.

### Trading (two separate browser profiles)
- A lists one item; it becomes unavailable for crafting, other posts, or offers.
- B offers multiple items; they are reserved. Accept transfers all items exactly once.
- Repeat accept/cancel and race accept vs withdraw. Exactly one valid terminal operation succeeds and inventories conserve item IDs/value.
- A wanted post requires the requested base/filters in B's offer. A must choose payment before acceptance.
- Cancel post releases listed item and every offer. Reject/withdraw releases only that offer. Non-owners cannot cancel/reject/accept another player's records.
- Failed acceptance leaves all previous state unchanged. Test missing IDs, duplicates, consumed/reserved items, 0 or >8 offered items, and post/offer caps.
- Suspend trader B and verify A cannot accept B's outstanding offer.

### Crafting
- Every recipe slot requires a different matching owned item in the specified order.
- Missing, duplicated, traded, reserved or consumed items cause full rollback.
- A successful craft consumes exactly the confirmed IDs, reduces leaderboard value, preserves provenance, and creates the correct buff.
- Luck multiplies then caps at 8; cooldown factor multiplies then clamps at .2; each successful roll decrements each buff. Expired buffs no longer apply.

### Frontend / accessibility
- Test desktop/mobile layout, keyboard focus, dialog escape/close and screen reader status messages.
- Auto-roll stops on every new base letter, selected tiers, selected letters, and any error.
- Test Pi circles, Sigma equations, each Interface palette/gear motif, cutscene skip, settings toggles, reduced-motion mode, and finish fade flash.
- A dropped request after commit can leave a successful roll on the server without a reveal. Refresh must show inventory and counters; do not blindly retry writes. A future version should add request IDs and explicit reconciliation for prettier recovery UX.
- Upload raster avatar; test cancel, image resize, invalid/SVG file, oversized upload, another user's path, and public image visibility.
- Leaderboard sorts top 100 descending with exact DB values; formatting may round large values in the UI.

## Release gate

Do not advertise this as production-ready until a real staging migration, security review, real-email signup/recovery, two-account trade/craft concurrency tests, and browser tests have passed. Record the actual results and dependency versions for your release.
