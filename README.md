# discord-verify

A Discord bot for gating roles by **Ethereum ethscriptions** and **Bitcoin ordinal** holdings. Runs entirely on Vercel — no persistent gateway connection, no separate worker.

## How it works

1. User runs `/verify` in your Discord server.
2. The bot DMs them an ephemeral one-time link to your Vercel app.
3. They connect their ETH wallet (any injected wallet) and BTC wallet (Unisat) and sign a nonce.
4. The server verifies the signatures (SIWE for ETH, BIP-322 for BTC), checks holdings against your configured rules, and assigns matching Discord roles.

## Verification checks supported

- **Ethscriptions collections** — checks `api.ethscriptions.com/v2` for any ethscription owned by the user that belongs to a given collection slug.
- **Ordinal inscriptions (allowlist)** — admin curates a list of inscription IDs; user passes if they currently own any one of them (looked up via Ordiscan).

## Setup

### 1. Create the Discord app

1. Go to https://discord.com/developers/applications and click **New Application**.
2. **General Information** → copy `Application ID` → `DISCORD_APP_ID`, copy `Public Key` → `DISCORD_PUBLIC_KEY`.
3. **Bot** → click **Reset Token**, copy → `DISCORD_BOT_TOKEN`. Enable **Server Members Intent** is not needed (we only assign roles via REST).
4. **OAuth2 → URL Generator** → scopes: `bot`, `applications.commands`. Bot permissions: `Manage Roles`. Open the generated URL and add the bot to your server.
5. In your server, copy your guild ID (Discord developer mode → right-click server → Copy ID) → `DISCORD_GUILD_ID`.
6. Make sure the bot's role in **Server Settings → Roles** is positioned **above** every role you want it to grant.

### 2. Get the other credentials

- **Ordiscan API key** — sign up at https://ordiscan.com/dashboard → `ORDISCAN_API_KEY`.
- **Vercel KV** — in your Vercel project → Storage → create KV. The `KV_REST_API_*` env vars are auto-injected on Vercel; for local dev, copy them from the KV dashboard into `.env.local`.
- **APP_SECRET** — `openssl rand -hex 32` → `APP_SECRET`.
- **ADMIN_PASSWORD** — pick a strong password → `ADMIN_PASSWORD`.

### 3. Deploy

```bash
npm install
vercel link
vercel env pull .env.local
# Fill in any remaining env vars in .env.local
npm run dev
```

When ready, push to GitHub and import to Vercel, or run `vercel --prod`. After deploying, set `PUBLIC_BASE_URL` to your production URL.

### 4. Register the slash command

```bash
npm run register
```

### 5. Wire up the interactions endpoint

In the Discord Developer Portal → your app → **General Information** → set **Interactions Endpoint URL** to `https://your-app.vercel.app/api/interactions`. Discord will PING it; if signature verification works, it'll save.

### 6. Configure rules

Visit `https://your-app.vercel.app/admin`, log in with `ADMIN_PASSWORD`, and add rules. Each rule needs:

- A **name** (shown to users on success)
- A **Discord role ID** (right-click the role in Discord → Copy ID)
- For ethscriptions: a **collection slug** (find it on `explorer.ethscriptions.com`)
- For ordinals: a list of **inscription IDs** (one per line; owning any one passes)

## Project layout

```
app/
  api/
    interactions/route.ts   Discord HTTP interactions (slash commands, ping)
    nonce/route.ts          Issues SIWE/BIP-322 nonces
    verify/eth/route.ts     SIWE verify + ethscriptions check + role grant
    verify/btc/route.ts     BIP-322 verify + ordinal check + role grant
    admin/login/route.ts    Admin password login
    admin/rules/route.ts    Admin rules CRUD
  verify/[token]/           Wallet sign-in page
  admin/                    Admin UI for managing rules
lib/
  auth.ts                   HMAC-signed tokens
  discord.ts                Discord REST helpers
  ethscriptions.ts          api.ethscriptions.com client
  ordiscan.ts               Ordiscan API client (BTC inscription lookups)
  kv.ts                     Vercel KV wrappers (nonces, tokens, rules)
  rules.ts                  Rule evaluation engine
  types.ts
scripts/
  register-commands.ts      One-shot slash command registration
```

## Security notes

- All signatures are verified server-side. The `verify-token` from the slash command is HMAC-signed *and* one-time-consumed via KV — replays are rejected.
- Nonces are single-use and expire in 10 minutes.
- The admin page is gated by a password; the session is an HMAC-signed httpOnly cookie. For production with multiple admins, swap this for OAuth (Discord SSO with a hard-coded user ID list is the easiest upgrade).
- The bot only ever **adds** roles. If you also want to revoke roles when users no longer hold, that's a follow-up — typically a cron that re-evaluates verified addresses on a schedule.
