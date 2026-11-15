'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRows, useWorkspace } from './workspace-provider';
import { activityByDay, sessionSeconds } from '@/lib/analytics';
import { dateLabel, duration } from '@/lib/time';

export function useActivity() {
  const intervals = useRows('study_intervals'); const sessions = useRows('study_sessions'); const { profile } = useWorkspace();
  const [now, setNow] = useState(() => Date.now());
  const running = sessions.data?.find(s => s.status === 'running');
  useEffect(() => { if (!running) return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, [running]);
  const days = useMemo(() => {
    const list = [...(intervals.data || [])];
    if (running?.running_started_at) list.push({ id: 'running', user_id: running.user_id, session_id: running.id, created_at: running.running_started_at, started_at: running.running_started_at, ended_at: new Date(now).toISOString(), seconds: sessionSeconds(running, now) - running.actual_seconds });
    return activityByDay(list, profile.timezone);
  }, [intervals.data, running, now, profile.timezone]);
  return { days, intervals, sessions, isPending: intervals.isPending || sessions.isPending, error: intervals.error || sessions.error, refetch: () => { void intervals.refetch(); void sessions.refetch(); } };
}
export function ActivityBars({ keys, days, today }: { keys: string[]; days: Record<string, number>; today: string }) {
  const max = Math.max(60, ...keys.map(key => days[key] || 0));
  return <div className="activity-bars" role="img" aria-label={keys.map(key => `${dateLabel(key)}: ${duration(days[key] || 0)}`).join(', ')}>{keys.map(key => <div key={key} className={`activity-bar-col ${key === today ? 'today' : ''}`}><div className="bar" style={{ height: `${Math.max(1, (days[key] || 0) / max * 100)}%` }} title={`${dateLabel(key)} · ${duration(days[key] || 0)}`} /><span>{dateLabel(key, { weekday: 'short' })}</span></div>)}</div>;
}
