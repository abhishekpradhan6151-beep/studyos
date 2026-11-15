import { authRedirect } from '@/lib/auth-redirect';
import { serverDb } from '@/lib/supabase/server';
import { safeNext } from '@/lib/validation';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){const db=await serverDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return authRedirect(safeNext(url.searchParams.get('next')));}return authRedirect('/login?error=auth');}
