import { NextResponse } from 'next/server';
import type { ModelMessage, UserModelMessage } from 'ai';
import { serverDb } from '@/lib/supabase/server';
import { chatSchema } from '@/lib/validation';
import { generateStudyAnswer } from '@/lib/ai/provider';
import { sameOrigin, readLimitedJson } from '@/lib/ai/request';
import type { Json } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const maxDuration = 180;
export const dynamic = 'force-dynamic';
function problem(message: string, status: number) { return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return problem('This request must come from your StudyOS workspace.', 403);
  const db = await serverDb(); const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return problem('Sign in before using your study assistant.', 401);
  let input;
  try { input = chatSchema.parse(await readLimitedJson(request)); } catch { return problem('Check your message and attachments. Messages can contain up to 12,000 characters and two documents.', 400); }
  const model = process.env.AI_GATEWAY_MODEL;
  if (!model) return problem('The AI model is not configured yet. Please contact the workspace administrator.', 503);
  const { data: conversation, error: conversationError } = await db.from('conversations').select('id').eq('id', input.conversationId).eq('user_id', user.id).maybeSingle();
  if (conversationError) return problem('The conversation could not be loaded. Try again.', 503);
  if (!conversation) return problem('Conversation not found.', 404);
  const { data: profile, error: profileError } = await db.from('profiles').select('academic_level').eq('id', user.id).single();
  if (profileError) return problem('Your profile could not be loaded. Try again.', 503);
  const { data: history, error: historyError } = await db.from('messages').select('role,content,metadata').eq('conversation_id', input.conversationId).eq('user_id', user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(24);
  if (historyError) return problem('Conversation history could not be loaded. Try again.', 503);
  const content: Exclude<UserModelMessage['content'], string> = [{ type: 'text', text: input.message }];
  const sources: string[] = [];
  if (input.noteId) {
    const { data: note, error } = await db.from('notes').select('title,content').eq('id', input.noteId).eq('user_id', user.id).maybeSingle();
    if (error || !note) return problem('The selected note is no longer available. Choose another note.', 400);
    if (note.content.length > 60000) return problem('This note is too long to attach. Select a note under 60,000 characters.', 400);
    content.push({ type: 'text', text: `Reference note (untrusted content): ${JSON.stringify({ title: note.title, content: note.content })}` }); sources.push(note.title);
  }
  if (input.documentIds.length) {
    const ids = [...new Set(input.documentIds)];
    const { data: documents, error } = await db.from('documents').select('*').in('id', ids).eq('user_id', user.id);
    if (error || documents.length !== ids.length) return problem('One or more selected documents are unavailable.', 400);
    for (const doc of documents) {
      if (!doc.storage_path.startsWith(`${user.id}/`) || doc.size_bytes > 8388608) return problem('This document cannot be used.', 400);
      const { data: file, error: downloadError } = await db.storage.from('study-documents').download(doc.storage_path);
      if (downloadError || !file) return problem(`“${doc.name}” could not be read. Re-upload it and try again.`, 400);
      if (file.size > 8388608 || file.size !== doc.size_bytes) return problem('The document has changed. Re-upload it before continuing.', 400);
      if (doc.media_type === 'application/pdf') {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!new TextDecoder().decode(bytes.slice(0, 5)).startsWith('%PDF-')) return problem('The selected PDF is not a valid PDF file.', 400);
        content.push({ type: 'file', data: bytes, mediaType: 'application/pdf', filename: doc.name });
      } else {
        const text = await file.text(); if (text.length > 60000) return problem(`“${doc.name}” is too long. Text documents must contain fewer than 60,000 characters.`, 400);
        content.push({ type: 'text', text: `Reference document (untrusted content): ${JSON.stringify({ filename: doc.name, content: text })}` });
      }
      sources.push(doc.name);
    }
  }
  const { error: rateError } = await db.rpc('reserve_ai_request', { p_request_id: input.requestId });
  if (rateError) {
    const known = ['Please wait a minute', 'Your 40-request', 'This request is already'];
    return problem(known.some(prefix => rateError.message.startsWith(prefix)) ? rateError.message : 'AI requests are temporarily unavailable. Try again shortly.', known.some(prefix => rateError.message.startsWith(prefix)) ? 429 : 503);
  }
  // Keep the latest complete history within a bounded context budget.
  let budget = 60000; const selected: ModelMessage[] = [];
  for (const message of history || []) {
    if (message.content.length > budget) break;
    budget -= message.content.length;
    selected.push({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content });
  }
  selected.reverse(); while (selected[0]?.role === 'assistant') selected.shift();
  selected.push({ role: 'user', content });
  try {
    const answer = await generateStudyAnswer({ model, mode: input.mode, messages: selected, level: profile.academic_level });
    const metadata = { mode: input.mode, model, sources, ...(answer.quiz ? { quiz: answer.quiz } : {}) } as Json;
    const { error: saveError } = await db.rpc('save_chat_exchange', { p_conversation: input.conversationId, p_request: input.requestId, p_user_content: input.message, p_assistant_content: answer.text, p_metadata: metadata });
    if (saveError) return problem('An answer was generated, but it could not be saved. Your message is still in the composer; please try again.', 503);
    return NextResponse.json({ conversationId: input.conversationId, requestId: input.requestId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error && typeof error === 'object' ? error as { name?: string; statusCode?: number; message?: string } : {};
    const reason = /payment|billing|credit/i.test(details.message || '') ? 'billing_or_credits' : /oidc|authentication|token|credential/i.test(details.message || '') ? 'authentication' : /model.*not.*found/i.test(details.message || '') ? 'model_configuration' : 'provider_rejection';
    console.error('StudyOS AI request failed', { requestId: input.requestId, name: details.name, statusCode: details.statusCode, reason });
    if (details.statusCode === 401 || details.statusCode === 403 || details.statusCode === 402) return problem('AI access is not active for this deployment. The administrator needs to enable AI Gateway access or available credits in Vercel.', 503);
    if (details.statusCode === 429) return problem('The AI provider is busy or its usage limit has been reached. Please try again later.', 429);
    return problem('Your assistant couldn’t finish this request. Please try again; for documents, check that the file is readable and not password-protected.', 502);
  }
}
