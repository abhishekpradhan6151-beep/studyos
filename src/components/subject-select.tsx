'use client';
import type { Subject } from '@/lib/types';
import { Field } from './ui';
export function SubjectSelect({ subjects, defaultValue }: { subjects: Subject[]; defaultValue?: string | null }) {
  return <Field label="Subject"><select name="subject_id" defaultValue={defaultValue || ''}><option value="">No subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>;
}
