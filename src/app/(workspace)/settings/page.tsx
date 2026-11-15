'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Download, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useWorkspace, fetchRows } from '@/components/workspace-provider';
import { useOperation } from '@/components/use-operation';
import { Button, Field, FormError, PageHeader, Panel, SectionHeading } from '@/components/ui';
import { browserDb } from '@/lib/supabase/client';
import { profileSchema } from '@/lib/validation';
import type { TableName } from '@/lib/types';
export default function SettingsPage() {
  const { profile, userId, email } = useWorkspace(); const operation = useOperation(); const router = useRouter(); const { theme, setTheme } = useTheme(); const [mounted, setMounted] = useState(false); const [exporting, setExporting] = useState(false);
  useEffect(() => setMounted(true), []);
  const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London'];
  const zones = [...new Set(['UTC', profile.timezone, ...timezones])].sort();
  async function save(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); if (await operation.run(async () => { const values = profileSchema.parse(Object.fromEntries(f)); const { error } = await browserDb().from('profiles').update(values).eq('id', userId).select('id').single(); if (error) throw error; }, ['profiles'], 'Your preferences are saved.')) router.refresh(); }
  async function exportData() {
    setExporting(true);
    await operation.run(async () => {
      const tables: TableName[] = ['subjects', 'tasks', 'study_sessions', 'study_intervals', 'notes', 'goals', 'habits', 'habit_entries', 'conversations', 'messages', 'documents', 'quiz_attempts'];
      const records = await Promise.all(tables.map(async table => [table, await fetchRows(table)]));
      const blob = new Blob([JSON.stringify({ format: 'studyos-export-v1', exported_at: new Date().toISOString(), profile, records: Object.fromEntries(records) }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `studyos-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [], 'Your export is ready to download.'); setExporting(false);
  }
  return <><PageHeader eyebrow="MAKE YOURSELF AT HOME" title="Settings" description="A workspace that works the way you do." /><div className="settings-grid"><div><Panel><SectionHeading title="Your profile" subtitle="A few details to make this space yours." /><form className="stack" onSubmit={save}><Field label="Display name"><input name="display_name" defaultValue={profile.display_name} maxLength={80} placeholder="Your name" /></Field><Field label="Email address" hint="This is the email you use to sign in."><input value={email} disabled type="email" /></Field><Field label="Academic level"><input name="academic_level" defaultValue={profile.academic_level} maxLength={80} placeholder="School, undergraduate, independent learner…" /></Field><div className="form-grid"><Field label="Daily study target (minutes)"><input name="daily_target_minutes" type="number" min={5} max={720} defaultValue={profile.daily_target_minutes} required /></Field><Field label="Time zone"><select name="timezone" defaultValue={profile.timezone}>{zones.map(z => <option key={z}>{z}</option>)}</select></Field></div><p className="tiny muted">Changing your time zone changes how study intervals are grouped into days. Habit check-ins keep the date you selected.</p><FormError error={operation.error} /><div className="form-actions"><Button busy={operation.busy && !exporting}>Save changes</Button></div></form></Panel><Panel><SectionHeading title="Your data, in your hands" subtitle="Download a copy of your workspace." /><p className="small muted">Export your notes, plans, task history, conversations and other account records as JSON. Document metadata is included; original files can be downloaded from the assistant’s document library.</p><Button variant="secondary" className="mt" onClick={exportData} busy={exporting} disabled={operation.busy && !exporting}><Download size={15} />Export my data</Button></Panel></div><div><Panel><SectionHeading title="Appearance" subtitle="Choose the light that suits you." /><div className="theme-options">{[{ key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }, { key: 'system', label: 'System', icon: Monitor }].map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTheme(key)} aria-pressed={mounted && theme === key} className={`theme-option ${mounted && theme === key ? 'active' : ''}`}><Icon size={21} />{label}</button>)}</div></Panel><Panel><SectionHeading title="Account & security" /><p className="small muted row" style={{ alignItems: 'flex-start' }}><ShieldCheck size={19} />Your workspace is private to your authenticated account. AI only receives your current conversation and the notes or documents you choose to share.</p><Link href="/reset-password" className="btn btn-secondary full mt">Change password <ArrowUpRight size={14} /></Link></Panel><Panel><SectionHeading title="Your learning setup" /><p className="small muted">Organize your subjects in the planner. Add, rename or remove them whenever your studies change.</p><Link href="/planner" className="text-link mt">Manage subjects <ArrowUpRight size={14} /></Link></Panel></div></div></>;
}
