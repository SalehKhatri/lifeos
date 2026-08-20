// Conversions for ScheduleBlock.startTime/endTime, which the backend stores
// as plain minutes-since-midnight (0-1439) — see docs/PROGRESS.md's Decisions
// Log, 2026-08-16: chosen for simple arithmetic in the recommendation
// engine's duration-fit math, not a time/string DB type. These helpers
// convert that int to/from what <input type="time"> needs ("HH:MM", 24h)
// and to a human-readable 12h display string.

// The backend's own timeSchema caps startTime/endTime at 1439 (z.number()
// .max(1439)) — minutes 0-1439 span one day, there's no minute 1440 (that's
// minute 0 of the next day). Exported so a "spans midnight" split
// (features/schedule/components/schedule-form-sheet.tsx) can compute the
// correct end-of-day boundary without a magic number.
export const MINUTES_PER_DAY = 1440;

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Returns undefined for anything that isn't a well-formed "HH:MM" — native
// <input type="time"> only ever produces that shape (or ""), but callers
// should still treat this as fallible rather than assume.
export function timeInputToMinutes(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return undefined;
  return h * 60 + m;
}

export function formatClockTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Compact hour-only label for the calendar grid's time axis ("8 AM", not
// "8:00 AM" — the grid's rows are already one per hour, so the ":00" is
// redundant there in a way it isn't for formatClockTime's other callers).
export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// 0 = Sunday ... 6 = Saturday — matches both the backend's ScheduleBlock
// convention and JS's own Date.getDay(), so "today" needs no remapping.
export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
