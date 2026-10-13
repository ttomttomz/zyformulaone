import type { DriverStats, Profile } from "../types";

export interface DriverSeed {
  id: string;
  name: string;
  code: string;
  teamId: string;
  age: number;
  stats: DriverStats;
  potential: number;
  contractEnd: number; // season the contract runs through
}

// [pace, racecraft, consistency, tyreMgmt, wet, composure]
const s = (v: number[]): DriverStats => ({
  pace: v[0], racecraft: v[1], consistency: v[2], tyreMgmt: v[3], wet: v[4], composure: v[5],
});

const d = (id: string, name: string, code: string, teamId: string, age: number, v: number[], potential: number, contractEnd: number): DriverSeed =>
  ({ id, name, code, teamId, age, stats: s(v), potential, contractEnd });

export const DRIVERS: DriverSeed[] = [
  d("verstappen", "Max Verstappen", "VER", "redbull", 28, [91, 91, 88, 87, 92, 90], 91, 2028),
  d("norris", "Lando Norris", "NOR", "mclaren", 26, [89, 82, 81, 83, 83, 79], 86, 2027),
  d("piastri", "Oscar Piastri", "PIA", "mclaren", 25, [86, 83, 85, 83, 77, 85], 87, 2027),
  d("leclerc", "Charles Leclerc", "LEC", "ferrari", 28, [91, 83, 79, 81, 83, 81], 85, 2029),
  d("hamilton", "Lewis Hamilton", "HAM", "ferrari", 41, [82, 85, 81, 86, 87, 80], 83, 2026),
  d("russell", "George Russell", "RUS", "mercedes", 28, [88, 82, 84, 82, 81, 83], 85, 2026),
  d("antonelli", "Kimi Antonelli", "ANT", "mercedes", 19, [84, 75, 69, 73, 78, 71], 87, 2026),
  d("hadjar", "Isack Hadjar", "HAD", "redbull", 21, [79, 73, 71, 72, 75, 73], 83, 2027),
  d("alonso", "Fernando Alonso", "ALO", "aston", 44, [79, 88, 83, 85, 84, 87], 84, 2026),
  d("stroll", "Lance Stroll", "STR", "aston", 27, [69, 68, 67, 69, 77, 67], 70, 2027),
  d("gasly", "Pierre Gasly", "GAS", "alpine", 30, [78, 77, 77, 77, 77, 77], 78, 2028),
  d("colapinto", "Franco Colapinto", "COL", "alpine", 22, [71, 71, 63, 67, 65, 69], 75, 2026),
  d("sainz", "Carlos Sainz", "SAI", "williams", 31, [82, 81, 82, 83, 80, 80], 82, 2027),
  d("albon", "Alex Albon", "ALB", "williams", 30, [79, 78, 79, 80, 75, 78], 79, 2027),
  d("lawson", "Liam Lawson", "LAW", "rb", 24, [74, 75, 67, 69, 69, 71], 77, 2026),
  d("lindblad", "Arvid Lindblad", "LIN", "rb", 18, [75, 67, 65, 65, 67, 67], 84, 2027),
  d("ocon", "Esteban Ocon", "OCO", "haas", 29, [74, 75, 74, 75, 79, 73], 75, 2026),
  d("bearman", "Oliver Bearman", "BEA", "haas", 20, [76, 77, 69, 71, 71, 75], 83, 2027),
  d("hulkenberg", "Nico Hülkenberg", "HUL", "audi", 38, [76, 73, 78, 74, 73, 75], 76, 2026),
  d("bortoleto", "Gabriel Bortoleto", "BOR", "audi", 21, [75, 72, 73, 71, 69, 73], 82, 2027),
  d("perez", "Sergio Pérez", "PER", "cadillac", 36, [74, 78, 69, 85, 75, 69], 75, 2027),
  d("bottas", "Valtteri Bottas", "BOT", "cadillac", 36, [77, 69, 77, 75, 69, 73], 77, 2026),
];

export const PROFILES: Record<Profile, { label: string; age: number; stats: DriverStats; potential: [number, number]; blurb: string }> = {
  established: {
    label: "Established Driver", age: 25, stats: s([78, 77, 78, 76, 75, 76]), potential: [78, 82],
    blurb: "Balanced and race-ready. Strong from day one, little growth left.",
  },
  superstar: {
    label: "New Superstar", age: 18, stats: s([84, 76, 66, 70, 76, 71]), potential: [88, 95],
    blurb: "Raw speed, rough edges. Error-prone but with a huge ceiling.",
  },
  rookie: {
    label: "Promising Rookie", age: 18, stats: s([71, 67, 61, 63, 63, 61]), potential: [75, 83],
    blurb: "The hard way up. Starts at the back with a decent ceiling.",
  },
};

export const FIRST_NAMES = [
  "Luca", "Mateo", "Noah", "Elias", "Oskar", "Theo", "Rafael", "Jonas", "Felix", "Dante", "Kenji", "Marco",
  "Victor", "Hugo", "Leon", "Nico", "Tomás", "Adrian", "Sami", "Ivan", "Yuki", "Emil", "Aarav", "Diego",
];
export const LAST_NAMES = [
  "Moretti", "Dubois", "Kaiser", "Lindqvist", "Okafor", "Varga", "Santos", "Novak", "Haddad", "Mendes",
  "Tanaka", "Kowalski", "Fischer", "Rossi", "Laurent", "Brandt", "Costa", "Ivanov", "Petit", "Nakamura",
  "Silva", "Bergström", "Romero", "Weber",
];
