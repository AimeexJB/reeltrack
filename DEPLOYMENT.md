# Deploying Reeltrack to `www.aimeeredmond.com/reeltracker`

Reeltrack runs on Cloudflare as a single **Worker with static assets**, and **routes** send it only `/reeltracker*` on `www.aimeeredmond.com` (and on the bare `aimeeredmond.com`, which redirects to `www`). Your portfolio keeps serving the rest of the domain, unchanged, and nothing in the portfolio repo needs to change.

```
www.aimeeredmond.com/reeltracker*  ──▶ Reeltrack Worker (worker/index.ts)
                                     ├─ /reeltracker/api/tmdb/…  → TMDB, with the secret TMDB_TOKEN added server-side
                                     └─ everything else          → the built app in dist/ (index.html for app routes)
aimeeredmond.com/<anything else> ─▶ the portfolio, as before
```

Once it's connected, **every push to `main` redeploys automatically.**

---

## One-time setup (about 15 minutes)

### 1. Connect the repo
In the **Cloudflare dashboard**, go to **Workers & Pages → Create → Import a repository** and choose `AimeexJB/reeltrack`.

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy` (the default)

The project name, route and asset settings come from [`wrangler.jsonc`](wrangler.jsonc).

### 2. Build variables
These are used **while the app is built**, so they go under **Worker → Settings → Build → Build variables and secrets**.

⚠️ This is a different place from the runtime **Settings → Variables and Secrets** used in step 3. Variables put there are not available during the build.

Add:

| Name | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `BASE_PATH` | `/reeltracker/` |
| `VITE_SUPABASE_URL` | same as your local `.env` |
| `VITE_SUPABASE_KEY` | same as your local `.env` (the **publishable** key) |
| `VITE_TMDB_PROXY` | `true` |
| `VITE_ALLOW_SIGNUPS` | `false` |

⚠️ **Don't** add `VITE_TMDB_TOKEN` here. Anything starting with `VITE_` ends up in the browser.

### 3. Runtime secret
This is used by the Worker. Go to **Worker → Settings → Variables and Secrets → Add**:

- **Type:** Secret
- **Name:** `TMDB_TOKEN`
- **Value:** your TMDB token (the same one as `VITE_TMDB_TOKEN` in `.env`)

### 4. Deploy
Trigger a deploy, or push to `main`. Then open **https://www.aimeeredmond.com/reeltracker**.

### 5. Supabase
1. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://www.aimeeredmond.com/reeltracker`
   - **Redirect URLs:** add `https://www.aimeeredmond.com/reeltracker/**`, and keep `http://localhost:5174/**` for local development.
2. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". Your existing account keeps working.

### 6. Optional: only let your friends in
Go to **Cloudflare Zero Trust → Access → Applications → Add → Self-hosted**:

- **Domain:** `aimeeredmond.com`
- **Path:** `reeltracker`
- **Policy:** allow your friends' email addresses

It's free for up to 50 users. Anyone else can't even load the page.

---

## Adding a friend
1. Turn sign-ups back on in Supabase, and set `VITE_ALLOW_SIGNUPS=true` in Cloudflare.
2. Redeploy.
3. Have your friend create their account.
4. Switch both back.

## Running it locally like production
```bash
# .dev.vars (git-ignored) must contain:  TMDB_TOKEN=<your token>
BASE_PATH=/reeltracker/ VITE_TMDB_PROXY=true VITE_ALLOW_SIGNUPS=false VITE_TMDB_TOKEN= npm run build
npx wrangler dev        # → http://localhost:8787/reeltracker/
```

Normal development is unchanged: `npm run dev` at http://localhost:5174/.

## Troubleshooting
- **The page shows your portfolio's 404 instead of Reeltrack.** The routes aren't attached. Check **Worker → Settings → Domains & Routes** for `www.aimeeredmond.com/reeltracker*` and `aimeeredmond.com/reeltracker*`, and make sure both DNS records are **Proxied** (orange cloud).
- **Blank page, or the app's files return your portfolio.** The build didn't get `BASE_PATH=/reeltracker/`. Check that the step 2 variables are under **Build** variables, then retry the deployment.
- **"TMDB rejected the token. Check the TMDB_TOKEN secret".** The secret is missing or wrong (step 3).
- **Login doesn't work.** Check the Supabase URL settings (step 5) and the `VITE_SUPABASE_*` build variables, then redeploy.
- **Plex.** Use **Sign in with Plex**. On the secure site, browsers block plain `http://` server addresses.
- **Logs:** go to **Worker → Observability**.
