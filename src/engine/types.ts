export const DRIVER_STATS = ["pace", "racecraft", "consistency", "tyreMgmt", "wet", "composure"] as const;
export const CAR_STATS = ["power", "hsAero", "lsGrip", "braking", "tyreKind", "reliability"] as const;

export type DriverStat = (typeof DRIVER_STATS)[number];
export type CarStat = (typeof CAR_STATS)[number];
export type DriverStats = Record<DriverStat, number>;
export type CarStats = Record<CarStat, number>;

export type Difficulty = "easy" | "normal" | "hard";
export type Profile = "established" | "superstar" | "rookie";
export type Compound = "S" | "M" | "H" | "I" | "W";
export type QualiApproach = "safe" | "normal" | "aggressive";
export type DriveMode = "save" | "normal" | "push";

export const SAVE_VERSION = 2;

export interface Driver {
  id: string;
  name: string;
  code: string; // 3-letter timing code
  age: number;
  stats: DriverStats; // floats
  potential: number;
  teamId: string | null;
  contractEnd: number; // last season under contract
  isPlayer?: boolean;
  retired?: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  color2: string;
  stats: CarStats;
  budget: number; // $M
  pendingDev?: Partial<CarStats>; // AI: development waiting to be delivered as an upgrade package
}

export interface Track {
  id: string;
  name: string;
  country: string;
  laps: number;
  baseLap: number; // seconds, reference lap for a 100-rated car
  pitLoss: number; // seconds lost for a stop
  weights: CarStats; // relative importance of each car stat (reliability unused for pace)
  overtaking: number; // 2 easy … 5 very hard
  deg: number; // tyre degradation multiplier
  rain: number; // probability of rain during the race
  sc: number; // probability of a safety car during the race
  traits: string[]; // human-readable key stats
}

export type ResearchLength = "short" | "medium" | "long";

export interface ResearchProject {
  id: string;
  target: "car" | "driver";
  stat: CarStat | DriverStat;
  length: ResearchLength;
  racesLeft: number;
  gain: number;
  cost: number;
}

// A dry tyre plan: compounds in order and the lap of each stop.
export interface TyrePlan {
  stints: Compound[];
  pitLaps: number[];
}

export interface StrategyOption extends TyrePlan {
  id: string;
  name: string;
  estTime: number; // estimated race time in seconds (tyres + stops only), for comparison
  windows: [number, number][]; // allowed pit-lap range per stop
}

export interface CarRaceState {
  driverId: string;
  teamId: string;
  total: number; // cumulative race time
  lastLap: number;
  compound: Compound;
  tyreAge: number; // effective wear in "laps" (push wears faster, save slower)
  stintLaps: number; // actual laps on this set
  compoundsUsed: Compound[];
  plan: { lap: number; compound: Compound }[]; // remaining planned stops
  stops: number;
  dnf?: string;
  dnfLap?: number;
  damage: 0 | 1 | 2; // 0 none, 1 minor, 2 major
  penalty: number; // pending time penalty in seconds
  form: number; // weekend form, seconds per lap
  mode: DriveMode;
  energy: number; // 0–100
  boxRequest?: Compound; // player asked to pit next lap
  riskMod: number;
  tempMods: { pace: number; laps: number }[];
  pitThisLap?: boolean;
  clipping?: boolean;
  grid: number;
}

export interface Decision {
  kind: string;
  title: string;
  text: string;
  options: { id: string; label: string; hint?: string }[];
  ctx?: Record<string, string | number>;
}

export interface FeedItem {
  lap: number;
  text: string;
  tone?: "info" | "good" | "bad" | "player";
}

export interface RaceState {
  rng: number;
  trackId: string;
  lap: number; // laps completed
  totalLaps: number;
  cars: CarRaceState[];
  wet: boolean;
  everWet: boolean;
  heavyRain: boolean;
  rainStart: number | null;
  rainEnd: number | null;
  scLapsLeft: number;
  scUsed: boolean;
  feed: FeedItem[];
  pending: Decision | null;
  decisionsLeft: number;
  firedKinds: string[];
  playerDriverId: string;
  teammateId: string;
  finished: boolean;
}

export interface QualiRow {
  driverId: string;
  time: number | null; // null = crashed / no time
  note?: string;
}

export interface Weekend {
  round: number;
  trackId: string;
  rainForecast: number; // shown to player
  rainWindow: [number, number]; // forecast lap range for rain
  willRain: boolean;
  rainStartFrac: number;
  heavyRain: boolean;
  qualiWet: boolean;
  gridPenalties: Record<string, number>;
  boosts: string[]; // boost ids bought for this weekend
  quali?: QualiRow[];
  strategies?: StrategyOption[];
  race?: RaceState;
  result?: RaceResult;
}

export interface RaceResult {
  order: { driverId: string; teamId: string; points: number; status: string; grid: number }[];
  income: number;
  earnings: number; // player's personal earnings this race
  notes: string[];
  research: string[];
}

export interface Contract {
  teamId: string;
  salary: number; // $M per season
  pointBonus: number; // $M per point
  winBonus: number; // $M per win
  until: number; // last season
}

export interface Offer extends Omit<Contract, "until"> {
  years: number;
  style: string;
  renewal?: boolean;
}

export interface SeasonSummary {
  season: number;
  driverPos: number;
  teamName: string;
  teamPos: number;
  points: number;
  champion: string;
  constructorsChampion: string;
}

export interface CareerStats {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  titles: number;
  dnfs: number;
  earnings: number;
}

export interface SeasonEndReport {
  driverStandings: [string, number][];
  teamStandings: [string, number][];
  retirements: string[];
  moves: string[];
  regulation?: string;
  prize: number;
  offers: Offer[];
  canStay: boolean; // contract still running, or it's your own team
  canRetire: boolean;
  marketScore: number;
}

export interface Career {
  version: number;
  rng: number;
  difficulty: Difficulty;
  profile: Profile;
  season: number;
  round: number;
  phase: "hub" | "quali" | "strategy" | "race" | "raceResult" | "seasonEnd" | "retired";
  drivers: Record<string, Driver>;
  teams: Record<string, Team>;
  teamOrder: string[];
  playerDriverId: string;
  playerTeamId: string;
  ownTeamId: string; // the team the player founded and owns
  wallet: number; // player's personal money, $M
  contract: Contract;
  research: ResearchProject[];
  points: { drivers: Record<string, number>; teams: Record<string, number> };
  bestFinish: { drivers: Record<string, number[]>; teams: Record<string, number[]> };
  weekend: Weekend | null;
  seasonEnd: SeasonEndReport | null;
  news: string[];
  milestones: string[];
  history: SeasonSummary[];
  careerStats: CareerStats;
  pendingGridPenalties: Record<string, number>;
  offseason: string[];
  seasonStart: {
    driver: DriverStats;
    car: CarStats;
    teamId: string;
    driverOverall: Record<string, number>;
    teamOverall: Record<string, number>;
  };
  nextId: number;
}
