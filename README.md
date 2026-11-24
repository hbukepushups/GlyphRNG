# Glyph Online — deployable multiplayer beta source

A static frontend for GitHub Pages plus Supabase Auth, Postgres RPC, and Storage. No Node backend or private keys in the browser. This is a source-code beta, not a hosted service or a certified production release. You must configure your project, run the migration, and test it before inviting players.

## What you are getting

- Email OTP verification, followed by a username/password; password login thereafter, and email-verified password reset.
- Server-generated rolls and database-enforced cooldowns, ownership, valuation, crafting, escrow, atomic trades, and leaderboard.
- Exact original tiers; historical/Greek Mythics; upper/lowercase; exclusive finishes; small accent chances; Delta/Sigma/Omega Interface forms.
- A market for HAVE listings and WANT requests. Offers contain 1–8 items. Wanted-post owners choose 1–8 payment items at acceptance. No currency or real-money payments.
- Booster recipes, multiplicative stacking, luck/speed caps, and an automatically consumed 2× luck bonus after every tenth roll.
- Account avatar upload, letter statistics with permanent roll provenance, discovery catalog, auto-roll stop filters.
- Canvas-based six-second rare reveals. Pi has circles; Sigma has equations; Interface forms use mechanical palettes, particles, gears, equation flashes, and factory motifs. Other letters use deterministic, letter-specific polygon geometry and scripts. These are procedural scenes, not individually hand-animated cinematic assets.

## 1. Create Supabase

Create a fresh Supabase project. Save its project URL and **publishable key** (or legacy anon key). Do not use a secret or service_role key in any client file or repository.

Supabase already includes Postgres. Neon is NOT required for this implementation. Do not paste the migration into Neon: it depends on Supabase's auth.users, auth.uid(), storage schema, and authenticated/anon roles. A separate Neon database would need a different trusted API, JWT verification, and new migrations; it is not a drop-in switch. See ARCHITECTURE.md.

## 2. Install the database

Open Supabase → SQL Editor. Paste `supabase/migrations/001_game.sql` and run it once on a fresh project. The migration is intentionally not rerunnable; keep migrations in source control and add future migrations instead of rerunning this one. It creates 10 game tables, an avatar bucket and policies, and the authenticated `glyph_api` RPC.

Tables have RLS and no browser table grants/policies. Reads and writes use the narrow authenticated RPC. Account identity comes from auth.uid(), not a supplied player ID. Only verified users can call game actions. Game tables contain no email or password fields.

## 3. Configure email (important)

Enable Email as an Auth provider. Keep email confirmation on; do not enable anonymous sign-ins for this game.

Under Authentication → Email Templates, change the **Magic Link** template to display an OTP instead of a link. For example:

```html
<h2>Your Glyph verification code</h2>
<p>Enter this code in the game:</p>
<p style="font-size:32px;letter-spacing:6px">{{ .Token }}</p>
<p>If you did not request this, you can ignore the message.</p>
```

Also put `{{ .Token }}` in the Confirm Signup template if your project uses it for initial passwordless signup. Do not send only `{{ .ConfirmationURL }}`: this UI expects a code. Supabase controls code expiry, token validation, password hashing, sessions, and rate limits.

Configure **custom SMTP** for general public signups. The built-in test mailer is not a public production email service and has address restrictions and very low limits. Use an SMTP provider you control; configure its sender/domain records and verify delivery to a non-team email address. Costs and quotas depend on your providers.

Set Auth → URL Configuration → Site URL to your final GitHub Pages URL, including the repository path if applicable. Add that URL to allowed redirects for future link-based flows (this version uses typed codes).

Set the project password minimum to at least 10 characters; the frontend requests 10–72 characters. Do not apply username censorship to passwords. Configure appropriate Auth rate limits. CAPTCHA/anti-bot integration is not included in this beta; add it before a broad public launch.

## 4. Configure the frontend

Edit `config.js`:

```js
window.GLYPH_CONFIG = {
  supabaseUrl: "https://your-project.supabase.co",
  supabasePublishableKey: "your-public-publishable-key"
};
```

These two values are public by design. Nothing else is needed in this frontend. The Supabase browser SDK loads from jsDelivr; production teams should pin and vendor an audited exact SDK version rather than relying on the v2 major tag.

## 5. Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the CONTENTS of this folder into the repository root (index.html should be at the root, not one folder deeper).
3. Include config.js, app.js, style.css, index.html, and .nojekyll. SQL/docs/tests can also remain in the repo; they contain no credentials.
4. In repository Settings → Pages, choose Deploy from a branch; choose your main branch and `/ (root)`.
5. Open the published Pages URL after deployment completes. No build command is required.
6. Return to Supabase and check the Site URL setting against the actual published address.

For a local preview, run `python -m http.server 8000` in this folder and open localhost:8000. Do not rely on opening index.html via file:// for authenticated browser testing.

## 6. First-account walkthrough

1. Enter your email and click Create account. You can choose your password after verification.
2. Enter the emailed code and click Verify code.
3. Choose a username and enter a 10–72-character password in the password box; click Finish account.
4. Roll. Create a second account in a separate browser profile to test trading.
5. Sign out and test password login. Test Forgot password using another emailed verification code.

Emails remain in Supabase Auth. Passwords are never put in the game tables. Avatar images are public and keyed by account UUID. Avatar uploader decodes/crops/re-encodes raster images as WebP; SVG is not allowed. Uploaded images still need human moderation for a real public community.

