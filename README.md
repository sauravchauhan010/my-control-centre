# Rayna Admin Platform

Internal admin tool that reads/writes directly to Google Sheets — no separate
database. Each workflow (Agent Information, Email Change Requests, etc.) is
a "module": one Sheet tab + one page + one API route, all sharing the same
sidebar shell and Table/Form components.

Live module: **Agent Information List** (`/agents`)

## Local setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy the env template and fill in your service account credentials:
   ```
   cp .env.local.example .env.local
   ```
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` come from the
     JSON key file you downloaded when creating the service account.
   - Make sure that service account email has **Editor** access on the
     Google Sheet (Share → paste the email → Editor).
   - `ADMIN_PASSWORD` — the password you'll use to log in as admin.
   - `SESSION_SECRET` — a long random string used to sign login sessions
     (not something you type in — generate one with `openssl rand -hex 32`
     or any random string generator).

3. Run it:
   ```
   npm run dev
   ```
   Visit http://localhost:3000

## Deploying to Vercel

1. Push this project to a GitHub repo (private repo recommended — this is
   internal tooling).
2. Import the repo in Vercel.
3. In Vercel → Project Settings → Environment Variables, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste it exactly as in your local `.env.local`,
     including the `\n` sequences)
4. Deploy.

**Never commit `.env.local` or the service account JSON key file.**
`.gitignore` already excludes `.env*.local`.

## Adding the next module (e.g. Email Change Requests)

This is the repeatable pattern for every future tab:

1. Add a Google Sheet tab for it (or two, like Pending/Done).
2. Add an entry to `lib/modules.js` describing its columns.
3. Add an API route in `pages/api/` (copy `agents.js` as a starting point —
   swap the module key and adjust for any tab-specific logic, e.g. Email
   Change needs a "mark done" action that moves the row between tabs).
4. Add a page in `pages/` (copy `agents.js` — swap the module import).
5. Flip that module's `href` in `components/Shell.js` from `null` to its
   route so it lights up in the sidebar.

The Table and RecordModal components are generic — they render whatever
columns the module config defines, so most new modules need little more
than the config + API route.

## Access model

- **Viewing (GET requests)** is public — anyone with the URL can see the
  Agent Information table, no login needed. This is intentional: your
  sales team can view without an account.
- **Adding, editing, and deleting** requires an admin session. Log in at
  `/login` with `ADMIN_PASSWORD`. Without a session, the Add/Edit/Delete
  buttons don't render, and the API itself also rejects those requests
  (so it's not just a hidden button — the server enforces it too).
- The session is a signed cookie, valid for 7 days, with no external
  auth service involved. If you ever need to force everyone out, just
  change `ADMIN_PASSWORD` and redeploy — old sessions still work until
  they expire, but no one can log in again with the old password.
- To make a **future module admin-only** (not publicly viewable at all),
  add the same `isAuthenticated(req)` check to its GET handler too,
  not just POST/PUT/DELETE.

## Notes

- "No." in Agent Information auto-increments based on the current max
  value in the sheet — don't reuse or manually renumber rows, or the
  next add could collide.
- "Assigned Person" options are currently a placeholder list in
  `lib/modules.js` — update the `options` array with your real sales
  team names.
