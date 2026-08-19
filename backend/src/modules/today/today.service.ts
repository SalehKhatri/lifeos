import { getProfile } from "../auth";
import { getRankedRecommendations } from "../recommendations";
import { listScheduleBlocks } from "../schedule";
import { getLocalDayAndMinutes } from "../../shared/utils/timezone";

// `now` is a parameter (not read internally) so this stays deterministic and testable.
export async function getTodayView(userId: string, now: Date = new Date()) {
  const user = await getProfile(userId);
  const { dayOfWeek } = getLocalDayAndMinutes(now, user.timezone);

  const [{ tasks }, commitments] = await Promise.all([
    getRankedRecommendations(userId, now),
    listScheduleBlocks(userId, { dayOfWeek }),
  ]);

  return {
    topTask: tasks[0] ?? null,
    upNext: tasks.slice(1, 4),
    commitments,
  };
}
