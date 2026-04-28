# RSVP Quiz App

## What This Is
Mobile-optimized quiz web app for RSVP Baha Mar conference. Attendees scan QR, fill capture form, answer 20 yes/no questions, get personalized email results. Presenters see live dashboard.

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks)
- Netlify Functions (.mjs, ES modules)
- Supabase (PostgreSQL, single `responses` table)
- Resend (transactional email)
- Anthropic Claude API (dashboard AI insights)

## Project Structure
- `index.html` — capture form (name, email, phone, industry)
- `quiz.html` — 20 questions, one at a time, yes/no
- `complete.html` — thank you page
- `dashboard.html` — presenter dashboard (not linked from quiz flow)
- `styles.css` — shared design system
- `netlify/functions/submit.mjs` — save response + send email
- `netlify/functions/results.mjs` — aggregated data for dashboard
- `netlify/functions/insights.mjs` — AI narrative observations
- `netlify/functions/lib/questions.mjs` — single source of truth for questions
- `netlify/functions/lib/aggregate.mjs` — shared aggregation logic
- `netlify/functions/lib/supabase.mjs` — shared Supabase client

## Key Conventions
- Questions prefixed `a1-a10` (Alain's) and `t1-t10` (Travis's)
- Answers stored as JSONB: `{"a1": "yes", "a2": "no", ...}`
- Frontend never touches Supabase directly — all through Netlify Functions
- Email is fire-and-forget (Supabase insert is critical path)
- t2 recommendation triggers on "Yes" (not "No") — it's the only inverted question

## Environment Variables (Netlify dashboard only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`

## Branding
- Logo placeholders need real assets before deploy (see styles.css checklist)
- `--alain-accent: #888888` needs Alain's real brand color
