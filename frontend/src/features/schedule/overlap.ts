import type { ScheduleBlock } from "@/types";

// The backend deliberately doesn't prevent overlapping blocks on the same
// day (see docs/MVP_SPEC.md #4 — left to the recommendation engine's
// interval merging, not Schedule's job at write time). That doesn't mean
// the user shouldn't be told about it — this is purely client-side, a
// warning, not a validation rule.
//
// O(n^2) pairwise check, not sort-then-check-adjacent-pairs: two intervals
// can overlap without being adjacent after sorting by start time (e.g. a
// long 9am-5pm block and a short 12-1pm block nested inside it, with a
// third unrelated block in between) — adjacency alone would miss that.
// Block counts per day are small enough (a handful) that O(n^2) is free.
export function findOverlappingIds(blocks: ScheduleBlock[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}
