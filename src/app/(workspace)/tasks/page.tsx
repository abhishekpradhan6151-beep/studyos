'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Check, Pencil, Trash2, CalendarDays, ListChecks } from 'lucide-react';
import { useRows, useWorkspace } from '@/components/workspace-provider';
import { useOperation } from '@/components/use-operation';
import { Button, ConfirmDelete, Dialog, Empty, ErrorState, Field, FormError, Loading, PageHeader, Panel, Pill } from '@/components/ui';
import { SubjectSelect } from '@/components/subject-select';
import { browserDb } from '@/lib/supabase/client';
import { taskSchema } from '@/lib/validation';
import { messageOf } from '@/lib/errors';
import { dayKey, dateLabel } from '@/lib/time';
import type { Task, Subject } from '@/lib/types';

export default function TasksPage() {
  const tasks = useRows('tasks'); const subjects = useRows('subjects');
  const { profile } = useWorkspace(); const operation = useOperation();
  const [editor, setEditor] = useState<Task | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('active'); const [category, setCategory] = useState('all'); const [priority, setPriority] = useState('all'); const [sort, setSort] = useState('due');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('new') === '1') setEditor('new'); }, []);
  const today = dayKey(new Date(), profile.timezone);
  const categories = [...new Set(tasks.data?.map(t => t.category) || [])].sort();
  const visible = useMemo(() => {
    const ranks: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (tasks.data || []).filter(t => (status === 'all' || (status === 'done' ? !!t.completed_at : !t.completed_at)) && (category === 'all' || t.category === category) && (priority === 'all' || t.priority === priority) && `${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'priority' ? ranks[a.priority] - ranks[b.priority] || a.created_at.localeCompare(b.created_at) : sort === 'newest' ? b.created_at.localeCompare(a.created_at) : (a.due_date || '9999').localeCompare(b.due_date || '9999') || ranks[a.priority] - ranks[b.priority]);
  }, [tasks.data, status, category, priority, search, sort]);
  async function toggle(task: Task) {
    await operation.run(async () => { const { error } = await browserDb().from('tasks').update({ completed_at: task.completed_at ? null : new Date().toISOString() }).eq('id', task.id).select('id').single(); if (error) throw error; }, ['tasks']);
  }
  async function remove() {
    if (!deleting) return;
    if (await operation.run(async () => { const { error } = await browserDb().from('tasks').delete().eq('id', deleting.id).select('id').single(); if (error) throw error; }, ['tasks'], 'Task deleted.')) setDeleting(null);
  }
  return <><PageHeader eyebrow="A LITTLE LESS ON YOUR MIND" title="Tasks" description="Make a plan. Take the next small step." action={<Button onClick={() => setEditor('new')}><Plus size={17} />New task</Button>} />
    <div className="toolbar"><div className="search-field"><Search size={16} /><input aria-label="Search tasks" placeholder="Search your tasks…" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select><select aria-label="Filter by priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><select aria-label="Sort tasks" value={sort} onChange={e => setSort(e.target.value)}><option value="due">Due date</option><option value="priority">Priority</option><option value="newest">Newest first</option></select></div>
    <div className="view-heading"><div className="segmented">{[['active', 'To do'], ['done', 'Completed'], ['all', 'All tasks']].map(([value, label]) => <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)} aria-pressed={status === value}>{label}</button>)}</div><span className="small muted">{tasks.data?.filter(t => !t.completed_at).length ?? '—'} remaining</span></div>
    {operation.error && !deleting && <FormError error={operation.error} />}
    {tasks.isPending || subjects.isPending ? <Loading /> : tasks.error || subjects.error ? <ErrorState error={messageOf(tasks.error || subjects.error)} retry={() => { void tasks.refetch(); void subjects.refetch(); }} /> : <Panel className="task-list">{visible.length ? visible.map(task => <div key={task.id} className={`task-row ${task.completed_at ? 'is-complete' : ''}`}><button className={`check-button ${task.completed_at ? 'checked' : ''}`} onClick={() => toggle(task)} disabled={operation.busy} aria-label={`${task.completed_at ? 'Reopen' : 'Complete'} ${task.title}`}>{task.completed_at && <Check size={15} />}</button><div className="grow"><h3>{task.title}</h3>{task.description && <details><summary className="small muted">Details</summary><p className="task-desc">{task.description}</p></details>}<div className="meta"><Pill tone={task.priority}>{task.priority}</Pill><span>{task.category}</span>{task.subject_id && <span>{subjects.data.find(s => s.id === task.subject_id)?.name}</span>}{task.due_date && <span className={!task.completed_at && task.due_date < today ? 'overdue row' : 'row'} style={{ gap: 4 }}><CalendarDays size={11} />{task.due_date === today ? 'Today' : dateLabel(task.due_date)}{!task.completed_at && task.due_date < today ? ' · Overdue' : ''}</span>}</div></div><div className="row-actions"><button className="icon-btn" aria-label={`Edit ${task.title}`} onClick={() => setEditor(task)}><Pencil size={15} /></button><button className="icon-btn" aria-label={`Delete ${task.title}`} onClick={() => { operation.setError(''); setDeleting(task); }}><Trash2 size={15} /></button></div></div>) : <Empty icon={<ListChecks size={24} />} title={tasks.data.length ? 'All clear here.' : 'Make room for your first task.'} description={tasks.data.length ? 'No tasks match these filters. Try another view or add something new.' : 'Add an assignment, a deadline or one small thing you want to get done.'} action={<Button onClick={() => setEditor('new')}><Plus size={15} />Add a task</Button>} />}</Panel>}
    {editor && <TaskEditor task={editor === 'new' ? null : editor} subjects={subjects.data || []} onClose={() => setEditor(null)} />}
    {deleting && <ConfirmDelete name="task" busy={operation.busy} error={operation.error} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </>;
}
function TaskEditor({ task, subjects, onClose }: { task: Task | null; subjects: Subject[]; onClose: () => void }) {
  const { userId } = useWorkspace(); const operation = useOperation();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const ok = await operation.run(async () => {
      const values = taskSchema.parse({ title: f.get('title'), description: f.get('description'), category: f.get('category'), priority: f.get('priority'), due_date: f.get('due_date') || null, subject_id: f.get('subject_id') || null });
      const db = browserDb(); const query = task ? db.from('tasks').update(values).eq('id', task.id) : db.from('tasks').insert({ ...values, user_id: userId });
      const { error } = await query.select('id').single(); if (error) throw error;
    }, ['tasks'], task ? 'Task updated.' : 'Task added.'); if (ok) onClose();
  }
  return <Dialog title={task ? 'Edit task' : 'A new step forward'} onClose={() => { if (!operation.busy) onClose(); }}><form onSubmit={save} className="stack"><Field label="Task title"><input name="title" defaultValue={task?.title} required maxLength={200} placeholder="What needs to get done?" autoFocus /></Field><Field label="Description"><textarea name="description" defaultValue={task?.description} maxLength={10000} placeholder="Add a little context (optional)" /></Field><div className="form-grid"><Field label="Due date"><input name="due_date" type="date" defaultValue={task?.due_date || ''} /></Field><Field label="Priority"><select name="priority" defaultValue={task?.priority || 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Category"><input name="category" defaultValue={task?.category || 'General'} required maxLength={80} /></Field><SubjectSelect subjects={subjects} defaultValue={task?.subject_id} /></div><FormError error={operation.error} /><div className="form-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={operation.busy}>Cancel</Button><Button type="submit" busy={operation.busy}>Save task</Button></div></form></Dialog>;
}
