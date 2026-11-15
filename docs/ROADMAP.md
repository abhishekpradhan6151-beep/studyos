# StudyOS — implementation roadmap and verification gates

**Audit date:** 2026-11-15. Status must describe actual evidence, not a promise.

## Decision

Retain the already working Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase (Auth/Postgres/RLS/Storage), AI SDK server routes and Git-connected Vercel. This application was built in a fresh repository, not from the old ZIP. A destructive restart would discard tested functionality. New phases will be isolated in reviewable GitHub branches.

## Twelve phases

| Phase | Implemented functionality | Verification evidence and outstanding gates | Status |
|---|---|---|---|
| 1. Architecture/foundation | Typed Next.js project, Supabase clients, schema, migrations, CI | Green install/lint/typecheck/build; migration filenames now match hosted history | Verified in CI; migration alignment under PR review |
| 2. Design system | Responsive navigation, glass surfaces, theme support, empty/error/loading states | iPad/mobile/desktop E2E; detailed visual/VoiceOver review remains | Implemented; partly verified |
| 3. Auth and security | Signup, login, recovery, protected routes, private storage, 14 RLS tables | CI browser flow and disposable DB validation pass; hosted emails/redirects still to test | Implemented; partly verified |
| 4. Onboarding/dashboard | Optional profile/level/subjects/goal/target, real-data dashboard | Onboarding and empty data E2E | Verified in disposable CI |
| 5. Study planner/tasks | Subjects, daily/weekly sessions, timer, deadlines, task CRUD/filter/sort | E2E persistence across reload and timezone tests | Verified in disposable CI |
| 6. Notes | Markdown editor/preview, folders, search, pin, CRUD | Browser E2E; no unsafe raw HTML | Verified in disposable CI |
| 7. Goals/habits | Academic/personal goals, habit tracking, streak/history | E2E plus unit date/boundary checks | Verified in disposable CI |
| 8. AI assistant | Server-only model, conversations, selected docs/PDF, quizzes, quotas | **No verified live response**; a historic /api/assistant call returned provider HTTP 403 | Implemented, external service blocked |
| 9. Analytics | Study intervals, task, habit, goal analytics | Computed metrics unit tests and browser fixture checks | Verified in fixtures; live observation pending |
| 10. Settings | Profile, timezone, target, theme persistence, data export | Browser E2E validates saving, export and light/dark preference | Verified in disposable CI |
| 11. Testing/security | Unit, browser, live two-account isolation script, RLS and advisors | Green main workflow at `d99e4c53`; accessibility/security expansion ongoing | Ongoing |
| 12. Deployment | GitHub + Vercel production build, Supabase connection | Vercel READY; production email delivery and live AI provider checks remain | Deployed, acceptance incomplete |

## Immediate milestone — foundation reliability & iPad setup

- Align SQL filenames with Supabase's **recorded** migration version IDs; do not re-run SQL or change hosted rows.
- Provide a standalone web app manifest for iPad Add to Home Screen, using the existing brand icon. Offline capability is **not** offered.
- Verify the new manifest in Playwright and rerun lint, typecheck, unit, build and desktop/tablet/mobile browser checks in GitHub Actions.
- Improve release-gate documentation to distinguish CI tests from live integrations.

## Next milestone — live integrations

- **AI:** Vercel `AI_GATEWAY_MODEL` environment variable exists, but successful model inference has not been demonstrated. Check project/team AI Gateway access and credits. A prior gateway request failed with HTTP 403. Test a real authenticated academic question, document summary and quiz before marking the AI phase verified.
- **Auth:** Confirm Supabase Auth Site URL, redirect allowlist and real signup/recovery emails on the public domain. An advisor flags disabled leaked-password protection; review the official setting at https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- **Operations:** Set required checks/protect `main` when repository permissions allow, and maintain safe preview-before-production reviews.
- **Visual & accessibility:** Inspect the glass system on a real iPad, run VoiceOver and focus/contrast testing, and improve the weakest views without sacrificing functional reliability.

## Release acceptance

Every public-facing operation must persist or report an actionable error; never show fake study records, analytics or AI output. No browser-exposed privileged keys. Automated checks do not replace a successful live AI inference or real email delivery.
