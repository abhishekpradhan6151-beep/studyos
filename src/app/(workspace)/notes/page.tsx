'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, Pin, Trash2, NotebookPen, CalendarDays } from 'lucide-react';
import { useRows, useWorkspace } from '@/components/workspace-provider';
import { useOperation } from '@/components/use-operation';
import { Button, ConfirmDelete, Dialog, Empty, ErrorState, Field, FormError, Loading, PageHeader, Panel, Pill } from '@/components/ui';
import { SubjectSelect } from '@/components/subject-select';
import { Markdown } from '@/components/markdown';
import { browserDb } from '@/lib/supabase/client';
import { noteSchema } from '@/lib/validation';
import { messageOf } from '@/lib/errors';
import { dayKey, dateLabel } from '@/lib/time';
import type { Note, Subject } from '@/lib/types';

export default function NotesPage() {
  const notes = useRows('notes'); const subjects = useRows('subjects'); const { profile } = useWorkspace(); const operation = useOperation();
  const [editor, setEditor] = useState<Note | 'new' | null>(null); const [deleting, setDeleting] = useState<Note | null>(null);
  const [search, setSearch] = useState(''); const [folder, setFolder] = useState('all'); const [pinned, setPinned] = useState(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get('new') === '1') setEditor('new'); }, []);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('id'); if (id && notes.data) setEditor(notes.data.find(n => n.id === id) || null); }, [notes.data]);
  const folders = [...new Set(notes.data?.map(n => n.folder) || [])].sort();
  const visible = (notes.data || []).filter(n => (folder === 'all' || n.folder === folder) && (!pinned || n.pinned) && `${n.title} ${n.content}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
  async function pin(note: Note) { await operation.run(async () => { const { error } = await browserDb().from('notes').update({ pinned: !note.pinned }).eq('id', note.id).select('id').single(); if (error) throw error; }, ['notes']); }
  async function remove() { if (!deleting) return; if (await operation.run(async () => { const { error } = await browserDb().from('notes').delete().eq('id', deleting.id).select('id').single(); if (error) throw error; }, ['notes'], 'Note deleted.')) setDeleting(null); }
  return <><PageHeader eyebrow="GOOD IDEAS DESERVE A HOME" title="Notes" description="Capture a thought. Connect the dots." action={<Button onClick={() => setEditor('new')}><Plus size={17} />New note</Button>} />
    <div className="toolbar"><div className="search-field"><Search size={16} /><input aria-label="Search notes" placeholder="Search titles and content…" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filter by folder" value={folder} onChange={e => setFolder(e.target.value)}><option value="all">All folders</option>{folders.map(f => <option key={f}>{f}</option>)}</select><Button variant={pinned ? 'primary' : 'secondary'} onClick={() => setPinned(!pinned)} aria-pressed={pinned}><Pin size={14} />Pinned</Button></div>
    {operation.error && !deleting && <FormError error={operation.error} />}
    {notes.isPending || subjects.isPending ? <Loading /> : notes.error || subjects.error ? <ErrorState error={messageOf(notes.error || subjects.error)} retry={() => { void notes.refetch(); void subjects.refetch(); }} /> : visible.length ? <div className="notes-grid">{visible.map(note => <Panel key={note.id} className="note-card"><button className="note-open" onClick={() => setEditor(note)} aria-label={`Open ${note.title}`}><Pill tone={subjects.data.find(s => s.id === note.subject_id)?.color || 'indigo'}>{note.folder}</Pill><h3>{note.title}</h3><p className="note-excerpt">{note.content || 'An open space for your next idea.'}</p></button><div className="note-footer"><span className="row" style={{ gap: 5 }}><CalendarDays size={11} />{dateLabel(dayKey(note.updated_at, profile.timezone))}</span><div className="row-actions"><button className="icon-btn" aria-label={`${note.pinned ? 'Unpin' : 'Pin'} ${note.title}`} aria-pressed={note.pinned} disabled={operation.busy} onClick={() => pin(note)}><Pin size={15} fill={note.pinned ? 'currentColor' : 'none'} /></button><button className="icon-btn" aria-label={`Delete ${note.title}`} onClick={() => { operation.setError(''); setDeleting(note); }}><Trash2 size={15} /></button></div></div></Panel>)}</div> : <Panel><Empty icon={<NotebookPen size={24} />} title={notes.data.length ? 'No notes found.' : 'Your next idea starts here.'} description={notes.data.length ? 'Try a different search or folder.' : 'Create study notes, collect ideas and keep your knowledge together. Markdown gives your notes structure.'} action={<Button onClick={() => setEditor('new')}><Plus size={15} />Write a note</Button>} /></Panel>}
    {editor && <NoteEditor note={editor === 'new' ? null : editor} subjects={subjects.data || []} onClose={() => { setEditor(null); if (window.location.search) window.history.replaceState(null, '', '/notes'); }} />}
    {deleting && <ConfirmDelete name="note" busy={operation.busy} error={operation.error} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}
function NoteEditor({ note, subjects, onClose }: { note: Note | null; subjects: Subject[]; onClose: () => void }) {
  const { userId } = useWorkspace(); const operation = useOperation(); const [content, setContent] = useState(note?.content || ''); const [preview, setPreview] = useState(false); const [dirty, setDirty] = useState(false);
  function close() { if (!operation.busy && (!dirty || window.confirm('Discard your unsaved changes?'))) onClose(); }
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    if (await operation.run(async () => {
      const values = noteSchema.parse({ title: f.get('title'), content, folder: f.get('folder'), pinned: f.get('pinned') === 'on', subject_id: f.get('subject_id') || null });
      const db = browserDb(); const query = note ? db.from('notes').update(values).eq('id', note.id) : db.from('notes').insert({ ...values, user_id: userId });
      const { error } = await query.select('id').single(); if (error) throw error;
    }, ['notes'], 'Note saved.')) onClose();
  }
  return <Dialog title={note ? 'Your note' : 'A place for your thoughts'} onClose={close} wide><form onSubmit={save} onChange={() => setDirty(true)} className="stack"><Field label="Title"><input name="title" defaultValue={note?.title} required maxLength={200} placeholder="Untitled idea" autoFocus /></Field><div className="form-grid"><Field label="Folder"><input name="folder" defaultValue={note?.folder || 'General'} maxLength={80} required /></Field><SubjectSelect subjects={subjects} defaultValue={note?.subject_id} /></div><div className="row between"><div className="segmented"><button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>Write</button><button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}>Preview</button></div><label className="row small"><input type="checkbox" name="pinned" defaultChecked={note?.pinned} />Pin note</label></div>{preview ? <div className="markdown-preview"><Markdown>{content || '*Your note preview will appear here.*'}</Markdown></div> : <Field label="Note content" hint="Markdown: # heading, **bold**, - lists, > quotes and fenced code blocks."><textarea className="note-editor" value={content} maxLength={100000} onChange={e => { setContent(e.target.value); setDirty(true); }} placeholder={'# What I learned\n\nStart with an idea…'} /></Field>}<FormError error={operation.error} /><div className="form-actions"><span className="small muted" style={{ marginRight: 'auto', alignSelf: 'center' }}>{dirty ? 'Unsaved changes' : note ? 'Saved to your account' : 'New note · not saved'}</span><Button type="button" variant="secondary" onClick={close} disabled={operation.busy}>Close</Button><Button type="submit" busy={operation.busy}>Save note</Button></div></form></Dialog>;
}
