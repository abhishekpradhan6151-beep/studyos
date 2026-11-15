# StudyOS implementation and verification roadmap

Status meanings: planned, implementing, implemented, verified, blocked. Implemented is not equivalent to verified.

| Phase | Deliverable | Verification gate | Status |
|---|---|---|---|
| 1 | Architecture, repository, dependencies, typed foundation | Clean install, typecheck | Implementing |
| 2 | Responsive glass system, navigation, themes, shared states | Keyboard, tablet/mobile, theme persistence | Planned |
| 3 | Auth, recovery, server protection, schema, RLS, Storage | Auth flows and two-user isolation tests | Planned |
| 4 | Optional onboarding, profile, real-data dashboard | New-user and populated-account flows | Planned |
| 5 | Subjects, daily/weekly planner, timers, task CRUD/filter/sort | Persistence, edit/delete, reload/timer checks | Planned |
| 6 | Markdown notes, search, folders, pinning | CRUD, preview safety, persisted search results | Planned |
| 7 | Goals, daily/weekly habits, completion history/streaks | Date boundaries, repeat checks, user isolation | Planned |
| 8 | Contextual AI, stored conversations, document Q&A, quizzes | Auth/rate-limit tests and real provider response | Planned |
| 9 | Study, task, habit and goal analytics | Computed results vs known fixtures and live records | Planned |
| 10 | Profile, target, timezone and theme settings | Saved preferences after reload/sign-in | Planned |
| 11 | Functional QA, accessibility, security review | Build, unit, RLS and browser suites; fix defects | Planned |
| 12 | Production deployment and operational documentation | Healthy deployment, public auth routes, live smoke checks | Planned |

## Milestones

1. Architecture + secure foundation and auth.
2. Everyday workspace: dashboard, planner, tasks, notes, goals and habits.
3. Server AI, documents, quizzes and analytics.
4. Verified deployment and operational handoff.

## Acceptance rules

- No fabricated records, analytics, AI answers or success messages.
- No feature button without a working action or an explicit disabled reason.
- No privileged key in source or frontend.
- Operations retain entered data on failure and provide useful errors.
- Future dates, timezone changes, duplicate habit completion, paused/reloaded timers and cross-user IDs are tested.
- Email delivery and paid-provider access remain explicit external gates if the connected accounts cannot supply them.
