import { effStats } from "./boosts";
import { TRACKS } from "./data/tracks";
import { withRng } from "./rng";
import { carTrackRating, combined, DIFFICULTY, driverOverall, driverQualiRating, SECONDS_PER_POINT } from "./ratings";
import { degFactor, strategyOptions } from "./tyres";
import type { Career, QualiApproach, QualiRow, Weekend } from "./types";

export const currentTrack = (c: Career) => TRACKS[c.round];

export function gridDrivers(c: Career): string[] {
  const ids: string[] = [];
  for (const t of c.teamOrder) {
    for (const d of Object.values(c.drivers)) if (d.teamId === t && !d.retired) ids.push(d.id);
  }
  return ids;
}

export function createWeekend(c: Career): Weekend {
  const track = currentTrack(c);
  return withRng(c, "rng", (rng) => {
    const willRain = rng.chance(track.rain);
    const noise = willRain ? rng.range(0.1, 0.35) : -rng.range(0, track.rain * 0.7);
    const rainForecast = Math.max(0.02, Math.min(0.9, track.rain + noise));
    const rainStartFrac = rng.range(0.2, 0.65);
    // The forecast window is centred near the real start (or a random spot if it stays dry).
    const centre = Math.round((willRain ? rainStartFrac + rng.range(-0.08, 0.08) : rng.range(0.25, 0.65)) * track.laps);
    const w: Weekend = {
      round: c.round,
      trackId: track.id,
      rainForecast,
      rainWindow: [Math.max(1, centre - 8), Math.min(track.laps, centre + 8)],
      willRain,
      rainStartFrac,
      heavyRain: rng.chance(0.6),
      qualiWet: rng.chance(track.rain * 0.5),
      gridPenalties: { ...c.pendingGridPenalties },
      boosts: [],
    };
    c.pendingGridPenalties = {};
    return w;
  });
}

const APPROACH = {
  safe: { time: 0.12, err: 0.01 },
  normal: { time: 0, err: 0.03 },
  aggressive: { time: -0.15, err: 0.09 },
};

export function runQualifying(c: Career, approach: QualiApproach): QualiRow[] {
  const w = c.weekend!;
  const track = currentTrack(c);
  const variance = DIFFICULTY[c.difficulty].variance;
  const rows = withRng(c, "rng", (rng) =>
    gridDrivers(c).map((id): QualiRow => {
      const d = c.drivers[id];
      const s = effStats(c, id);
      const team = c.teams[d.teamId!];
      let a: QualiApproach = approach;
      if (!d.isPlayer) {
        const r = rng.next();
        a = r < 0.05 ? "safe" : r < (driverOverall(d.stats) >= 82 ? 0.25 : 0.12) ? "aggressive" : "normal";
      }
      const perf = combined(carTrackRating(team.stats, track), driverQualiRating(s, w.qualiWet));
      let time = track.baseLap - 1.2 + (100 - perf) * SECONDS_PER_POINT + APPROACH[a].time;
      time += (w.qualiWet ? 4 : 0) + rng.normal() * 0.15 * (1.3 - s.consistency / 100) * variance;
      const errP = APPROACH[a].err * (1.5 - s.consistency / 100) * (w.qualiWet ? 1.8 : 1) * variance;
      if (rng.chance(errP)) {
        if (rng.chance(0.25)) return { driverId: id, time: null, note: "Crashed" };
        return { driverId: id, time: time + rng.range(0.6, 2), note: "Mistake" };
      }
      return { driverId: id, time };
    }),
  );
  rows.sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9));
  w.quali = rows;
  const me = c.drivers[c.playerDriverId];
  w.strategies = strategyOptions(track, degFactor(effStats(c, me.id).tyreMgmt, c.teams[c.playerTeamId].stats.tyreKind));
  c.phase = "strategy";
  if (rows[0].driverId === c.playerDriverId) {
    c.careerStats.poles++;
    milestone(c, "First pole position");
  }
  return rows;
}

export function startingGrid(c: Career): string[] {
  const w = c.weekend!;
  const grid = w.quali!.map((r) => r.driverId);
  // Grid penalties: move each penalised driver back by N places.
  for (const [id, n] of Object.entries(w.gridPenalties)) {
    const i = grid.indexOf(id);
    if (i < 0) continue;
    grid.splice(i, 1);
    grid.splice(Math.min(grid.length, i + n), 0, id);
  }
  return grid;
}

export function milestone(c: Career, m: string) {
  if (!c.milestones.includes(m)) {
    c.milestones.push(m);
    c.news.unshift(`🏁 Milestone: ${m}!`);
  }
}
