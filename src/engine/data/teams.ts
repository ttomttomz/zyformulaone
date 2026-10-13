import type { CarStats } from "../types";

export interface TeamSeed {
  id: string;
  name: string;
  color: string;
  color2: string;
  stats: CarStats;
  budget: number;
}

// [power, hsAero, lsGrip, braking, tyreKind, reliability]
const s = (v: number[]): CarStats => ({
  power: v[0], hsAero: v[1], lsGrip: v[2], braking: v[3], tyreKind: v[4], reliability: v[5],
});

export const TEAMS: TeamSeed[] = [
  { id: "mercedes", name: "Mercedes", color: "#27F4D2", color2: "#111111", stats: s([94, 88, 85, 86, 84, 90]), budget: 60 },
  { id: "ferrari", name: "Ferrari", color: "#E8002D", color2: "#FFF200", stats: s([89, 85, 88, 86, 80, 84]), budget: 60 },
  { id: "mclaren", name: "McLaren", color: "#FF8000", color2: "#47C7FC", stats: s([86, 88, 87, 85, 86, 82]), budget: 60 },
  { id: "redbull", name: "Red Bull", color: "#3671C6", color2: "#FFD700", stats: s([84, 84, 80, 82, 78, 80]), budget: 55 },
  { id: "alpine", name: "Alpine", color: "#FF87BC", color2: "#0093CC", stats: s([88, 74, 72, 74, 72, 80]), budget: 40 },
  { id: "haas", name: "Haas", color: "#B6BABD", color2: "#DA291C", stats: s([86, 72, 72, 73, 74, 80]), budget: 30 },
  { id: "rb", name: "Racing Bulls", color: "#6692FF", color2: "#FFFFFF", stats: s([82, 73, 72, 72, 72, 76]), budget: 35 },
  { id: "williams", name: "Williams", color: "#64C4FF", color2: "#00205B", stats: s([86, 70, 68, 72, 70, 78]), budget: 40 },
  { id: "audi", name: "Audi", color: "#F50537", color2: "#9EA3A6", stats: s([78, 72, 72, 73, 72, 70]), budget: 45 },
  { id: "aston", name: "Aston Martin", color: "#229971", color2: "#CEDC00", stats: s([66, 76, 72, 72, 70, 58]), budget: 50 },
  { id: "cadillac", name: "Cadillac", color: "#E6E6E6", color2: "#1A1A1A", stats: s([84, 64, 62, 65, 64, 70]), budget: 35 },
];

export const PLAYER_TEAM_STATS: CarStats = s([60, 55, 55, 56, 56, 54]);
export const PLAYER_TEAM_BUDGET = 25;

export const TEAM_COLORS = [
  "#E10600", "#FF6F00", "#FFC400", "#00C853", "#00B8D4", "#2962FF",
  "#AA00FF", "#F50057", "#FFFFFF", "#9E9E9E", "#212121", "#795548",
];
