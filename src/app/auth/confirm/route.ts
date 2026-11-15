import { authRedirect } from '@/lib/auth-redirect';
import { serverDb } from '@/lib/supabase/server';
export async function GET(request:Request){const url=new URL(request.url);const token_hash=url.searchParams.get('token_hash');const type=url.searchParams.get('type');if(token_hash&&(type==='email'||type==='signup'||type==='recovery')){const db=await serverDb();const {error}=await db.auth.verifyOtp({token_hash,type});if(!error)return authRedirect(type==='recovery'?'/reset-password':'/dashboard');}return authRedirect('/login?error=auth');}
