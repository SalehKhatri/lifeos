import { TaskPriority } from "../../../generated/prisma/enums";
import { daysBetweenLocalDates } from "../../shared/utils/timezone";

// --- Weights & buckets --------------------------------------------------
// All somewhat arbitrary judgment calls — the easiest part of this file to
// retune later. See docs/PROGRESS.md Decisions Log for the reasoning.

const WEIGHTS = { urgency: 0.45, priority: 0.3, fit: 0.25 };

const PRIORITY_SCORES: Record<string, number> = {
  [TaskPriority.LOW]: 25,
  [TaskPriority.MEDIUM]: 50,
  [TaskPriority.HIGH]: 75,
  [TaskPriority.URGENT]: 100,
};

export interface UrgencyResult {
  score: number;
  isOverdue: boolean;
  daysUntil: number | null; // null = no deadline
}

// Bucketed (not a continuous decay curve) — buckets map cleanly to both a
// score and a plain-language reason. Buckets by LOCAL CALENDAR DAY distance
// ("due today" = before local midnight tonight), not a rolling 24h window —
// that's the whole reason User.timezone exists. Overdue is instant-based
// (deadline already passed), independent of the day bucket.
export function scoreUrgency(deadline: Date | null, now: Date, timezone: string): UrgencyResult {
  if (!deadline) {
    return { score: 10, isOverdue: false, daysUntil: null };
  }

  const isOverdue = deadline.getTime() < now.getTime();
  const daysUntil = daysBetweenLocalDates(now, deadline, timezone);

  if (isOverdue) {
    return { score: 100, isOverdue: true, daysUntil };
  }
  if (daysUntil === 0) return { score: 90, isOverdue: false, daysUntil };
  if (daysUntil === 1) return { score: 70, isOverdue: false, daysUntil };
  if (daysUntil <= 3) return { score: 50, isOverdue: false, daysUntil };
  if (daysUntil <= 7) return { score: 30, isOverdue: false, daysUntil };
  return { score: 10, isOverdue: false, daysUntil };
}

export function scorePriority(priority: string): number {
  return PRIORITY_SCORES[priority] ?? 50;
}

// Tasks that fit comfortably in remaining time today score high; tasks that
// need more time than's left score lower (never excluded — a big urgent
// task may still be worth starting).
export function scoreFit(estimatedDuration: number, availableMinutesToday: number): number {
  if (availableMinutesToday <= 0) {
    return 0;
  }
  return Math.min(100, (availableMinutesToday / estimatedDuration) * 100);
}

export function combinedScore(urgency: number, priority: number, fit: number): number {
  return WEIGHTS.urgency * urgency + WEIGHTS.priority * priority + WEIGHTS.fit * fit;
}

export function buildReason(input: {
  urgency: UrgencyResult;
  priority: string;
  fitScore: number;
  availableMinutesToday: number;
}): string {
  const parts: string[] = [];

  if (input.urgency.isOverdue) {
    const daysOverdue = input.urgency.daysUntil !== null ? -input.urgency.daysUntil : 0;
    parts.push(
      daysOverdue > 0 ? `overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}` : "overdue",
    );
  } else if (input.urgency.daysUntil === 0) {
    parts.push("due today");
  } else if (input.urgency.daysUntil === 1) {
    parts.push("due tomorrow");
  } else if (input.urgency.daysUntil !== null && input.urgency.daysUntil <= 3) {
    parts.push(`due in ${input.urgency.daysUntil} days`);
  }

  if (input.priority === TaskPriority.URGENT) {
    parts.push("urgent priority");
  } else if (input.priority === TaskPriority.HIGH) {
    parts.push("high priority");
  }

  if (input.fitScore >= 100) {
    parts.push("fits your available time");
  } else if (input.fitScore < 40 && input.availableMinutesToday > 0) {
    parts.push("longer than your remaining time today");
  }

  if (parts.length === 0) {
    return "Ranked by priority and deadline";
  }

  const joined = parts.join(" • ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
