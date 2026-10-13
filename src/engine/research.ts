import { Rng, withRng } from "./rng";
import type { Career, CarStat, DriverStat, ResearchLength, ResearchProject } from "./types";
import { CAR_STATS, DRIVER_STATS } from "./types";
import { CAR_STAT_LABEL, carOverall, clampStat, costMult, DIFFICULTY, DRIVER_STAT_LABEL, driverOverall, r1 } from "./ratings";

type LengthDef = { races: number; gain: number; base: number; label: string };

// Car research. Gain per race rises with length (1.0 / 1.4 / 1.8) so long-term pays more.
export const LENGTHS: Record<ResearchLength, LengthDef> = {
  short: { races: 2, gain: 2, base: 1.6, label: "Short" },
  medium: { races: 5, gain: 7, base: 4.6, label: "Medium" },
  long: { races: 10, gain: 18, base: 10.5, label: "Long" },
};

// Driver training: paid from the driver's personal money, so prices are on a salary scale.
export const DRIVER_LENGTHS: Record<ResearchLength, LengthDef> = {
  short: { races: 2, gain: 1.5, base: 0.3, label: "Short" },
  medium: { races: 5, gain: 5, base: 0.9, label: "Medium" },
  long: { races: 10, gain: 12, base: 2, label: "Long" },
};

// Driver stats sit higher than car stats, so their cost curve starts later.
export const driverCostMult = (stat: number) => 1 + Math.max(0, (stat - 60) / 20) ** 2;

export const lengthsFor = (target: "car" | "driver") => (target === "car" ? LENGTHS : DRIVER_LENGTHS);

export const SLOTS = { car: 2, driver: 1 };

export function projectCost(target: "car" | "driver", length: ResearchLength, currentStat: number): number {
  const mult = target === "car" ? costMult(currentStat) : driverCostMult(currentStat);
  return Math.round(lengthsFor(target)[length].base * mult * 100) / 100;
}

// Car research is paid by the team, driver training by the driver.
export const fundsFor = (c: Career, target: "car" | "driver") => (target === "car" ? c.teams[c.playerTeamId].budget : c.wallet);

export function currentStatValue(c: Career, target: "car" | "driver", stat: string): number {
  return target === "car"
    ? c.teams[c.playerTeamId].stats[stat as CarStat]
    : c.drivers[c.playerDriverId].stats[stat as DriverStat];
}

export function startResearch(c: Career, target: "car" | "driver", stat: CarStat | DriverStat, length: ResearchLength): string | null {
  const used = c.research.filter((p) => p.target === target).length;
  if (used >= SLOTS[target]) return "No free slot";
  if (c.research.some((p) => p.target === target && p.stat === stat)) return "Already researching this stat";
  const cost = projectCost(target, length, currentStatValue(c, target, stat));
  if (fundsFor(c, target) < cost) return target === "car" ? "Not enough team budget" : "Not enough personal money";
  if (target === "car") c.teams[c.playerTeamId].budget = r1(c.teams[c.playerTeamId].budget - cost);
  else c.wallet = Math.round((c.wallet - cost) * 100) / 100;
  const L = lengthsFor(target)[length];
  c.research.push({ id: `p${c.nextId++}`, target, stat, length, racesLeft: L.races, gain: L.gain, cost });
  return null;
}

export function ageFactor(age: number) {
  return age <= 24 ? 1.2 : age <= 32 ? 1 : 0.6;
}

function applyDriverGain(c: Career, stat: DriverStat, gain: number): number {
  const d = c.drivers[c.playerDriverId];
  let g = gain * ageFactor(d.age);
  if (driverOverall(d.stats) >= d.potential) g *= 0.25;
  const before = d.stats[stat];
  d.stats[stat] = clampStat(before + g);
  return d.stats[stat] - before;
}

// Called once per race. Returns news lines.
export function advanceResearch(c: Career): string[] {
  const out: string[] = [];
  withRng(c, "rng", (rng) => {
    const keep: ResearchProject[] = [];
    for (const p of c.research) {
      p.racesLeft--;
      if (p.racesLeft > 0) { keep.push(p); continue; }
      let gain = p.gain;
      if (p.length === "long") {
        const roll = rng.next();
        if (roll < 0.1 && !p.id.endsWith("d")) {
          p.racesLeft = 2; p.id += "d";
          out.push(`Delay: ${label(p)} needs 2 more races.`);
          keep.push(p);
          continue;
        }
        if (roll < 0.15) { gain = Math.round(gain * 0.6); out.push(`Partial result on ${label(p)}.`); }
      }
      if (p.target === "car") {
        const t = c.teams[c.playerTeamId];
        const k = p.stat as CarStat;
        const before = t.stats[k];
        t.stats[k] = clampStat(before + gain);
        out.push(`Research complete: ${label(p)} +${r1(t.stats[k] - before)}`);
      } else {
        const g = applyDriverGain(c, p.stat as DriverStat, gain);
        out.push(`Training complete: ${label(p)} +${r1(g)}`);
      }
    }
    c.research = keep;
  });
  return out;
}

