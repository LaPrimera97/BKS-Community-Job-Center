# BKS Community Job Center

Bilingual (English/Sepedi) digital recruitment and SLP compliance platform, built to connect host communities living next to mines with employment at those mines — aligned with Social Labour Plan (SLP) obligations under South African mining law.

Live site: https://bkscommunityjobcenter.com

**Status:** Built and deployed, not yet operationally piloted. It is a working, capable system — it has not yet processed a real job allocation on behalf of a mine or tribal office.

## Concepts implemented (FlyRank capstone)

| # | Concept | Where it lives |
|---|---------|-----------------|
| 1 | API endpoints | `netlify/functions/*.js` — 13 endpoints with real status codes (400/401/409/500) and input validation |
| 2 | Database | Supabase (PostgreSQL) — 5 tables: `users`, `jobs`, `applications`, `application_events`, `contact_messages` |
| 3 | Authentication | `netlify/functions/sign-in.js`, `sign-up.js`, `admin-login.js` + `lib/adminAuth.js` (HMAC-signed admin tokens); admin routes require a valid Bearer token |
| 4 | Containerized stack *(swap)* | `Dockerfile` + `docker-compose.yml` + `server.js` — the whole app starts with `docker compose up` |
| 5 | Deployment *(swap)* | Live on Netlify at bkscommunityjobcenter.com with a custom domain and auto-deploy from `main` |

**Swap reasons:**
- Web scraping pipeline → Containerized stack: the platform doesn't consume external data, so a scraper had no real role here. Docker made the whole system reproducible on any machine, which the original Netlify-only setup didn't guarantee.
- Deployment was included as a swap because this was built to be a real tool for a real community, not a class exercise, so shipping it live was part of the point from the start.

## Run it locally

Requires Docker.

1. Copy the example env file and fill in real values:
```bash
   cp .env.example .env
```
   Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, and `TOKEN_SECRET` (a random string of at least 32 characters) in `.env`. Run `supabase-migration.sql` once in the Supabase SQL editor.

2. Start the app:
```bash
   docker compose up --build
```

3. Open http://localhost:8888

Any time you edit a function or the server code, rebuild with `docker compose up --build` (not `restart` — the container doesn't live-mount the source).

## Demo path (5 minutes)

1. Open `/portal.html` → browse open jobs on the homepage
2. Click a job → Apply → fill in the form, upload a CV and ID (PDF or image, max 5MB each) → submit
3. Sign up for an account with the same email used on the application
4. Go to `/tracker.html`, sign in → see the application status and event history
5. Open `/admin.html`, log in with the admin password → see the submitted application on the dashboard, change its status

## Project structure

- `index.html`, `portal.html`, `tracker.html`, `admin.html`, `privacy.html` — frontend pages
- `netlify/functions/` — API endpoints (Netlify Functions format: `exports.handler(event, context)`)
- `netlify/functions/lib/` — shared helpers (Supabase client, password hashing, admin token auth, Haversine distance)
- `server.js` — Docker/local-dev adapter that mounts the same function handlers under Express, unmodified
- `netlify.toml` — production routing config (`/api/*` → Netlify Functions)

## Future ideas

- A real pilot: run this alongside an existing paper-draw process for one job allocation, low-stakes, to generate real evidence
- Rate limiting on public-facing endpoints (sign-up, submit-application)
- Automated test suite for the scary cases (duplicate applications, invalid ID numbers, oversized uploads)
