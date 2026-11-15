import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// RLS verification must never run against the user's hosted StudyOS database.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url.startsWith('http://127.0.0.1:') || !publishable || !serviceKey) {
  throw new Error('Isolation tests require a disposable local Supabase instance.');
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = () => createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });

// Exercise real database and storage permission checks, not a mocked browser API.
test('two students cannot read, modify or attach each other’s records', async () => {
  const uid = randomBytes(7).toString('hex');
  const pass = 'QA-' + randomBytes(17).toString('hex');
  const aEmail = `qa-privacy-a-${uid}@example.invalid`;
  const bEmail = `qa-privacy-b-${uid}@example.invalid`;
  let aId: string | undefined;
  let bId: string | undefined;
  let storedFile: string | undefined;
  try {
    const aa = await admin.auth.admin.createUser({ email: aEmail, password: pass, email_confirm: true });
    expect(aa.error).toBeNull();
    aId = aa.data.user!.id;
    const bb = await admin.auth.admin.createUser({ email: bEmail, password: pass, email_confirm: true });
    expect(bb.error).toBeNull();
    bId = bb.data.user!.id;

    const a = client(), b = client(), anon = client();
    expect((await a.auth.signInWithPassword({ email: aEmail, password: pass })).error).toBeNull();
    expect((await b.auth.signInWithPassword({ email: bEmail, password: pass })).error).toBeNull();
    const subject = await a.from('subjects').insert({ user_id: aId!, name: 'Private physics' }).select('id').single();
    expect(subject.error).toBeNull();
    const task = await a.from('tasks').insert({ user_id: aId!, subject_id: subject.data!.id, title: 'Private assignment' }).select('id').single();
    expect(task.error).toBeNull();
    const note = await a.from('notes').insert({ user_id: aId!, title: 'My notes', content: 'Private class notes' }).select('id').single();
    expect(note.error).toBeNull();
    const conversation = await a.from('conversations').insert({ user_id: aId! }).select('id').single();
    expect(conversation.error).toBeNull();

    for (const [table, id] of [
      ['tasks', task.data!.id],
      ['notes', note.data!.id],
      ['conversations', conversation.data!.id],
    ] as const) {
      const result = await b.from(table).select('id').eq('id', id);
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }
    const noAnonymousTasks = await anon.from('tasks').select('id').eq('id', task.data!.id);
    expect(noAnonymousTasks.error === null ? noAnonymousTasks.data : []).toEqual([]);

    const update = await b.from('tasks').update({ title: 'Tampered' }).eq('id', task.data!.id).select('id');
    expect(update.error).toBeNull();
    expect(update.data).toEqual([]);
    const deletion = await b.from('tasks').delete().eq('id', task.data!.id).select('id');
    expect(deletion.error).toBeNull();
    expect(deletion.data).toEqual([]);
    const impersonate = await b.from('tasks').insert({ user_id: aId!, title: 'Forged' });
    expect(impersonate.error).toBeTruthy();
    const alienSubject = await b.from('tasks').insert({ user_id: bId!, subject_id: subject.data!.id, title: 'Wrong subject owner' });
    expect(alienSubject.error).toBeTruthy();

    const original = await a.from('tasks').select('title').eq('id', task.data!.id).single();
    expect(original.error).toBeNull();
    expect(original.data?.title).toBe('Private assignment');

    storedFile = `${aId}/${randomBytes(8).toString('hex')}.txt`;
    expect((await a.storage.from('study-documents').upload(storedFile, 'private study file', { contentType: 'text/plain' })).error).toBeNull();
    expect((await b.storage.from('study-documents').download(storedFile)).error).toBeTruthy();
    expect((await b.storage.from('study-documents').upload(`${aId}/forged.txt`, 'unauthorized', { contentType: 'text/plain' })).error).toBeTruthy();
    const download = await a.storage.from('study-documents').download(storedFile);
    expect(download.error).toBeNull();
    expect(await download.data!.text()).toBe('private study file');

    await a.auth.signOut();
    await b.auth.signOut();
  } finally {
    if (aId && storedFile) await admin.storage.from('study-documents').remove([storedFile]);
    if (aId) await admin.auth.admin.deleteUser(aId);
    if (bId) await admin.auth.admin.deleteUser(bId);
  }
});
