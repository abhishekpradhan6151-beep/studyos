import { z } from 'zod';
export const titleSchema = z.string().trim().min(1,'Enter a title.').max(200);
export const prioritySchema = z.enum(['low','medium','high']);
export const profileSchema = z.object({
  display_name: z.string().trim().max(80), academic_level: z.string().trim().max(80),
  daily_target_minutes: z.coerce.number().int().min(5).max(720),
  timezone: z.string().refine(v=>{try {new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Choose a valid time zone.'),
});
export const taskSchema = z.object({ title:titleSchema, description:z.string().max(10000), category:z.string().trim().min(1).max(80), priority:prioritySchema, due_date:z.string().nullable(), subject_id:z.uuid().nullable() });
export const noteSchema = z.object({ title:titleSchema, content:z.string().max(100000), folder:z.string().trim().min(1).max(80), pinned:z.boolean(), subject_id:z.uuid().nullable() });
export const goalSchema = z.object({ title:titleSchema,kind:z.enum(['academic','personal']),target_value:z.coerce.number().positive().max(1000000),current_value:z.coerce.number().min(0),unit:z.string().trim().min(1).max(40),due_date:z.string().nullable() }).refine(v=>v.current_value<=v.target_value,{message:'Progress cannot exceed the target.',path:['current_value']});
export const quizSchema = z.object({ title:z.string().max(200),questions:z.array(z.object({question:z.string().max(2000),options:z.array(z.string().max(1000)).length(4),correctIndex:z.number().int().min(0).max(3),explanation:z.string().max(3000)})).min(3).max(10) });
export type Quiz = z.infer<typeof quizSchema>;
export const chatSchema = z.object({ conversationId:z.uuid(),requestId:z.uuid(),message:z.string().trim().min(1).max(12000),mode:z.enum(['ask','explain','summarize','notes','quiz','practice','plan']),documentIds:z.array(z.uuid()).max(2).default([]),noteId:z.uuid().nullable().default(null) });
export function formValues(form: HTMLFormElement) { return Object.fromEntries(new FormData(form)); }
export function safeNext(next:string|null) { return next && ['/dashboard','/onboarding','/reset-password'].includes(next) ? next : '/dashboard'; }
