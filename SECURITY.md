# Security and operations notes

## Trust boundary

The browser is untrusted. It sends intentions (roll, craft recipe with exact item IDs, offer exact item IDs), not chances, values, balances, ownership changes, or buff strengths. Supabase Auth validates passwords and email OTPs. The authenticated JWT supplies auth.uid(). The RPC checks verified email and checks profile suspension before any economy mutation.

Game tables enable RLS and have all grants revoked from anon/authenticated. The single SECURITY DEFINER RPC is granted only to authenticated; the RNG helper is not directly executable. Its search_path is pinned to trusted schemas; CREATE in public is explicitly revoked from untrusted roles. Supabase SQL Editor creates the function as a trusted database owner. Do not later grant players table write access or CREATE privileges on any schema in the function search_path.

Do not add broad storage policies or reuse an insecure existing project. Start with a clean project, because permissive policies or grants created elsewhere can defeat these assumptions. Run Supabase Security Advisor and inspect grants/policies after installation.

## Atomic transactions

All RPCs acquire one database advisory transaction lock. A SQL function call commits or rolls back as one transaction. A trade validates all ownership and escrow reservations before transfers, and releases losing offers when a post closes. Crafting validates every distinct ordered ingredient, and consumes them together. Roll grant, history, counters, bonus, booster decrement and cooldown update are in one transaction.

The global lock is intentional for simplicity and avoiding cross-player deadlocks. It is not a large-scale architecture. Replace it with carefully ordered per-account/per-item locks and concurrency tests as the game grows.

Rollback must leave no half-trade or partially burned recipe. Never move transfers or crafting validation into client JavaScript.

## Remaining launch work

- Independent SQL/function/RLS security review and staging integration tests.
- Pin/vendor dependencies, add a CSP appropriate for your host, set monitoring and alerting. GitHub Pages limits custom HTTP-header controls; another static host may be preferable for hardened deployment.
- Configure SMTP/DNS, CAPTCHA integration, signup/IP throttling, abuse prevention, account recovery tests, session/logout tests, and project budgets. Supabase Auth rate limits alone do not stop game bot farms.
- Add an admin UI with separate privileged authorization and audit logging. The current package deliberately has no browser admin secret or admin RPC.
- Moderate profile pictures and usernames; implement reporting, appeals, and a way to remove abusive content.
- Publish privacy/retention/community policies, consent requirements appropriate to your audience, and an account deletion/export workflow. Do not cascade-delete a profile without an inventory/trading/provenance plan. This beta does not implement account self-deletion.
- Expire abandoned trade reservations with a trusted scheduled job, or have users cancel manually. Open post/offer caps limit but do not eliminate long-lived escrow.
- Add pagination and aggregated inventory/provenance counters, materialized leaderboard refreshes, backups, and restore drills.
- Avoid claiming market balance: expected value under 1/P valuation increases with the number of collectible variants, and rare items create enormous wealth jumps. Consider a separate competitive score later.
- Public avatar uploads reveal a stable account UUID in the public image path. Public market rows also contain pseudonymous account IDs and item provenance. Do not put personal information into usernames.

## Basic moderation administration (SQL Editor only)

```sql
-- Add a normalized lower-case term:
insert into public.glyph_blocked_terms(term) values ('exampleblockedterm');
-- Suspend an account after review:
update public.glyph_profiles set banned = true where username_key = lower('ExactUsername');
-- Remove public avatar metadata (also delete the object in Storage):
update public.glyph_profiles set avatar_path = null where username_key = lower('ExactUsername');
```

Suspension does not automatically close existing posts or delete public avatar files. An admin must moderate those too. The server prevents a suspended counterparty's offer from being accepted. Consider closing all of their open reservations as part of your admin workflow.

Never commit database connection passwords, personal access tokens, SMTP credentials, secret keys, or service_role keys. The config.js publishable key is the only browser key. Do not use a secret key to make an authorization error disappear.
