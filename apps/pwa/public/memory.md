# Lakisha Memory — Learn With Me (audit-kickbox-audio working set)

Project-local memory file for the Lakisha Voice OS PWA. Lines starting with
`- [YYYY-MM-DD]` are "learned aspects" surfaced as cards by the
`<LearnWithMe />` curator (apps/pwa/src/components/LearnWithMe.tsx).
DELETE-via-component currently strips locally only; the server-side
`/api/memory/delete` route is gated for a future change.

This file is **stub-seeded** and contains only entries grounded in real repo
artifacts (see `apps/pwa/src/hooks/useClevelandWeather.ts`). Add new entries by
appending; do not fabricate personal backstory not backed by source-of-truth
documents (`blueprint.md`, `design.md`, `verification.md`, `AGENTS.md`).
A copy of this file lives at `apps/pwa/public/memory.md` so the Next.js
public-dir path serves it; keep them in sync.

