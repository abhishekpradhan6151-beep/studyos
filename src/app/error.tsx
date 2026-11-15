'use client';
import { ErrorState } from '@/components/ui';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="standalone"><ErrorState error="The page could not be loaded. Your saved data is safe. Check your connection and try again." retry={reset}/></main>;}