export function projectLabel(p: ResearchProject) {
  return `${label(p)} +${p.gain}`;
}

function label(p: ResearchProject) {
  const name = p.target === "car" ? CAR_STAT_LABEL[p.stat as CarStat] : DRIVER_STAT_LABEL[p.stat as DriverStat];
  return `${name} (${lengthsFor(p.target)[p.length].label.toLowerCase()})`;
}

// When the player leaves a team, unfinished car projects are completed pro-rata for that team.
export function settleCarProjects(c: Career, teamId: string) {
  for (const p of c.research.filter((x) => x.target === "car")) {
    const L = lengthsFor(p.target)[p.length];
    const done = (L.races - p.racesLeft) / L.races;
    const k = p.stat as CarStat;
    c.teams[teamId].stats[k] = clampStat(c.teams[teamId].stats[k] + p.gain * done);
  }
  c.research = c.research.filter((x) => x.target === "driver");
}

// AI teams spend their budget on development. They are less efficient than a focused player
// (AI_EFFICIENCY), which lets the player team climb while the top stays competitive.
const AI_EFFICIENCY = 0.4;
// AI price per stat point at multiplier 1 (decoupled from player prices so player tuning doesn't move the AI).
const AI_PRICE_PER_POINT = 14 / 18;

// Development accumulates in the factory and arrives as upgrade packages every few races.
export function aiDevelop(c: Career, rng: Rng): string[] {
  const news: string[] = [];
  const eff = DIFFICULTY[c.difficulty].aiDev * AI_EFFICIENCY;
  for (const id of c.teamOrder) {
    if (id === c.playerTeamId) continue;
    const t = c.teams[id];
    const pending = (t.pendingDev ??= {});
    const spend = Math.min(t.budget, Math.max(0, t.budget * 0.12));
    t.budget = r1(t.budget - spend);
    let money = spend;
    while (money > 0.2) {
      // Bias toward the weakest stats.
      const k = rng.weighted(CAR_STATS, (s) => 1 + Math.max(0, 95 - t.stats[s]) / 10);
      const chunk = Math.min(money, 2);
      money -= chunk;
      const pricePerPoint = AI_PRICE_PER_POINT * costMult(t.stats[k] + (pending[k] ?? 0));
      pending[k] = (pending[k] ?? 0) + (chunk / pricePerPoint) * eff;
    }
    const total = Object.values(pending).reduce((a, b) => a + (b ?? 0), 0);
    if (total >= 2.5 && rng.chance(0.18)) {
      const before = carOverall(t.stats);
      const parts = (Object.entries(pending) as [CarStat, number][])
        .filter(([, v]) => v >= 0.3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k, v]) => `${CAR_STAT_LABEL[k]} +${v.toFixed(1)}`);
      for (const [k, v] of Object.entries(pending) as [CarStat, number][]) t.stats[k] = clampStat(t.stats[k] + v);
      t.pendingDev = {};
      news.push(`🔧 ${t.name} bring an upgrade package: ${parts.join(", ")} (car ${before.toFixed(1)} → ${carOverall(t.stats).toFixed(1)})`);
    }
  }
  return news;
}

// AI drivers train too: small gains every race, faster when young, slow once at their Potential.
export function aiDriverTraining(c: Career, rng: Rng) {
  for (const d of Object.values(c.drivers)) {
    if (d.isPlayer || d.retired || !d.teamId) continue;
    let g = 0.25 * ageFactor(d.age) * rng.range(0.5, 1.5);
    if (driverOverall(d.stats) >= d.potential) g *= 0.25;
    const k = rng.pick(DRIVER_STATS);
    d.stats[k] = clampStat(d.stats[k] + g);
  }
}

// Season-end convergence: AI cars drift slightly toward a fixed level so nobody runs away
// and the grid doesn't inflate toward 99 over long careers.
const AI_ANCHOR = 82;

export function aiConverge(c: Career) {
  const ids = c.teamOrder.filter((id) => id !== c.playerTeamId);
  const mean = AI_ANCHOR;
  for (const id of ids) {
    const t = c.teams[id];
    const shift = (mean - carOverall(t.stats)) * 0.18;
    for (const k of CAR_STATS) t.stats[k] = clampStat(t.stats[k] + shift);
  }
}
