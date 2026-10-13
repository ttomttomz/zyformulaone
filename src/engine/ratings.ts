import type { Career, CarStats, Difficulty, Driver, DriverStats, Track } from "./types";
import { CAR_STATS, DRIVER_STATS } from "./types";

export const DRIVER_WEIGHTS: DriverStats = { pace: 0.25, racecraft: 0.2, consistency: 0.2, tyreMgmt: 0.15, wet: 0.1, composure: 0.1 };
export const CAR_WEIGHTS: CarStats = { power: 0.2, hsAero: 0.2, lsGrip: 0.2, braking: 0.1, tyreKind: 0.15, reliability: 0.15 };

export const DRIVER_STAT_LABEL: Record<keyof DriverStats, string> = {
  pace: "Pace", racecraft: "Racecraft", consistency: "Consistency", tyreMgmt: "Tyre Mgmt", wet: "Wet Skill", composure: "Composure",
};
export const CAR_STAT_LABEL: Record<keyof CarStats, string> = {
  power: "Power Unit", hsAero: "High-Speed Aero", lsGrip: "Low-Speed Grip", braking: "Braking", tyreKind: "Tyre Kindness", reliability: "Reliability",
};

export const STAT_MAX = 99;
export const STAT_MIN = 30;

export const driverOverall = (s: DriverStats) => DRIVER_STATS.reduce((a, k) => a + s[k] * DRIVER_WEIGHTS[k], 0);
export const carOverall = (s: CarStats) => CAR_STATS.reduce((a, k) => a + s[k] * CAR_WEIGHTS[k], 0);

// Car pace at a given track: weighted by the track's profile (reliability excluded).
export function carTrackRating(s: CarStats, track: Track): number {
  let num = 0, den = 0;
  for (const k of CAR_STATS) {
    num += s[k] * track.weights[k];
    den += track.weights[k];
  }
  return num / den;
}

export function driverRaceRating(s: DriverStats, wet: boolean): number {
  return wet ? 0.5 * s.pace + 0.35 * s.wet + 0.15 * s.consistency : 0.75 * s.pace + 0.25 * s.consistency;
}

export function driverQualiRating(s: DriverStats, wet: boolean): number {
  return wet ? 0.5 * s.pace + 0.4 * s.wet + 0.1 * s.composure : 0.85 * s.pace + 0.15 * s.composure;
}

// Seconds per lap lost per rating point below 100. ~70% car / 30% driver.
export const SECONDS_PER_POINT = 0.04;
export const CAR_SHARE = 0.7;

export const combined = (car: number, driver: number) => CAR_SHARE * car + (1 - CAR_SHARE) * driver;

export const clampStat = (v: number) => Math.max(STAT_MIN, Math.min(STAT_MAX, v));

// Cost multiplier: steep near the top so 90→91 costs ~8× 50→51.
export const costMult = (stat: number) => 1 + Math.max(0, (stat - 50) / 15) ** 2;

export function driverValue(d: Driver): number {
  const ov = driverOverall(d.stats);
  const youth = d.age <= 23 ? Math.max(0, d.potential - ov) * 0.4 : 0;
  const age = d.age >= 36 ? (d.age - 35) * 1.5 : 0;
  return ov + youth - age;
}

export const DIFFICULTY: Record<Difficulty, { income: number; aiDev: number; variance: number; label: string }> = {
  easy: { income: 1.3, aiDev: 0.8, variance: 0.8, label: "Easy" },
  normal: { income: 1, aiDev: 1, variance: 1, label: "Normal" },
  hard: { income: 0.8, aiDev: 1.2, variance: 1.2, label: "Hard" },
};

export const r1 = (n: number) => Math.round(n * 10) / 10;

export function seatedDrivers(c: Career, teamId: string): Driver[] {
  return Object.values(c.drivers).filter((d) => d.teamId === teamId && !d.retired);
}

export function teamCarOverall(c: Career, teamId: string) {
  return carOverall(c.teams[teamId].stats);
}
