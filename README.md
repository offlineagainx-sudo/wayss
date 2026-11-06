# WAYSS

A mobile-first social app built with Next.js, TypeScript and Supabase. This repository contains no seeded/demo accounts, posts or messages.

## Setup
1. Copy .env.example to .env.local.
2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY using the intended WAYSS Supabase project.
3. Apply supabase/migrations/001_wayss_core.sql to that project.
4. Run npm install && npm run dev.

Never expose a service_role key in browser code or commit secrets. RLS is the security boundary.

Current milestone: email/password auth, real feed reads, text posts, likes, exact-username lookup and follow requests. Media, full chat UI, Orbit/Flux, profile editor and moderation UI remain subsequent milestones; do not treat them as complete.