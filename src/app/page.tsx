import { redirect } from 'next/navigation';
import { serverDb } from '@/lib/supabase/server';
export default async function Home(){const db=await serverDb();const {data:{user}}=await db.auth.getUser();redirect(user?'/dashboard':'/login');}
