# Vidyarthi Voice

An open board for campus issues at IIM Calcutta. Students raise issues, support the ones they share, and track how the tagged council post, rep or club responds. Only @email.iimcal.ac.in accounts can sign in or read.

Without Supabase keys the app runs in **demo mode** with sample data (sign in with any IIMC address, code `123456`).

## What is inside

| Path | What it is |
|---|---|
| `src/pages/` | Home, Board, Issue, Raise, Login, Scorecard, My activity, Responder console, How it works |
| `src/lib/directory.json` | **Single source** for all taggable bodies, topics and locations |
| `src/lib/demoApi.ts` | In-browser demo backend |
| `src/lib/supabaseApi.ts` | Live backend |
| `supabase/schema.sql` | Tables, security rules, views and write functions |
| `supabase/seed.sql` | Bodies list plus 4 starter issues (generated) |

Security, enforced in the database (tested):
- Sign-up from any other email domain is rejected.
- Signed-out visitors and outsiders get no data.
- Who raised or supported an issue is never returned to anyone.
- Only verified responders for the tagged body (or moderators) can post status updates.
- Limits: 5 issues and 30 comments per person per day. Five reports hide an issue until a moderator reviews it.

## Go live in about 30 minutes

### 1. Database (Supabase, free tier)
1. Create a project at supabase.com. Pick the Mumbai region.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`, then `supabase/seed.sql`.
3. **Authentication > Providers > Email**: keep Email on. Turn off "Confirm email" (the code itself confirms it).
4. **Authentication > Email Templates > Magic Link**: replace the body with
   `Your Vidyarthi Voice code is {{ .Token }}`
   This makes Supabase send a 6-digit code instead of a link.
5. **Authentication > SMTP**: add a custom SMTP sender (Resend or Brevo both have free plans). Supabase's built-in sender has a very low hourly limit and will fail on launch day.
6. Add yourself as a moderator, and add responders (SQL Editor):
   ```sql
   insert into moderators (email) values ('yourname@email.iimcal.ac.in');
   insert into body_members (body_id, email) values
     ('sports-council', 'sportsrep@email.iimcal.ac.in'),
     ('gym-rep', 'gymrep@email.iimcal.ac.in');
   ```
   Body ids are in `src/lib/directory.json`.

### 2. Website (Vercel, free)
1. Push this folder to a private GitHub repo.
2. On vercel.com, import the repo. Build command `npm run build`, output folder `dist`.
3. Add environment variables from Supabase > Project Settings > API:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ALLOWED_DOMAIN=email.iimcal.ac.in`.
4. Deploy. Put the Vercel URL in Supabase > Authentication > URL Configuration > Site URL.

### Run locally
```bash
npm install
cp .env.example .env   # leave empty for demo mode
npm run dev
```
`npm run build:demo` makes a single self-contained `dist-demo/index.html`.

## Editing the bodies list
Edit `src/lib/directory.json`, then run `npm run seed:sql` and rerun `supabase/seed.sql`.
Check before launch: hostel names (NH / OH / WH), whether a Gym Rep post exists, and the role emails.

## Launch checklist
- [ ] Election Commission says the site is fine during campaign season.
- [ ] Bodies list confirmed for this year.
- [ ] At least 2 bodies (e.g. Sports Council, Mess Reps) have verified responders who agreed to reply.
- [ ] Custom SMTP working: send yourself a code.
- [ ] Seed issues visible after sign-in.
- [ ] Rules page reviewed by a senior or the Student Affairs office.
