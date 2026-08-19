// Generic, business-rule-free timezone/calendar helpers — no new date library
// needed, Intl.DateTimeFormat already resolves DST/aliases correctly (see
// modules/auth's timezone validator for the same reasoning).

function getDateTimeParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // avoids the "24:00 at midnight" quirk some hour12:false paths hit
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;

  return {
    weekday: get("weekday"),
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// day_of_week (0=Sunday...6=Saturday, matching ScheduleBlock) + minutes since
// midnight, both in the given timezone, for a given instant.
export function getLocalDayAndMinutes(date: Date, timezone: string) {
  const p = getDateTimeParts(date, timezone);
  const dayOfWeek = WEEKDAY_TO_INDEX[p.weekday ?? "Sun"] ?? 0;
  const minutes = p.hour * 60 + p.minute;
  return { dayOfWeek, minutes };
}

// Whole-day difference between two instants' local calendar dates in the
// given timezone (b's date minus a's date). Deliberately date-only —
// deadline urgency buckets by calendar day, not by hour ("due today" means
// "before local midnight tonight", not "within the next 24 hours").
export function daysBetweenLocalDates(a: Date, b: Date, timezone: string): number {
  const pa = getDateTimeParts(a, timezone);
  const pb = getDateTimeParts(b, timezone);
  const utcA = Date.UTC(pa.year, pa.month - 1, pa.day);
  const utcB = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}