## Game probabilities and values

Base tier probabilities: Common 50%, Uncommon 27%, Rare 14%, Epic 6%, Legendary 2.7%, Mythic 0.3%. Letters within a tier are uniform. Cases: lowercase .75; uppercase .25. Finishes: normal .975, silver .02, gold .004, platinum .001. Exactly one finish, independent of case.

For eligible Latin letters, accents are exclusive: none .989, basic .01 (one in 100), rare .001 (one in 1,000). These are category odds. A character within a category is chosen uniformly. Accents work with both cases and any finish. See glyph_letters for the precise pool. Mythics have no accents.

Delta, Sigma, and Omega independently roll Interface at .0001 (one in 10,000) conditional on that base. Normal is .9999. Interface stacks with case and finish. Its extreme rarity is intentional but configurable in the roll function. No Interface booster recipe is intended to be an early-game goal.

An item's reference probability P multiplies the tier, within-tier letter, case, specific accent or no-accent, finish or no-finish, and Interface or no-Interface probabilities at **1× luck**. Its value is **1 / P / 100**, stored as Postgres numeric without rounding. Only the display is rounded. A hypothetical exact 1/14 result is worth 0.14.

The roll also stores actual_probability and roll_luck. Boosters do NOT inflate or deflate reference value: the same variant always has the same reference value under this rules version. This is mathematical supply guidance, not an assurance of a balanced market. Extremely rare item values can dominate the leaderboard; adjust your economy after playtesting. Changing odds later requires a versioned economy migration if existing values should be preserved/rebalanced.

### Luck and speed

Let L be the effective luck multiplier, capped at 8 including the tenth-roll bonus. Reweight Rare/Epic/Legendary/Mythic by L; leave Common/Uncommon weights alone; normalize by `77 + 23L`. Cases, finishes, accents and Interface odds do not change. Thus '2× luck' means twice the WEIGHT of upper tiers, not twice their final probability.

Each booster effect lasts for a number of successful rolls, not wall-clock minutes, and starts immediately when crafted. All active effects multiply. The cooldown factor is clamped to .2, for a minimum one-second server cooldown. At most 12 active boosters. Every roll decrements all active booster counters. Rolls 10, 20, 30... queue one bonus for the next roll; there is no bonus bank. A crafted booster and that bonus can stack up to the cap.

Beginner recipes need Rare/Epic letters. Every later recipe consistently requires Mythic items, finishes, and accents; the final recipe also requires Interface. Ingredients are distinct item instances, one selected per recipe slot. Crafting burns their inventory value but never erases roll history. Listed or offered items cannot be crafted.

### Auto-roll and cutscenes

Auto-roll always stops on a newly rolled BASE letter, and optionally on selected base letters or tiers. The 'stop on new' control is deliberately locked on. Discovery means personally rolled, not received in a trade. Catalog variant unlocks also require personally rolling that exact variant; uppercase base forms are not hidden.

Cutscenes trigger for exact reference rarity above 1,000, except Common/Uncommon results with accents or finishes, as requested. Cutscenes may make auto-roll slower than the server cooldown, and auto-roll waits for them. Toggle them off or Skip. Reduced-motion users default to no roll animation and no cutscenes; effects contain pulses but not rapid strobing. Interface Sigma has occasional red equation overlays. No sound assets are included.

The old Ctrl+0 cooldown bypass is intentionally not supported online: it would break the economy. Server clock and server RNG determine grants. Reloading, multiple tabs, changing JavaScript, or directly calling the API do not bypass the database cooldown. Compromised admin credentials, bot farms, and stolen accounts are separate threats.

## Moderation

The strict ASCII username rule is `^[A-Za-z0-9_/-]{3,20}$`. Username comparison is case-insensitive. The server lowercases, maps several leetspeak digits, removes punctuation, then checks an editable substring blocklist. Hell, damn, shit and ass are not explicitly blocked, matching the requested exception. Other terms may still cause coincidental substring matches.

No blocklist can catch every slur, language, obfuscation, or context. This is a starter list, not a complete moderation system. Maintain glyph_blocked_terms, add moderation tools/reports/appeals, and test false positives before launch. Posts have no free-text field to reduce moderation surface. No chat is included. The list is visible to repository readers, not retrievable through the client RPC.

## Before inviting the public

Read TESTING.md and SECURITY.md. Run the Node model checks with `node tests/model.test.cjs`. These checks verify static invariants and a probability MODEL, not live database correctness.

This package was syntax-checked locally for JavaScript and model-tested. It has not been deployed into your Supabase project, migration-tested against a live Postgres server, emailed real OTPs, or browser end-to-end tested. SQL and RLS need an integration review in a staging project. Do not treat the package as audited production software.

Scaling limits: global transaction lock serializes game RPCs; bootstrap loads the entire inventory; there is one item row and one provenance row per roll; leaderboard sums inventory. Suitable as a conservative beta design, not a claim of large-scale capacity. Add pagination, aggregation, scheduled retention, observability, and ordered row-level concurrency before scaling. Policies and limits need review under actual load.

## Source documentation

- Supabase OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Database functions: https://supabase.com/docs/guides/database/functions
- API key safety: https://supabase.com/docs/guides/getting-started/api-keys
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
