'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import { browserDb } from '@/lib/supabase/client';
import { profileSchema } from '@/lib/validation';
import { messageOf } from '@/lib/errors';
import { Button, Field, FormError } from './ui';
export function Onboarding() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function finish(values?: FormData) {
    setBusy(true); setError('');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const profile = profileSchema.parse({ display_name: values?.get('name') || '', academic_level: values?.get('level') || '', daily_target_minutes: values?.get('target') || 60, timezone });
      const subjects = String(values?.get('subjects') || '').split(',').map(s => s.trim()).filter(Boolean);
      if (subjects.length > 12 || subjects.some(s => s.length > 80)) throw new Error('Add up to 12 subjects, each under 80 characters.');
      const { error } = await browserDb().rpc('complete_onboarding', { p_name: profile.display_name, p_level: profile.academic_level, p_target: profile.daily_target_minutes, p_timezone: timezone, p_subjects: subjects, p_goal: String(values?.get('goal') || '') });
      if (error) throw error; router.replace('/dashboard'); router.refresh();
    } catch (err) { setError(messageOf(err)); } finally { setBusy(false); }
  }
  return <main className="onboarding-page"><div className="brand"><span className="brand-mark">S</span>StudyOS</div><section className="onboarding-card panel"><div className="onboarding-intro"><span className="icon-tile"><Sparkles size={24} /></span><p className="eyebrow">A SPACE THAT FEELS LIKE YOU</p><h1>Let’s start with<br />your ambitions.</h1><p className="muted">A few small details help shape your workspace. Everything here is optional, and you can change it later.</p><span className="small muted"><Check size={16} />Your progress starts with a clean slate.</span></div><form className="stack" onSubmit={e => { e.preventDefault(); void finish(new FormData(e.currentTarget)); }}><Field label="What should we call you?"><input name="name" maxLength={80} autoComplete="given-name" placeholder="Your first name" /></Field><div className="form-grid"><Field label="Academic level"><select name="level" defaultValue=""><option value="">Choose later</option><option>School</option><option>Undergraduate</option><option>Postgraduate</option><option>Independent learner</option></select></Field><Field label="Daily focus target"><select name="target" defaultValue="60"><option value="25">25 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="180">3 hours</option></select></Field></div><Field label="Your subjects" hint="Separate subjects with commas. You can add more in your planner."><input name="subjects" placeholder="e.g. Biology, Mathematics, Design" maxLength={972} /></Field><Field label="One goal you’re working toward"><input name="goal" maxLength={200} placeholder="e.g. Finish my semester project" /></Field><FormError error={error} /><Button busy={busy} type="submit">Create my workspace <ArrowRight size={17} /></Button><Button variant="ghost" disabled={busy} type="button" onClick={() => finish()}>Skip for now</Button></form></section></main>;
}
