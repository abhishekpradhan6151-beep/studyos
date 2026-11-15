import { redirect } from 'next/navigation';
import { serverDb } from '@/lib/supabase/server';
import { Onboarding } from '@/components/onboarding';
export default async function OnboardingPage() {
  const db = await serverDb(); const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await db.from('profiles').select('onboarded').eq('id', user.id).maybeSingle();
  if (error) throw new Error('Unable to load your account. Please try again.');
  if (data?.onboarded) redirect('/dashboard');
  return <Onboarding />;
}
