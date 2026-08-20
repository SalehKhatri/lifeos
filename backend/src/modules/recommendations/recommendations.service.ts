import { getProfile } from "../auth";
import { getRecommendableTasks } from "../tasks";
import { listScheduleBlocks } from "../schedule";
import { ProjectStatus } from "../../../generated/prisma/enums";
import { getLocalDayAndMinutes } from "../../shared/utils/timezone";
import { scoreUrgency, scorePriority, scoreFit, combinedScore, buildReason } from "./scoring";

// Tasks under a paused/archived project shouldn't surface as "what to work
// on right now" — user-confirmed 2026-08-18, see docs/PROGRESS.md.
const EXCLUDED_PROJECT_STATUSES: Set<string> = new Set([
  ProjectStatus.ON_HOLD,
  ProjectStatus.ARCHIVED,
]);

const MINUTES_PER_DAY = 1440;

// Bug fixed 2026-08-19 (user-reported: showed 4h50m "free" while actually
// busy with commitments covering most of the morning): this was summing
// not-yet-elapsed *commitment* minutes and returning that as the "available"
// figure — i.e. it returned how busy you are, not how free you are. Actual
// available time is what's left in the day minus what's already committed.
function computeAvailableMinutesToday(
  blocks: { startTime: number; endTime: number }[],
  nowMinutes: number,
): number {
  let busy = 0;
  for (const block of blocks) {
    if (block.endTime <= nowMinutes) {
      continue; // already fully elapsed today
    }
    const remainingStart = Math.max(block.startTime, nowMinutes);
    busy += block.endTime - remainingStart;
  }
  const remainingToday = MINUTES_PER_DAY - nowMinutes;
  return Math.max(0, remainingToday - busy);
}

// `now` is a parameter (not read internally) so this stays deterministic and testable.
export async function getRankedRecommendations(userId: string, now: Date = new Date()) {
  const user = await getProfile(userId);
  const { dayOfWeek, minutes: nowMinutes } = getLocalDayAndMinutes(now, user.timezone);

  const [tasks, todaysBlocks] = await Promise.all([
    getRecommendableTasks(userId),
    listScheduleBlocks(userId, { dayOfWeek }),
  ]);

  const availableMinutesToday = computeAvailableMinutesToday(todaysBlocks, nowMinutes);

  const eligibleTasks = tasks.filter(
    (task) => !task.project || !EXCLUDED_PROJECT_STATUSES.has(task.project.status),
  );

  const ranked = eligibleTasks.map((task) => {
    const urgency = scoreUrgency(task.deadline, now, user.timezone);
    const priority = scorePriority(task.priority);
    const fit = scoreFit(task.estimatedDuration, availableMinutesToday);
    const score = combinedScore(urgency.score, priority, fit);
    const reason = buildReason({
      urgency,
      priority: task.priority,
      fitScore: fit,
      availableMinutesToday,
    });

    return { ...task, score: Math.round(score * 10) / 10, reason };
  });

  // Deterministic tie-break beyond score: earlier deadline first (no deadline
  // last), then older task first — never leave ties to insertion-order luck.
  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aDeadline = a.deadline?.getTime() ?? Infinity;
    const bDeadline = b.deadline?.getTime() ?? Infinity;
    if (aDeadline !== bDeadline) {
      return aDeadline - bDeadline;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return { tasks: ranked, availableMinutesToday };
}
