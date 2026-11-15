import Link from 'next/link';
export default function NotFound(){return <main className="standalone"><h1>That page isn’t here.</h1><p className="muted">Let’s get you back to your workspace.</p><Link className="btn btn-primary" href="/dashboard">Go to dashboard</Link></main>;}
