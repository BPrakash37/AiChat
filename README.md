# ChatSpace — Real-Time Chat App

A production-ready real-time chat application built with **React + Vite + Tailwind CSS + Supabase**.

> ✅ **No CLI required.** Everything is done through the Supabase and Vercel dashboards.

---

## ✨ Features

- Username/password login (no email required)
- Admin approval for new registrations
- Direct messages + private group rooms
- Real-time messaging, online/offline presence, last seen
- Typing indicator, read receipts, unread counts
- Image uploads (file picker, Ctrl+V paste, drag & drop)
- Infinite scroll message history + in-room message search
- Browser push notifications
- 7-day auto-cleanup (messages, images, notifications — rooms are never deleted)
- Full admin panel: approve/reject/suspend users, view rooms, audit logs
- RLS-enforced security — users can only see their own data

---

## 📁 Folder Structure

```
chatapp/
├── public/favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/         # LoginPage, RegisterPage, ProtectedRoute
│   │   ├── chat/         # Sidebar, ChatWindow, MessageBubble, all modals
│   │   └── shared/       # Avatar, Modal
│   ├── hooks/            # usePresence, useTyping, useRealtimeMessages, etc.
│   ├── lib/              # supabase.js, constants.js, utils.js
│   ├── pages/            # ChatPage, AdminPage
│   ├── store/            # authStore.js, chatStore.js (Zustand)
│   ├── styles/           # globals.css (Tailwind)
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── functions/
│   │   └── cleanup/       # 7-day data cleanup Edge Function
│   └── migrations/
│       ├── 001_schema.sql # Full DB schema + RLS + storage bucket
│       └── 002_cron.sql   # Daily cleanup schedule
├── .env.example
├── vercel.json
└── README.md
```

---

## 🚀 Complete Setup Guide (No CLI Needed)

Follow these 7 steps in order.

---

### STEP 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**.
3. Fill in a name (e.g. `chatspace`), a strong database password, and pick the region closest to you.
4. Click **Create new project** and wait about 2 minutes.

**Save these values — you'll need them in later steps:**

5. In the left sidebar go to **Settings → API**.
6. Copy and save:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — long string starting with `eyJ...`
   - **service_role key** — also starts with `eyJ...` — keep this secret, never put it in frontend code

---

### STEP 2 — Run the Database Schema

This creates all tables, security rules, and the image storage bucket in one go.

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/migrations/001_schema.sql` from this project in any text editor.
4. Select all (`Ctrl+A`), copy, and paste it into the Supabase SQL Editor.
5. Click the green **Run** button (or `Ctrl+Enter`).
6. You should see: `Success. No rows returned.`

> ⚠️ If you get an error mentioning `pg_cron`, that's fine — comment out the line `CREATE EXTENSION IF NOT EXISTS "pg_cron";` at the top and run again. That extension is handled separately in Step 6.

---

### STEP 3 — Deploy the Cleanup Edge Function

This function deletes messages, images, and notifications older than 7 days. Rooms are **never** deleted.

**Create the function:**

1. In Supabase, click **Edge Functions** in the left sidebar.
2. Click **New function**.
3. Name it exactly: `cleanup`
4. Delete all the placeholder code in the editor.
5. Open `supabase/functions/cleanup/index.ts` from this project.
6. Copy the entire contents and paste it into the editor.
7. Click **Deploy**.

**Set the function secret:**

8. Go to **Settings → Edge Functions** (or click the three-dot menu on the function → **Manage secrets**).
9. Click **Add secret** and add:

   | Key | Value |
   |-----|-------|
   | `CRON_SECRET` | Make up any password, e.g. `mycleanup2024` — write it down, you need it in Step 6 |

   > `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected — you don't add those manually.

---

### STEP 4 — Configure Your Local .env File

