'use client';
import { useState } from 'react';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import { useRows, useWorkspace } from './workspace-provider';
import { useOperation } from './use-operation';
import { Button, Dialog, Empty, FormError, Loading, ErrorState, ConfirmDelete } from './ui';
import { browserDb } from '@/lib/supabase/client';
import { messageOf } from '@/lib/errors';
import type { StudyDocument } from '@/lib/types';
export function DocumentLibrary({ selected, onSelect, onClose }: { selected: string[]; onSelect: (ids: string[]) => void; onClose: () => void }) {
  const documents = useRows('documents'); const { userId } = useWorkspace(); const operation = useOperation(); const [deleting, setDeleting] = useState<StudyDocument | null>(null);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    await operation.run(async () => {
      const extension = file.name.split('.').at(-1)?.toLowerCase(); const mediaType = extension === 'pdf' ? 'application/pdf' : extension === 'md' ? 'text/markdown' : extension === 'txt' ? 'text/plain' : '';
      if (!mediaType) throw new Error('Choose a PDF, TXT or Markdown file.');
      if (!file.size || file.size > 8388608) throw new Error('Choose a non-empty file smaller than 8 MB.');
      if (file.name.length > 200) throw new Error('Rename the file to fewer than 200 characters.');
      if (mediaType !== 'application/pdf' && (await file.text()).length > 60000) throw new Error('Text documents must contain fewer than 60,000 characters.');
      if (mediaType === 'application/pdf' && !(await file.slice(0, 5).text()).startsWith('%PDF-')) throw new Error('This file does not appear to be a valid PDF.');
      const id = crypto.randomUUID(); const path = `${userId}/${id}.${extension}`; const db = browserDb();
      const { error: uploadError } = await db.storage.from('study-documents').upload(path, file, { contentType: mediaType, upsert: false }); if (uploadError) throw uploadError;
      const { error } = await db.from('documents').insert({ id, user_id: userId, name: file.name, storage_path: path, media_type: mediaType, size_bytes: file.size });
      if (error) { const { error: cleanupError } = await db.storage.from('study-documents').remove([path]); if (cleanupError) throw new Error('The document record could not be saved, and its uploaded file could not be removed. Please contact support to clean up this upload.'); throw error; }
      if (selected.length < 2) onSelect([...selected, id]);
    }, ['documents'], 'Document uploaded to your private library.');
  }
  async function download(doc: StudyDocument) { await operation.run(async () => { const { data, error } = await browserDb().storage.from('study-documents').download(doc.storage_path); if (error) throw error; const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = doc.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, []); }
  async function remove() { if (!deleting) return; if (await operation.run(async () => { const db = browserDb(); const { error: storageError } = await db.storage.from('study-documents').remove([deleting.storage_path]); if (storageError) throw storageError; const { error } = await db.from('documents').delete().eq('id', deleting.id).select('id').single(); if (error) throw error; onSelect(selected.filter(id => id !== deleting.id)); }, ['documents'], 'Document deleted.')) setDeleting(null); }
  return <><Dialog title="Your document library" onClose={() => { if (!operation.busy) onClose(); }}><p className="small muted">Choose up to two files to share with the assistant. Files stay private to your account. PDF, TXT and Markdown; up to 8 MB each.</p><label className="file-input mt"><span className="row"><Upload size={17} />Upload a document</span><input aria-label="Upload document" type="file" accept=".pdf,.txt,.md" onChange={upload} disabled={operation.busy} style={{ marginTop: 12 }} /></label>{operation.busy && <p role="status" className="small muted mt">Updating your document library…</p>}<FormError error={operation.error} />{documents.isPending ? <Loading label="Loading documents…" /> : documents.error ? <ErrorState error={messageOf(documents.error)} retry={() => void documents.refetch()} /> : documents.data.length ? documents.data.map(doc => <div className="document-row" key={doc.id}><input type="checkbox" aria-label={`Attach ${doc.name}`} checked={selected.includes(doc.id)} disabled={operation.busy || (!selected.includes(doc.id) && selected.length >= 2)} onChange={() => onSelect(selected.includes(doc.id) ? selected.filter(id => id !== doc.id) : [...selected, doc.id])} /><FileText size={18} /><div><strong className="truncate" style={{ display: 'block' }}>{doc.name}</strong><small>{(doc.size_bytes / 1024).toFixed(0)} KB</small></div><button className="icon-btn" aria-label={`Download ${doc.name}`} onClick={() => download(doc)} disabled={operation.busy}><Download size={15} /></button><button className="icon-btn" aria-label={`Delete ${doc.name}`} onClick={() => { operation.setError(''); setDeleting(doc); }}><Trash2 size={15} /></button></div>) : <Empty title="Bring your materials along." description="Upload course notes, a chapter or a handout to explore it with your assistant." />}<div className="form-actions"><Button onClick={onClose} disabled={operation.busy}>Done · {selected.length} selected</Button></div></Dialog>{deleting && <ConfirmDelete name="document" busy={operation.busy} error={operation.error} onClose={() => setDeleting(null)} onConfirm={remove} />}</>;
}
