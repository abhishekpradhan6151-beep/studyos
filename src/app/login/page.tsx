import { AuthForm } from '@/components/auth-form';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <AuthForm key="login" mode="login" initialError={p.error==='auth'?'The sign-in link is invalid or expired. Please sign in or request a new link.':''}/>;}