1. In the project folder, duplicate `.env.example` and rename the copy to `.env`.
2. Open `.env` and fill in your values from Step 1:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key-here...
```

Do **not** put the `service_role` key here — it's only for server-side functions.

---

### STEP 5 — Run the App Locally

Open a terminal in the project folder:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**Create the Super Admin account first:**

1. Click **Request access** (or go to `/register`).
2. Enter username: `prakash374` — must be exact.
3. Enter any password (at least 8 characters).
4. Click **Submit request**.
5. This account skips the approval queue and gets admin rights automatically.
6. Go to `/login` and sign in.
7. You'll see a 🛡️ shield icon in the sidebar — that's the Admin Panel.

---

### STEP 6 — Set Up Automatic 7-Day Cleanup

This schedules the cleanup function to run every night at 2 AM UTC.

**First, enable the pg_cron extension:**

1. In Supabase, go to **Database → Extensions**.
2. Search for `pg_cron` and click **Enable**.

**Then schedule the job:**

3. Go to **SQL Editor → New query**.
4. Open `supabase/migrations/002_cron.sql` from this project.
5. Make these two replacements before pasting:
   - Replace `<YOUR_PROJECT_REF>` with your project ref — it's the part of your Supabase URL between `https://` and `.supabase.co` (e.g. `abcdefghijklmnop`)
   - Replace `<YOUR_CRON_SECRET>` with the `CRON_SECRET` value you set in Step 3
6. Paste the edited SQL and click **Run**.

**Verify it worked:**

7. Run this in a new SQL query:
```sql
SELECT jobname, schedule, active FROM cron.job;
```
You should see a row for `daily-chat-cleanup`.

> 💡 **To test cleanup manually:** In Supabase → Edge Functions → `cleanup` → click **Invoke**. Add header `Authorization: Bearer YOUR_CRON_SECRET`. The response should show `"success": true`.

---

### STEP 7 — Deploy to Vercel

1. Push this project to a GitHub repository:
   - Go to [github.com](https://github.com) → **New repository** → follow the instructions to push.

2. Go to [vercel.com](https://vercel.com) → sign up / log in with GitHub.

3. Click **Add New Project** → **Import Git Repository** → select your repo.

4. Before clicking Deploy, expand **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Leave all build settings as default — Vercel auto-detects Vite.

6. Click **Deploy**. Your live URL will be something like `https://chatspace-xyz.vercel.app` 🎉

**One last thing after deploying:**

7. In Supabase → **Authentication → URL Configuration**, add your Vercel URL to the **Redirect URLs** list (e.g. `https://chatspace-xyz.vercel.app`). This lets auth work correctly on the live site.

---

## 🔐 Security Summary

- All database tables are protected by **Row Level Security (RLS)** — users can only read/write their own data.
- Users can only find others by **exact username search** — there is no way to browse or list users.
- Every new account is locked as **pending** until `prakash374` approves it from the Admin Panel.
- The `service_role` key is only ever used inside Edge Functions — it never touches the browser.
- The cleanup cron job is protected by a secret token so only the scheduled job can trigger it.

---

## 🧹 Data Retention Policy

| Data | What happens |
|------|-------------|
| Chat messages | Auto-deleted after 7 days |
| Uploaded images | Auto-deleted after 7 days |
| Notifications | Auto-deleted after 7 days |
| Rooms | **Never deleted** |
| Room members | **Never deleted** (soft-remove only) |
| Audit logs | Kept indefinitely |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| State management | Zustand |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (WebSockets) |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Edge Functions | Deno (deployed on Supabase) |
| Routing | React Router v6 |
| Deployment | Vercel |

---

## ❓ Troubleshooting

**"Missing Supabase environment variables" on startup**
→ Check your file is named `.env` (not `.env.example`) and is in the root folder. Both keys must start with `VITE_`.

**Login says "pending approval"**
→ Sign in as `prakash374`, open the Admin Panel (shield icon), and approve the user in the Pending tab.

**Login says "suspended" or "rejected"**
→ Sign in as `prakash374`, go to Admin → Users tab, and click Restore.

**Images not uploading**
→ In Supabase → Storage, confirm the `chat-media` bucket exists and is set to **public**. The schema SQL creates it, but you can check manually.

**Realtime messages not appearing**
→ In Supabase → Database → Replication, confirm the `messages` table is listed under the `supabase_realtime` publication.

**Cron job not running**
→ Go to Supabase → Database → Extensions and make sure `pg_cron` is enabled. Then re-run `002_cron.sql`.

**Vercel shows blank page or 404 on page refresh**
→ Make sure `vercel.json` is in the root of the project — it rewrites all routes back to `index.html`.

---

## 📌 Adding Telegram Notifications Later

When you're ready to add Telegram notifications for new registrations, the Edge Function code is already written at `supabase/functions/notify-registration/index.ts`. You'll just need to:

1. Deploy it via the Supabase Edge Functions dashboard (paste the code, click Deploy).
2. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets.
3. Uncomment the `supabase.functions.invoke('notify-registration', ...)` call in `src/store/authStore.js` inside the `register` function.

