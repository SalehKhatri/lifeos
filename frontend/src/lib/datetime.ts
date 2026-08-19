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
