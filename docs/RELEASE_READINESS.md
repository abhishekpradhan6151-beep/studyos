# StudyOS — live integration and security release review

**Audit date:** 2026-11-15, after Phase 1 merge. These are observed facts, not completed-release claims.

## Connected service inventory

- **GitHub:** `abhishekpradhan6151-beep/studyos`, production branch `main`. Last checked Phase 1 commit `0ef1aacd` passed the full CI workflow. The branch is not protected; the connected GitHub actions do not expose an administration operation to set branch protection.
- **Vercel:** `jacob14-d501/studyos`, project `prj_iQjdQKFMHkdvkTPfBKo8VBlzRt48`. Production for `0ef1aacd` was READY. Production, preview, and development have publishable Supabase config and an `AI_GATEWAY_MODEL` setting.
- **Supabase:** `studyOS`, reference `othwunwcidlatifwvcow`, region `ap-south-1`. Read-only inspection: 14 public application tables, RLS enabled on all, at least one policy on each; `study-documents` is a private bucket. The schema migration ledger matches the checked-in migration versions.

## AI integration — **unverified live behavior**

- `AI_GATEWAY_MODEL` resolves to `google/gemini-3.8-flash`, an actual model in Vercel's current catalog with text and file input.
- The application already uses server-only AI SDK generation after session validation, with database-backed request limits and conversations. It does not return fake model answers.
- The last observed runtime failure (an earlier deployment) was `GatewayInternalServerError` with upstream HTTP **403** on `/api/assistant`. The Gateway project usage query returned no rows in the last seven days. This is insufficient to establish credits, authentication, or successful generation.
- Phase 2 adds sanitized, actionable mapping of gateway failures: missing OIDC auth (401), access/account verification (403), exhausted credits/budgets (402), unavailable model (404), provider rate limit (429), and generic gateway failures (502).
- **Release gate:** In Vercel, review AI Gateway enablement, payment-method verification if requested, and project spending controls. Then use a dedicated disposable authenticated StudyOS account to ask an academic question, generate a quiz, and summarize a small uploaded document. Confirm the responses and saved messages in the same account, and confirm no other account can view them. Do not disable quotas to make the test pass.

## Supabase Authentication — **external user action remains**

- Existing CI verifies sign-up, password login, password recovery, logout, redirects, and route protection on a **disposable local Supabase** instance. CI does not prove that production signup/recovery emails are delivered.
- The Supabase Security Advisor currently reports `auth_leaked_password_protection` as **WARN**. Enable leaked-password protection in Authentication password security; read [Supabase documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Check the hosted Authentication Site URL and redirect allowlist for the production origin, then verify signup and recovery delivery with a real inbox under the operator's control. Hosted Supabase's default email service may be restricted; use a correctly configured custom SMTP provider for public usage.
- Do not enter SMTP passwords or service-role keys in GitHub source, Vercel public variables, logs, or chat.

## CI, data safety and accessibility

- Phase 2 adds *real* two-account RLS and Storage isolation against the disposable Supabase stack. It verifies forbidden cross-account reads, writes, updates, deletes, cross-owner subject references, and private document downloads.
- Glass UI adds high-contrast, reduced-transparency, forced-color fallback, and accessible mobile navigation wiring. Browser tests verify system-theme preference changes and persistence and mobile Escape behavior.
- Required checks on `main` are **not configured**. Configure branch protection/rulesets and require StudyOS quality checks in GitHub repository settings before opening public contributions. Preserve review-first deploys; do not confuse Vercel READY with external-service acceptance.

## Remaining acceptance checklist

- [ ] Successful real AI generation via Vercel deployment with authorized credits
- [ ] Production confirmation and recovery emails delivered to an authorized test inbox
- [ ] Leaked-password protection enabled (Supabase advisor cleared)
- [ ] GitHub main branch protected with required passing checks
- [ ] VoiceOver and manual touch-target/contrast check on a real iPad
- [ ] Production two-account isolation and Storage test with **disposable** test users only, following an operator-approved script

Never claim live AI, SMTP, security administration, or manual device testing complete until these gates have evidence.
