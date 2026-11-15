# StudyOS architecture

## Product scope

A private student workspace with planning, tasks, notes, goals, habits, analytics and a real AI study assistant. Empty accounts show onboarding and useful empty states. User records never use sample-data fallbacks.

## Decisions

- Next.js App Router, React, TypeScript and Tailwind CSS. One repository and Vercel project host both the responsive interface and authenticated server endpoints. This avoids a separate backend deployment and works with GitHub editing/Codespaces from an iPad.
- Supabase Auth with cookie sessions and server validation. PostgreSQL is the source of truth. Every exposed user table has owner-based Row Level Security; compound foreign keys prevent cross-account relationships.
- Browser queries use an enabled publishable key and the signed-in session. Server routes validate the user and use that user's Supabase client. No service-role key is required by the application.
- AI SDK on the server, using Vercel AI Gateway and deployment OIDC. The model is an environment setting. No provider keys or OIDC tokens enter browser bundles. Missing credits/authorization produce an actionable error, never a synthetic answer.
- Private Supabase Storage for study documents. File paths begin with the authenticated user ID. Uploads have type and size limits. Documents are read only after ownership checks; content is treated as untrusted reference material.
- Markdown is the structured notes format. Rendering excludes raw HTML. AI-generated quizzes use a validated schema.
- Database-backed AI request limits and conversation history. Context includes only the selected conversation and explicitly selected documents/notes.

## Database

| Table | Responsibility | Ownership / relationships |
|---|---|---|
| profiles | Display name, level, timezone, study target, onboarding | Primary key is auth user ID |
| subjects | Name and color | User; referenced by tasks, sessions, notes |
| tasks | Title, details, priority, category, deadline, completion | User; optional subject |
| study_sessions | Scheduled time, target, timer state, actual duration | User; optional subject |
| notes | Title, Markdown, folder, pin state | User; optional subject |
| goals | Academic/personal goal, target/current progress, deadline | User |
| habits | Daily/weekly frequency, active state | User |
| habit_entries | Dated completion history | User + habit; one entry per date |
| conversations | AI conversation title | User |
| messages | Ordered user/assistant messages and optional quiz | User + conversation |
| documents | Private file path, media type, size, display name | User |
| ai_requests | Request status and timestamps for rate limiting | User; server-validated request flow |

All owner and foreign-key columns are indexed. Timestamps use timestamptz; calendar-day aggregation uses the user's selected IANA timezone. All mutation responses are checked before showing success.

## Folder structure

- `src/app`: routes, layouts, auth callback, install manifest and server API endpoints.
- `src/components/ui`: shared accessible controls, dialogs, empty/error/loading states.
- `src/components`: navigation, authentication context and application shell.
- `src/app/(workspace)`: dashboard, planner, tasks, notes, goals/habits, AI, analytics and settings route implementations; a `src/features` extraction remains an incremental refactor, not an existing directory.
- `src/lib/supabase`: browser/server/session helpers and generated database types.
- `src/lib`: validation, date/analytics functions and shared utilities.
- `supabase/migrations`: reviewed schema and security migrations.
- `tests`: unit, database isolation and end-to-end verification.
- `docs`: architecture, milestones, operational setup and verification evidence.

## Design system

Apple-inspired restrained glass: warm off-white or deep graphite backgrounds, translucent navigation, opaque-enough content surfaces, fine borders and gentle shadows. Indigo accent, semantic green/amber/red. System font stack for excellent iPad rendering. 4px spacing grid, 12–24px radii, 44px touch targets. Desktop sidebar, tablet navigation, mobile menu. Light/dark/system preferences persist; reduced-motion and keyboard/focus support are required.

## Verification and deployment

Typecheck, production build, focused unit tests, RLS isolation tests, and actual browser flows are separate gates. Test records are isolated and cleaned up. GitHub commits represent logical milestones. Deployment success, authentication email configuration, database behavior and a real AI request must be checked independently. No phase is marked complete solely from screenshots or compilation.

## External prerequisites

GitHub and Vercel linkage and Supabase project access are available. Supabase auth redirect URLs and email delivery must be verified against the deployed origin. AI Gateway OIDC requires an eligible team and available credits; this is verified with an authenticated live request before claiming AI completion. Payment details and secrets must not be requested in chat.

## Migration parity (2026-11-15)

Hosted Supabase migration history records versions `20261115025353_studyos_foundation` and `20261115030656_study_intervals_and_chat_transactions`. Equivalent existing SQL files have been renamed to those versions, without running migration SQL against production. Keep future migration files aligned with applied history; validate on disposable Supabase before deploying.
