import type { Compound, DriveMode, StrategyOption, Track, TyrePlan } from "./types";

export const COMPOUNDS: Record<Compound, { pace: number; deg: number; life: number; label: string }> = {
  S: { pace: -0.55, deg: 0.11, life: 16, label: "Soft" },
  M: { pace: 0, deg: 0.06, life: 27, label: "Medium" },
  H: { pace: 0.4, deg: 0.035, life: 42, label: "Hard" },
  I: { pace: 0, deg: 0.05, life: 30, label: "Inter" },
  W: { pace: 0, deg: 0.04, life: 40, label: "Wet" },
};

// Driving modes: pace (s/lap), tyre wear, mistake risk and energy use multipliers.
export const MODES: Record<DriveMode, { pace: number; wear: number; risk: number; energy: number; label: string }> = {
  save: { pace: 0.35, wear: 0.8, risk: 0.6, energy: 0.7, label: "Save" },
  normal: { pace: 0, wear: 1, risk: 1, energy: 1, label: "Normal" },
  push: { pace: -0.25, wear: 1.3, risk: 1.6, energy: 1.3, label: "Push" },
};

// Driving the whole race in Normal uses this share of the energy store.
export const NORMAL_ENERGY_USE = 95;
export const CLIPPING_PENALTY = 1.5;

// How hard a driver/car combination is on its tyres (lower = kinder).
export const degFactor = (tyreMgmt: number, tyreKind: number) =>
  (1.25 - (0.5 * tyreMgmt) / 100) * (1.25 - (0.5 * tyreKind) / 100);

export const lifeLaps = (cmp: Compound, track: Track, df: number) => COMPOUNDS[cmp].life / track.deg / df;

// Seconds lost to wear at a given effective tyre age (includes the cliff once past the tyre's life).
export function wearPenalty(cmp: Compound, age: number, track: Track, df: number): number {
  const life = lifeLaps(cmp, track, df);
  let t = age * COMPOUNDS[cmp].deg * track.deg * df;
  if (age > life) t += (age - life) * 0.25;
  return t;
}

// 1 = fresh, 0 = end of useful life, negative = over the cliff.
export const tyreHealth = (cmp: Compound, age: number, track: Track, df: number) => 1 - age / lifeLaps(cmp, track, df);

function stintCost(cmp: Compound, laps: number, track: Track, df: number) {
  let t = 0;
  for (let a = 0; a < laps; a++) t += COMPOUNDS[cmp].pace + wearPenalty(cmp, a, track, df);
  return t;
}

// Estimated time spent on tyres and in the pits. Extra stops also cost track position on hard-to-pass tracks.
export function estimatePlan(plan: TyrePlan, track: Track, df: number): number {
  const bounds = [0, ...plan.pitLaps, track.laps];
  let t = 0;
  for (let i = 0; i < plan.stints.length; i++) t += stintCost(plan.stints[i], bounds[i + 1] - bounds[i], track, df);
  return t + plan.pitLaps.length * (track.pitLoss + (track.overtaking - 2) * 4);
}

function optimise(stints: Compound[], track: Track, df: number): number[] {
  const L = track.laps;
  const stops = stints.length - 1;
  const minStint = 4;
  let best: number[] = [];
  let bestT = Infinity;
  const tryLaps = (laps: number[]) => {
    const t = estimatePlan({ stints, pitLaps: laps }, track, df);
    if (t < bestT) { bestT = t; best = laps; }
  };
  const step = stops >= 3 ? 3 : stops === 2 ? 2 : 1;
  const rec = (from: number, acc: number[]) => {
    if (acc.length === stops) { tryLaps(acc); return; }
    const remainingStops = stops - acc.length;
    for (let l = from + minStint; l <= L - minStint * remainingStops; l += step) rec(l, [...acc, l]);
  };
  rec(0, []);
  // Local refinement of each stop by ±2 laps
  for (let i = 0; i < best.length; i++) {
    for (const d of [-2, -1, 1, 2]) {
      const laps = [...best];
      laps[i] += d;
      const ok = laps.every((l, j) => l >= (j ? laps[j - 1] : 0) + minStint) && laps[laps.length - 1] <= L - minStint;
      if (ok) tryLaps(laps);
    }
  }
  return best;
}

const CANDIDATES: Compound[][] = [
  ["M", "H"], ["H", "M"], ["S", "H"], ["S", "M"],
  ["S", "M", "M"], ["M", "H", "M"], ["S", "H", "S"], ["S", "M", "S"], ["M", "M", "H"],
  ["S", "M", "S", "M"], ["S", "S", "M", "S"],
];

const stopsLabel = (n: number) => `${n}-stop`;
const compoundsLabel = (s: Compound[]) => s.map((c) => COMPOUNDS[c].label).join(" → ");

// The 4–5 most competitive dry strategies for this car at this track, fastest first.
export function strategyOptions(track: Track, df: number, count = 5): StrategyOption[] {
  const all = CANDIDATES.map((stints, i): StrategyOption => {
    const pitLaps = optimise(stints, track, df);
    return {
      id: `s${i}`,
      name: `${stopsLabel(stints.length - 1)} · ${compoundsLabel(stints)}`,
      stints, pitLaps,
      estTime: estimatePlan({ stints, pitLaps }, track, df),
      windows: [],
    };
  }).sort((a, b) => a.estTime - b.estTime);
  // Keep variety: the best plan of each stop count first, then the next fastest.
  const picked: StrategyOption[] = [];
  for (const n of [2, 3, 4]) {
    const s = all.find((x) => x.stints.length === n);
    if (s && s.estTime - all[0].estTime < 40) picked.push(s);
  }
  for (const s of all) if (picked.length < count && !picked.includes(s)) picked.push(s);
  picked.sort((a, b) => a.estTime - b.estTime);
  for (const s of picked) s.windows = pitWindows(s.pitLaps, track.laps);
  return picked.slice(0, count);
}

export function pitWindows(pitLaps: number[], laps: number): [number, number][] {
  return pitLaps.map((l) => [Math.max(3, l - 10), Math.min(laps - 3, l + 10)]);
}

// Keep stops in order with a minimum stint length.
export function clampPitLaps(pitLaps: number[], laps: number): number[] {
  const out = [...pitLaps];
  for (let i = 0; i < out.length; i++) {
    const min = (i ? out[i - 1] : 0) + 3;
    const max = laps - 3 * (out.length - i);
    out[i] = Math.max(min, Math.min(max, Math.round(out[i])));
  }
  return out;
}
