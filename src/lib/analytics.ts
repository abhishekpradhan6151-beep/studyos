import { fromZonedTime } from 'date-fns-tz';
import { dayKey, shiftDay, weekStart } from './time';
import type { Habit, HabitEntry, StudySession } from './types';

export type Interval = { started_at: string; ended_at: string; seconds: number };
export function sessionSeconds(session: StudySession, now = Date.now()) {
  const live = session.running_started_at ? Math.min(28800, Math.max(0, Math.floor((now - Date.parse(session.running_started_at)) / 1000))) : 0;
  return Math.min(86400, session.actual_seconds + live);
}
// Split at local midnight, including 23/25-hour daylight-saving days.
export function activityByDay(intervals: Interval[], timezone: string) {
  const days: Record<string, number> = {};
  for (const interval of intervals) {
    let cursor = Date.parse(interval.started_at);
    const end = Math.min(Date.parse(interval.ended_at), cursor + interval.seconds * 1000);
    if (!Number.isFinite(cursor) || !Number.isFinite(end) || end <= cursor) continue;
    while (cursor < end) {
      const key = dayKey(cursor, timezone);
      const midnight = fromZonedTime(`${shiftDay(key, 1)}T00:00:00`, timezone).getTime();
      const next = Math.min(end, midnight);
      if (next <= cursor) break;
      days[key] = (days[key] || 0) + (next - cursor) / 1000;
      cursor = next;
    }
  }
  return days;
}
export function studyStreak(days: Record<string, number>, today: string) {
  let cursor = (days[today] || 0) >= 60 ? today : shiftDay(today, -1);
  let count = 0;
  while ((days[cursor] || 0) >= 60) { count++; cursor = shiftDay(cursor, -1); }
  return count;
}
export function habitProgress(habit: Habit, entries: HabitEntry[], today: string) {
  const completed = new Set(entries.filter(e => e.habit_id === habit.id).map(e => e.completed_on));
  const start = weekStart(today);
  const thisWeek = [...completed].filter(d => d >= start && d <= today).length;
  let streak = 0;
  if (habit.frequency === 'daily') {
    let cursor = completed.has(today) ? today : shiftDay(today, -1);
    while (completed.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  } else {
    let cursor = thisWeek >= habit.weekly_target ? start : shiftDay(start, -7);
    while ([...completed].filter(d => d >= cursor && d < shiftDay(cursor, 7)).length >= habit.weekly_target) {
      streak++; cursor = shiftDay(cursor, -7);
    }
  }
  return { checkedToday: completed.has(today), thisWeek, streak, count: habit.frequency === 'daily' ? Number(completed.has(today)) : thisWeek, target: habit.frequency === 'daily' ? 1 : habit.weekly_target };
}
export function habitCompletion(habits: Habit[], entries: HabitEntry[], today: string, timezone: string) {
  let done = 0, expected = 0;
  const start = weekStart(today);
  for (const habit of habits.filter(h => !h.archived)) {
    const created = dayKey(habit.created_at, timezone);
    const eligible = Array.from({ length: 7 }, (_, i) => shiftDay(start, i)).filter(d => d <= today && d >= created);
    const unique = new Set(entries.filter(e => e.habit_id === habit.id && eligible.includes(e.completed_on)).map(e => e.completed_on));
    const target = habit.frequency === 'daily' ? eligible.length : Math.min(habit.weekly_target, eligible.length);
    expected += target; done += Math.min(target, unique.size);
  }
  return { done, expected, rate: expected ? Math.round(done / expected * 100) : null };
}
