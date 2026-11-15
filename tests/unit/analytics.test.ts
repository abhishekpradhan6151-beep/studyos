import { describe, expect, it } from 'vitest';
import { activityByDay, habitCompletion, habitProgress, sessionSeconds, studyStreak } from '@/lib/analytics';
import { inputToISO, shiftDay, weekStart } from '@/lib/time';
import type { Habit, HabitEntry, StudySession } from '@/lib/types';
const habit = { id: 'h', user_id: 'u', created_at: '2026-11-11T00:00:00Z', title: 'Read', frequency: 'daily', weekly_target: 7, archived: false } as Habit;
const entries = (dates: string[]) => dates.map((date, i) => ({ id: String(i), user_id: 'u', habit_id: 'h', completed_on: date, created_at: `${date}T10:00:00Z` } as HabitEntry));
describe('study activity', () => {
  it('splits focus at local midnight', () => { expect(activityByDay([{ started_at: '2026-11-14T18:00:00Z', ended_at: '2026-11-14T19:00:00Z', seconds: 3600 }], 'Asia/Kolkata')).toEqual({ '2026-11-14': 1800, '2026-11-15': 1800 }); });
  it('handles a 25-hour DST day without dropping an hour', () => { expect(activityByDay([{ started_at: '2026-11-01T04:00:00Z', ended_at: '2026-11-02T05:00:00Z', seconds: 90000 }], 'America/New_York')).toEqual({ '2026-11-01': 90000 }); });
  it('handles a 23-hour DST day', () => { expect(activityByDay([{ started_at: '2026-03-08T05:00:00Z', ended_at: '2026-03-09T04:00:00Z', seconds: 82800 }], 'America/New_York')).toEqual({ '2026-03-08': 82800 }); });
  it('uses recorded duration rather than an inflated end timestamp', () => { expect(activityByDay([{ started_at: '2026-11-14T10:00:00Z', ended_at: '2026-11-14T22:00:00Z', seconds: 60 }], 'UTC')).toEqual({ '2026-11-14': 60 }); });
  it('does not count invalid or negative intervals', () => { expect(activityByDay([{ started_at: 'invalid', ended_at: 'invalid', seconds: 5 }, { started_at: '2026-11-14T10:00:00Z', ended_at: '2026-11-14T09:00:00Z', seconds: 60 }], 'UTC')).toEqual({}); });
  it('keeps a streak alive until today is over, but skips sub-minute records', () => { expect(studyStreak({ '2026-11-14': 60, '2026-11-13': 120, '2026-11-12': 59 }, '2026-11-15')).toBe(2); expect(studyStreak({ '2026-11-13': 100 }, '2026-11-15')).toBe(0); });
  it('caps a forgotten running segment and total session duration', () => { const s = { running_started_at: '2026-11-14T00:00:00Z', actual_seconds: 0 } as StudySession; expect(sessionSeconds(s, Date.parse('2026-11-15T00:00:00Z'))).toBe(28800); expect(sessionSeconds({ ...s, actual_seconds: 86000 }, Date.parse('2026-11-15T00:00:00Z'))).toBe(86400); expect(sessionSeconds(s, 0)).toBe(0); });
});
describe('habits', () => {
  it('deduplicates check-ins and calculates daily streaks', () => { const p = habitProgress(habit, entries(['2026-11-13', '2026-11-14', '2026-11-14']), '2026-11-15'); expect(p.streak).toBe(2); expect(p.thisWeek).toBe(2); expect(p.checkedToday).toBe(false); });
  it('counts consecutive weekly targets without penalizing an unfinished current week', () => { const p = habitProgress({ ...habit, frequency: 'weekly', weekly_target: 2 }, entries(['2026-10-28', '2026-10-29', '2026-11-03', '2026-11-04', '2026-11-10']), '2026-11-11'); expect(p.streak).toBe(2); expect(p.count).toBe(1); });
  it('counts only elapsed eligible days since habit creation', () => { expect(habitCompletion([habit], entries(['2026-11-11', '2026-11-12', '2026-11-16']), '2026-11-12', 'UTC')).toEqual({ done: 2, expected: 2, rate: 100 }); });
  it('does not invent rates for an empty workspace', () => { expect(habitCompletion([], [], '2026-11-15', 'UTC').rate).toBeNull(); expect(habitCompletion([{ ...habit, archived: true }], [], '2026-11-15', 'UTC').expected).toBe(0); });
});
describe('calendar boundaries', () => {
  it('uses Monday weeks across month boundaries', () => { expect(weekStart('2026-11-01')).toBe('2026-10-26'); expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01'); });
  it('converts local planner times and rejects DST gaps', () => { expect(inputToISO('2026-11-15T09:00', 'Asia/Kolkata')).toBe('2026-11-15T03:30:00.000Z'); expect(() => inputToISO('2026-03-08T02:30', 'America/New_York')).toThrow('does not exist'); });
});
