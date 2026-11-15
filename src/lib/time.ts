import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export function dayKey(value: Date | string | number, timezone: string) {
  return formatInTimeZone(value, timezone, 'yyyy-MM-dd');
}
export function shiftDay(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function weekStart(key: string) {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return shiftDay(key, -(day === 0 ? 6 : day - 1));
}
export function dateLabel(key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));
}
export function timeLabel(value: string, timezone: string) {
  return formatInTimeZone(value, timezone, 'h:mm a');
}
export function localInput(value: string | Date, timezone: string) {
  return formatInTimeZone(value, timezone, "yyyy-MM-dd'T'HH:mm");
}
export function inputToISO(value: string, timezone: string) {
  const result = fromZonedTime(value, timezone);
  if (Number.isNaN(result.getTime())) throw new Error('Choose a valid date and time.');
  // A spring-forward gap is not a real local time; reject it instead of shifting silently.
  if (localInput(result, timezone) !== value) throw new Error('This time does not exist in your time zone. Choose a different time.');
  return result.toISOString();
}
export function duration(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}
export function clock(seconds: number) {
  const value = Math.floor(Math.max(0, seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(v => String(v).padStart(2, '0')).join(':');
}
