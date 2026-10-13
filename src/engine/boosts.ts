import type { Career, DriverStat, DriverStats } from "./types";

// Small per-weekend boosts bought with the driver's personal money.
export interface Boost {
  id: string;
  label: string;
  stat: DriverStat;
  amount: number;
  cost: number; // $M
  desc: string;
}

export const BOOSTS: Boost[] = [
  { id: "sim", label: "Simulator session", stat: "pace", amount: 2, cost: 0.25, desc: "Learn the track on the sim" },
  { id: "engineer", label: "Engineer briefing", stat: "racecraft", amount: 3, cost: 0.15, desc: "Study rivals' overtaking spots" },
  { id: "physio", label: "Physio & recovery", stat: "consistency", amount: 3, cost: 0.15, desc: "Fresh body, fewer mistakes" },
  { id: "tyres", label: "Tyre workshop", stat: "tyreMgmt", amount: 3, cost: 0.15, desc: "Work with the tyre engineers" },
  { id: "wet", label: "Wet-weather drills", stat: "wet", amount: 4, cost: 0.1, desc: "Worth it when rain is forecast" },
  { id: "mental", label: "Mental coach", stat: "composure", amount: 3, cost: 0.1, desc: "Calm starts and pressure moments" },
];

export const MAX_BOOSTS = 2;

export function buyBoost(c: Career, id: string): string | null {
  const w = c.weekend!;
  const b = BOOSTS.find((x) => x.id === id)!;
  if (w.boosts.includes(id)) return "Already booked";
  if (w.boosts.length >= MAX_BOOSTS) return `Max ${MAX_BOOSTS} per weekend`;
  if (c.wallet < b.cost) return "Not enough personal money";
  c.wallet = Math.round((c.wallet - b.cost) * 100) / 100;
  w.boosts.push(id);
  return null;
}

// Driver stats including this weekend's boosts (player only).
export function effStats(c: Career, driverId: string): DriverStats {
  const d = c.drivers[driverId];
  const boosts = d.isPlayer ? c.weekend?.boosts ?? [] : [];
  if (!boosts.length) return d.stats;
  const s = { ...d.stats };
  for (const id of boosts) {
    const b = BOOSTS.find((x) => x.id === id);
    if (b) s[b.stat] += b.amount;
  }
  return s;
}
