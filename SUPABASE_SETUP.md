# Setting up Supabase (cloud sync)

This turns on real accounts and syncs your library across every browser and device.
It takes about 10 minutes. You only do it once.

> You don't have to do this. Without it, Reeltrack keeps working with everything saved in your browser.

---

## 1. Create a project (2 min)

1. Sign up at [supabase.com](https://supabase.com). The free plan is plenty.
2. Click **New project**:
   - **Name:** `reeltrack`
   - **Database password:** use the generate button and save it in your password manager. You won't need it for the app, but you'll want it if you ever connect to the database directly.
   - **Region:** whichever is closest to you
3. Wait about a minute while it sets up.

## 2. Create the tables (1 min)

1. In the left sidebar, open **SQL Editor** and click **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this project, copy all of it, paste it in, and click **Run**.
3. You should see "Success. No rows returned". It's safe to run again if you're unsure.

This creates four tables (`profiles`, `library_entries`, `watch_events`, `custom_lists`). Each one has row-level security, so every user can only ever see their own data.

## 3. Connect the app (2 min)

1. Click **Connect** at the top of the dashboard, or go to **Project Settings → API Keys**.
2. Copy the **Project URL** and the **publishable key** (`sb_publishable_…`). Older projects call it the **anon** key, and that works too.
3. Add both to `reeltrack/.env` underneath your TMDB token:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_xxxxxxxx
   ```

   ⚠️ Never put the **secret** / **service_role** key in `.env`. Anything starting with `VITE_` ends up in the browser. The publishable key is designed to be public, because row-level security protects the data.

4. Stop the dev server (Ctrl+C) and run `npm run dev` again. The login page should now ask for an **email** address.

## 4. Email confirmation (optional, 1 min)

By default, Supabase emails a confirmation link to every new account. For a personal app you can turn this off:

**Authentication → Sign In / Providers → Email → turn off "Confirm email" → Save.**

If you keep it on, go to **Authentication → URL Configuration** and set **Site URL** to `http://localhost:5174`, so the link brings you back to the app.

> **Once the app is online**, set the Site URL to `https://aimeeredmond.com/reeltracker` and add `https://aimeeredmond.com/reeltracker/**` under Redirect URLs. See [DEPLOYMENT.md](DEPLOYMENT.md).

## 5. Create your account and move your data across

1. In Reeltrack, click **Log in → Create an account**.
2. Open **Import & Sync** in the sidebar. Under **Cloud sync** you'll see **"We found data from a browser-only account"**. Click **Move to cloud**.

   (This only works in the same browser you used before. As a backup, you can download a backup file before step 3 and restore it here instead.)

That's it. Log in from any other browser or device and your library will be there.

---

## 6. Plex auto-sync (optional, needs Plex Pass, about 5 min)

Plex can notify Reeltrack every time you finish a movie or episode. Plex needs a public address to send that to, and a Supabase **Edge Function** provides one.

### a) Deploy the function

1. In the dashboard open **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly **`plex-webhook`**.
3. Replace the example code with everything in [`supabase/functions/plex-webhook/index.ts`](supabase/functions/plex-webhook/index.ts), then click **Deploy**.
4. Open the function's **Details / Settings** and turn **OFF** "Verify JWT" (it may be called "Enforce JWT verification"). Plex can't log in, so it identifies you with the secret token in the URL instead. Save.

### b) Give it your TMDB token

**Edge Functions → Secrets → Add new secret**
- **Name:** `TMDB_TOKEN`
- **Value:** the same token as `VITE_TMDB_TOKEN` in your `.env`

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically, so you don't need to add them.)

### c) Connect Plex

1. In Reeltrack open **Import & Sync → Plex → Automatic sync** and click **Copy**.
2. In Plex go to **Settings (wrench icon) → Webhooks → Add Webhook**, paste the URL, and click **Save Changes**.
3. If other people use your Plex server, enter your Plex username in Reeltrack and click **Save**, so only your viewings are logged.
4. Watch something to the end. Plex counts about 90% as watched. Come back to Reeltrack and it'll be in your stats.

**Troubleshooting:** in the dashboard, **Edge Functions → plex-webhook → Logs** shows every request and why it was logged or ignored. For example: `Logged The Office S1E3`, `Ignored: different Plex user`, or `Unknown token`.

### Prefer the command line?

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>     # the xxxxxxxx in your project URL
npx supabase secrets set TMDB_TOKEN=<your tmdb token>
npx supabase functions deploy plex-webhook --no-verify-jwt
```

---

## Good to know

- **Free-plan projects pause after about a week without use.** If the app suddenly can't log in, open the Supabase dashboard and click **Restore project**.
- **Back up your data:** Import & Sync → Backup → **Download backup** works in cloud mode too.
- **To go back to browser-only mode:** remove the two `VITE_SUPABASE_` lines from `.env` and restart.
