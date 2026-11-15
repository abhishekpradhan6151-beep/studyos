import { redirect } from 'next/navigation';
import { serverDb } from '@/lib/supabase/server';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const db = await serverDb();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw new Error('Your profile could not be loaded. Please try again.');
  if (!profile?.onboarded) redirect('/onboarding');
  return <WorkspaceProvider userId={user.id} email={user.email || ''} profile={profile}><AppShell>{children}</AppShell></WorkspaceProvider>;
}
