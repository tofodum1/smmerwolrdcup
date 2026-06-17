# Summer World Cup — Registration App

A standalone registration site where players submit their info and pick a
country. Payment happens separately (you handle it directly with players),
and you manually mark registrations as paid from a private admin dashboard.

---

## What you need (all free tier)

- **Supabase** — the database
- **Resend** (optional) — lets you send a one-click confirmation/payment-info
  email from the admin dashboard. The site works fine without it; you'd just
  message people yourself instead.
- **GitHub** — holds the code
- **Vercel** — hosts the live site and runs the small admin backend

---

## Step 1 — Database (Supabase)

1. In your Supabase project, open **SQL Editor → New query**.
2. Copy all of `supabase-schema.sql` from this folder, paste it in, click
   **Run**. This creates the `registrations` table.
   - If you already have an older `registrations` table from a previous
     version of this app, use the migration block near the bottom of that
     file instead (uncomment and run it).
3. From **Project Settings → API**, note down:
   - **Project URL**
   - **anon public** key (already used in `src/supabaseClient.js` — safe for
     the browser)
   - **service_role** key (⚠️ secret — only goes into Vercel's environment
     variables, never into any frontend file)

---

## Step 2 — Resend (optional, for the "Send Email" button)

1. In your Resend dashboard, go to **API Keys → Create API Key**. Copy it.
2. You can use the default `onboarding@resend.dev` sender — no domain
   verification needed to start.

If you skip this entirely, everything still works — the admin dashboard's
"Send Email" button will just show an error, and you can message people
yourself instead.

---

## Step 3 — Push the code to GitHub

Upload every file in this folder to your GitHub repo: `package.json`,
`vite.config.js`, `index.html`, `admin.html`, `vercel.json`,
`supabase-schema.sql`, the `src/` folder (including `Admin.jsx` and
`admin-main.jsx`), and the `api/` folder (lowercase `api`, this matters —
Vercel only recognizes serverless functions in a lowercase `api/` directory
at the project root).

---

## Step 4 — Deploy to Vercel & set environment variables

1. Import the repo into Vercel.
2. Add these **Environment Variables** before deploying:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `RESEND_API_KEY` | your Resend API key (optional) |
   | `RESEND_FROM_EMAIL` | `Summer World Cup <onboarding@resend.dev>` (optional) |
   | `ADMIN_PASSWORD` | the password you'll use to log into `/admin.html` |

3. Click **Deploy**.

---

## Step 5 — Test it

1. Open your live site, go through the solo or squad flow, and submit.
2. You should see a "Registration submitted!" confirmation immediately —
   no payment step on the site itself.
3. Go to `https://YOUR-DOMAIN.vercel.app/admin.html`, log in with your admin
   password, and confirm the new registration shows up with status
   **Awaiting Payment**.
4. Once you've collected payment from that person however you choose, click
   **Mark Paid** next to their row. Their chosen country now shows as
   "Taken" on the public registration page.
5. Click the mail icon next to their row to send a one-click confirmation
   email (if you set up Resend), or just message them yourself.

---

## The admin dashboard

Visit `/admin.html` on your site (e.g. `summercup.vercel.app/admin.html`).
It is not linked anywhere on the public registration page. Log in with
`ADMIN_PASSWORD`. From there you can:

- See every registration's contact info, country pick, and payment status
- **Mark Paid** / **Unpaid** — this is what actually locks in a country on
  the public board
- **Send Email** — fires a one-click confirmation (paid) or payment-details
  (unpaid) email via Resend
- **Delete** a single registration, or clear everything at once

## How this actually works

- The registration form writes directly to Supabase using the public
  anon key, with status `awaiting_payment`.
- A country only shows as "Taken" on the public board once a squad's status
  is flipped to `paid`. Until then, multiple people could in theory pick the
  same country — the admin dashboard shows you this overlap (a "pending"
  tag) so you can resolve it manually: whoever pays first gets it.
- All payment handling (texting someone a link, cash, Zelle, whatever you
  prefer) happens outside this app entirely. The app's only job is to
  collect info and let you track who's paid.
- Marking someone paid and sending email both require the admin password —
  the public registration page has no access to either action.
