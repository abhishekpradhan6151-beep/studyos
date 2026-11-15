'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Sparkles, CalendarDays, CheckSquare, NotebookPen, Target, ChartNoAxesColumn, Settings, LogOut, Menu, X, ArrowUpRight, Pause, Play, Flame } from 'lucide-react';
import { useTheme } from 'next-themes';
import { browserDb } from '@/lib/supabase/client';
import { messageOf } from '@/lib/errors';
import { clock } from '@/lib/time';
import { sessionSeconds } from '@/lib/analytics';
import { useRows, useRefresh, useWorkspace } from './workspace-provider';
import { useToast } from './providers';

export const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/planner', label: 'Study Planner', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/goals', label: 'Goals & Habits', icon: Target },
  { href: '/analytics', label: 'Analytics', icon: ChartNoAxesColumn },
  { href: '/settings', label: 'Settings', icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const { profile, email } = useWorkspace(); const notify = useToast();
  const [open, setOpen] = useState(false); const [signingOut, setSigningOut] = useState(false);
  const [mobile, setMobile] = useState(false); const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => { const media = matchMedia('(max-width: 767px)'); const update = () => setMobile(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const { theme, setTheme } = useTheme(); const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select') || []).filter(e => e.offsetParent !== null);
    items()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') { const list = items(); const first = list[0], last = list.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); previous?.focus(); };
  }, [open, mobile]);
  async function signOut() {
    setSigningOut(true);
    const { error } = await browserDb().auth.signOut();
    if (error) { notify(messageOf(error), 'error'); setSigningOut(false); return; }
    router.replace('/login'); router.refresh();
  }
  const name = profile.display_name || 'Your workspace';
  return <div className="workspace">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="workspace-sidebar" ref={sidebarRef} className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Workspace navigation" inert={mobile && !open} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined}>
      <Link href="/dashboard" className="brand"><span className="brand-mark">S</span><span className="brand-name">StudyOS<span className="brand-dot" /></span></Link>
      <button className="icon-btn nav-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
      <p className="nav-label">WORKSPACE</p>
      <nav>{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${path === href ? 'active' : ''}`} aria-current={path === href ? 'page' : undefined} title={label}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{href === '/assistant' && <span className="ai-dot" />}</Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="small"><Flame size={16} /> One day at a time.</span><p>Small, steady steps.<br />Meaningful progress.</p><Link href="/planner">Make space to focus <ArrowUpRight size={14} /></Link></div>
        <label className="theme-select"><span>Appearance</span><select aria-label="Appearance" value={mounted ? theme : 'system'} onChange={e => setTheme(e.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <div className="account"><span className="avatar">{(profile.display_name || email || 'S').slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{email}</small></div><button className="icon-btn" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={signOut}><LogOut size={17} /></button></div>
      </div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><span>My workspace</span><span>/</span><strong>{navigation.find(n => n.href === path)?.label || 'StudyOS'}</strong></div><span className="workspace-status"><span />Your personal space</span></header><FocusBanner /><main id="main-content" className="page-content" tabIndex={-1}>{children}</main><footer className="workspace-footer"><span>Make room for what matters.</span><span>StudyOS</span></footer></div>
    <nav className="mobile-nav" aria-label="Quick navigation">{navigation.slice(0, 4).map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={path === href ? 'active' : ''}><Icon size={21} /><span>{label === 'Study Planner' ? 'Planner' : label === 'AI Assistant' ? 'AI' : label === 'Dashboard' ? 'Home' : label}</span></Link>)}<button aria-expanded={open} aria-controls="workspace-sidebar" aria-label="More navigation" onClick={() => setOpen(!open)}><Menu size={21} /><span>More</span></button></nav>
  </div>;
}
function FocusBanner() {
  const sessions = useRows('study_sessions'); const refresh = useRefresh(); const notify = useToast();
  const running = sessions.data?.find(s => s.status === 'running');
  const [now, setNow] = useState(0); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!running) return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [running]);
  if (!running) return null;
  async function pause() { if (!running) return; setBusy(true); const { error } = await browserDb().rpc('transition_study_session', { p_id: running.id, p_action: 'pause' }); if (error) notify(messageOf(error), 'error'); else await refresh('study_sessions', 'study_intervals'); setBusy(false); }
  return <div className="focus-banner"><span><Play size={14} fill="currentColor" /><Link href="/planner">{running.title}</Link></span><strong className="mono">{clock(sessionSeconds(running, now))}</strong><button onClick={pause} disabled={busy}><Pause size={15} />Pause</button></div>;
}
