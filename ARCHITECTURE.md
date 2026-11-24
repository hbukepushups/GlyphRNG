# Architecture

```
GitHub repository ── GitHub Pages: HTML / CSS / JS
                                  │
                                  ├── Supabase Auth: email OTP, passwords, JWT session
                                  ├── Supabase Storage: public WebP profile images
                                  └── Supabase PostgREST RPC: glyph_api(action, args)
                                                  │
                                           Supabase Postgres
                                 authoritative rolls / inventory / trades / crafting
```

There is no long-running game websocket server. Players interact through authenticated requests. Market and leaderboard refresh when opened or manually refreshed; they are not live push subscriptions. Auto-roll is a client scheduler, while the actual roll and cooldown are server-enforced.

## Why no Neon?

This implementation uses Supabase's bundled Postgres, auth schema and storage schema. A second Postgres database would duplicate the authority and complicate atomic transactions. GitHub + Supabase is the complete chosen stack, not an incomplete Neon setup.

If you specifically want Neon as the authoritative economy store, use a server-side API host (not GitHub Pages) to verify Supabase JWTs, establish a trusted user ID, and run transactions in Neon using a private database credential. Replace auth.uid(), auth.users references and Supabase storage joins in the migration. Handle verified-email status, user lifecycle events, migrations, authorization and transaction boundaries explicitly. Do not expose a Neon connection string in config.js. This separate backend is not included or needed here.

## Tables

- glyph_letters: pools and accent eligibility.
- glyph_profiles: pseudonymous username, avatar path, roll counters, cooldown, bonus and suspension.
- glyph_items: per-roll inventory instances and current ownership; exact reference value; consumed flag and escrow reservation.
- glyph_rolls: permanent original roll provenance, unaffected by trades or crafting.
- glyph_recipes / glyph_buffs: server-defined ingredients and active roll-count effects.
- glyph_posts / glyph_offers: want/have market and reserved offers.
- glyph_blocked_terms: server-side moderation baseline.
- glyph_rules: placeholder for a future economy-version migration. The current initial probability/value rules are fixed at v1; this table is not yet a runtime rules engine.

## Public authenticated API

Call supabase.rpc('glyph_api', { action, args }). All game actions require a verified session. bootstrap may return profile:null so a verified new account can set up its username.

| action | args |
|---|---|
| setup | username |
| bootstrap | none |
| roll | none |
| stats | base |
| craft | recipe, items: ordered UUID array |
| avatar | path: own UUID/avatar.webp |
| leaderboard | none |
| market | none |
| post | kind:have, item OR kind:want, base, finish, form |
| offer | post, items: UUID array |
| cancel_post | post |
| cancel_offer / reject | offer |
| accept | offer; plus payment UUID array for wanted posts |

No endpoint accepts caller-supplied probabilities, values, luck multipliers, cooldown timestamps, or target owner IDs. Do not add a development grant/seed endpoint to the public API.
