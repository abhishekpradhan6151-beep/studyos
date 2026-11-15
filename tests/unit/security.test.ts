import { describe, expect, it } from 'vitest';
import { sameOrigin, readLimitedJson } from '@/lib/ai/request';
import { chatSchema, goalSchema, safeNext, quizSchema } from '@/lib/validation';
import { authRedirect } from '@/lib/auth-redirect';
import { scoreQuiz } from '@/lib/quiz';
import { classifyAIProviderError } from '@/lib/ai/errors';
describe('AI request boundary', () => {
  it('requires the exact workspace origin', () => { expect(sameOrigin(new Request('https://study.example/api/assistant', { headers: { origin: 'https://study.example' } }))).toBe(true); for (const origin of ['https://evil.example', 'null', 'https://study.example.evil.example']) expect(sameOrigin(new Request('https://study.example/api/assistant', { headers: { origin } }))).toBe(false); expect(sameOrigin(new Request('https://study.example/api/assistant'))).toBe(false); });
  it('keeps callback redirects relative and cannot redirect to another host', () => { expect(authRedirect('/reset-password').headers.get('location')).toBe('/reset-password'); expect(authRedirect('https://evil.example').headers.get('location')).toBe('/dashboard'); expect(authRedirect('//evil.example').headers.get('location')).toBe('/dashboard'); });
  it('checks the actual host behind the local bind address and ignores forwarded-host spoofing', () => { expect(sameOrigin(new Request('http://0.0.0.0:3000/api/assistant', {headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}}))).toBe(true); expect(sameOrigin(new Request('https://study.example/api/assistant', {headers:{host:'study.example',origin:'https://evil.example','x-forwarded-host':'evil.example'}}))).toBe(false); expect(sameOrigin(new Request('https://study.example/api/assistant', {headers:{origin:'https://study.example','sec-fetch-site':'cross-site'}}))).toBe(false); });
  it('limits bytes even if content-length is absent', async () => { const request = new Request('https://study.example/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'a'.repeat(100) }) }); await expect(readLimitedJson(request, 50)).rejects.toThrow('too large'); });
  it('rejects malformed JSON and wrong content types', async () => { await expect(readLimitedJson(new Request('https://study.example', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'broken' }))).rejects.toThrow(); await expect(readLimitedJson(new Request('https://study.example', { method: 'POST', body: '{}' }))).rejects.toThrow('Expected JSON'); });
  it('validates ownership references, message size and attachment count', () => { const valid = { conversationId: crypto.randomUUID(), requestId: crypto.randomUUID(), message: 'Explain mitosis', mode: 'ask' }; expect(chatSchema.safeParse(valid).success).toBe(true); expect(chatSchema.safeParse({ ...valid, message: 'x'.repeat(12001) }).success).toBe(false); expect(chatSchema.safeParse({ ...valid, documentIds: Array.from({ length: 3 }, () => crypto.randomUUID()) }).success).toBe(false); expect(chatSchema.safeParse({ ...valid, mode: 'execute' }).success).toBe(false); });
  it('rejects open redirect destinations', () => { expect(safeNext('https://evil.example')).toBe('/dashboard'); expect(safeNext('//evil.example')).toBe('/dashboard'); expect(safeNext('/reset-password')).toBe('/reset-password'); });
});
describe('progress integrity', () => {
  it('rejects goals beyond their target', () => { expect(goalSchema.safeParse({ title: 'Read', kind: 'academic', target_value: 10, current_value: 11, unit: 'books', due_date: null }).success).toBe(false); });
  it('grades questions and requires every answer', () => { const quiz = quizSchema.parse({ title: 'Basics', questions: [0, 1, 2].map(i => ({ question: `Q${i}`, options: ['A', 'B', 'C', 'D'], correctIndex: i, explanation: 'Reason' })) }); expect(scoreQuiz(quiz, [0, 1, 3])).toEqual({ correct: 2, total: 3, score: 67 }); expect(() => scoreQuiz(quiz, [0, -1, 2])).toThrow(); expect(() => scoreQuiz(quiz, [0])).toThrow(); });
});

describe('AI provider failure handling', () => {
  it('distinguishes blocked access and account verification without exposing provider payloads', () => {
    const generic = classifyAIProviderError({ statusCode: 403, message: 'secret-token=do-not-show' });
    expect(generic.status).toBe(503);
    expect(generic.reason).toBe('ai_access_denied');
    expect(generic.message).not.toContain('secret-token');
    expect(classifyAIProviderError({ statusCode: 403, code: 'customer_verification_required' }).reason).toBe('ai_verification');
  });
  it('distinguishes quotas, auth failures, unavailable models and rate limits', () => {
    expect(classifyAIProviderError({ statusCode: 402 }).reason).toBe('ai_quota');
    expect(classifyAIProviderError({ statusCode: 401 }).reason).toBe('ai_authentication');
    expect(classifyAIProviderError({ statusCode: 404 }).reason).toBe('ai_model');
    expect(classifyAIProviderError({ statusCode: 429 })).toMatchObject({ reason: 'ai_rate_limited', status: 429 });
    expect(classifyAIProviderError(new Error('backend unavailable'))).toMatchObject({ reason: 'ai_provider_failure', status: 502 });
  });
});
