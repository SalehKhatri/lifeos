import type { ScheduleBlock } from "@/types";

export interface LaidOutBlock {
  block: ScheduleBlock;
  lane: number;
  laneCount: number;
}

// Standard calendar-column layout: blocks that overlap in time get placed
// in side-by-side "lanes" within the day instead of stacking unreadably on
// top of each other. Greedy assignment within each overlap cluster (blocks
// sorted by start time, each takes the first lane whose current occupant
// has already ended) — simple, and correct enough for a personal
// schedule's realistic overlap counts. This isn't solving optimal
// interval-graph column-packing for enterprise-calendar-scale density.
export function layoutDayBlocks(blocks: ScheduleBlock[]): LaidOutBlock[] {
  const sorted = [...blocks].sort((a, b) => a.startTime - b.startTime);

  function overlaps(a: ScheduleBlock, b: ScheduleBlock) {
    return a.startTime < b.endTime && b.startTime < a.endTime;
  }

  // Group into overlap clusters first, so unrelated blocks elsewhere in the
  // day don't inflate each other's lane count. A block can bridge two
  // clusters that don't directly overlap each other (A-C overlap, B-C
  // overlap, A-B don't) — the merge pass below catches that.
  const clusters: ScheduleBlock[][] = [];
  for (const block of sorted) {
    const cluster = clusters.find((c) => c.some((b) => overlaps(b, block)));
    if (cluster) {
      cluster.push(block);
    } else {
      clusters.push([block]);
    }
  }
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].some((a) => clusters[j].some((b) => overlaps(a, b)))) {
          clusters[i] = [...clusters[i], ...clusters[j]];
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  const result: LaidOutBlock[] = [];
  for (const cluster of clusters) {
    const clusterSorted = [...cluster].sort((a, b) => a.startTime - b.startTime);
    const laneEnds: number[] = []; // endTime currently occupying each lane
    const assigned: { block: ScheduleBlock; lane: number }[] = [];
    for (const block of clusterSorted) {
      let lane = laneEnds.findIndex((end) => end <= block.startTime);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(block.endTime);
      } else {
        laneEnds[lane] = block.endTime;
      }
      assigned.push({ block, lane });
    }
    const laneCount = laneEnds.length;
    for (const { block, lane } of assigned) {
      result.push({ block, lane, laneCount });
    }
  }
  return result;
}
