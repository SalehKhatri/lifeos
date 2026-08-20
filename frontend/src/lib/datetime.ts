// Conversions between ISO instants (what the API sends/expects) and the
// value shape <input type="datetime-local"> needs — "YYYY-MM-DDTHH:mm",
// interpreted by the browser as local wall-clock time (no timezone suffix).

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Returns undefined for an empty/invalid value — callers decide whether that
// means "unchanged" (omit from the update payload) or "cleared" (send null).
export function fromDatetimeLocalValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export type DeadlineUrgency = "overdue" | "due-today" | "normal";

// Deadline urgency is a *time* signal (objective, ticks forward on its own),
// distinct from Priority (a *user* signal) — surfaced separately in the task
// list so a LOW-priority task that's actually overdue still stands out.
// Calendar-day comparison (not a rolling 24h window), matching the
// Prioritization Engine's own local-day bucketing on the backend.
export function getDeadlineUrgency(
  deadline: string | null | undefined,
  done: boolean,
): DeadlineUrgency {
  if (!deadline || done) return "normal";
  const now = new Date();
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return "normal";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadlineDay = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  if (dl.getTime() < now.getTime()) return "overdue";
  if (startOfDeadlineDay.getTime() === startOfToday.getTime()) return "due-today";
  return "normal";
}
