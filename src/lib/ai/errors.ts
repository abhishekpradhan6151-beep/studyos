/**
 * Convert untrusted AI Gateway/provider failures to actionable, non-sensitive
 * errors. The application reports no raw provider body or authentication data.
 */
export type AIProviderFailure = { status: number; upstreamStatus?: number; reason: string; message: string };

export function classifyAIProviderError(error: unknown): AIProviderFailure {
  const detail = error && typeof error === 'object'
    ? error as { statusCode?: unknown; code?: unknown; message?: unknown }
    : {};
  const upstreamStatus = typeof detail.statusCode === 'number' ? detail.statusCode : undefined;
  const code = typeof detail.code === 'string' ? detail.code.toLowerCase() : '';
  const description = typeof detail.message === 'string' ? detail.message.toLowerCase() : '';
  const text = `${code} ${description}`;

  if (/insufficient_funds|quota_for_entity_exceeded|credit.*exhausted|budget.*exceeded/.test(text) || upstreamStatus === 402) {
    return { status: 503, upstreamStatus, reason: 'ai_quota', message: 'AI Gateway has insufficient credits or an exhausted budget. Please check the StudyOS project’s Vercel AI Gateway usage and billing.' };
  }
  if (/customer_verification_required/.test(text)) {
    return { status: 503, upstreamStatus, reason: 'ai_verification', message: 'AI Gateway requires account verification in Vercel before it can process requests.' };
  }
  if (upstreamStatus === 401) {
    return { status: 503, upstreamStatus, reason: 'ai_authentication', message: 'AI Gateway could not authenticate the StudyOS deployment. Please check its Vercel OIDC configuration.' };
  }
  if (upstreamStatus === 403) {
    return { status: 503, upstreamStatus, reason: 'ai_access_denied', message: 'AI Gateway denied access to this StudyOS deployment. Please review AI Gateway permissions, account verification, and billing in Vercel.' };
  }
  if (upstreamStatus === 404 || /model.*not.*found|model.*unavailable/.test(text)) {
    return { status: 503, upstreamStatus, reason: 'ai_model', message: 'The selected AI model is unavailable. Please review the AI_GATEWAY_MODEL configuration in Vercel.' };
  }
  if (upstreamStatus === 429 || /rate.?limit/.test(text)) {
    return { status: 429, upstreamStatus, reason: 'ai_rate_limited', message: 'The AI provider is temporarily rate-limiting requests. Please retry later.' };
  }
  return { status: 502, upstreamStatus, reason: 'ai_provider_failure', message: 'The study assistant could not finish this request. Please retry; for documents, check that the file is readable and not password-protected.' };
}
