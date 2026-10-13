import type { CarStats, Track } from "../types";

type Key = keyof CarStats;
const BASE: CarStats = { power: 1, hsAero: 1, lsGrip: 1, braking: 0.6, tyreKind: 0.8, reliability: 0 };

const LABEL: Record<Key, string> = {
  power: "Power Unit", hsAero: "High-Speed Aero", lsGrip: "Low-Speed Grip",
  braking: "Braking", tyreKind: "Tyre Kindness", reliability: "Reliability",
};

const OT = { easy: 2, medium: 3, hard: 4, veryHard: 5 };
const DEG = { low: 0.7, medium: 1, high: 1.3, veryHigh: 1.6 };
const RAIN = { veryLow: 0.03, low: 0.1, medium: 0.2, high: 0.35 };

function t(
  id: string, name: string, country: string, laps: number, baseLap: number, pitLoss: number,
  key: Key[], overtaking: number, deg: number, rain: number, sc: number,
): Track {
  const weights = { ...BASE };
  for (const k of key) weights[k] *= 2.2;
  const traits = key.length ? key.map((k) => LABEL[k]) : ["Balanced"];
  return { id, name, country, laps, baseLap, pitLoss, weights, overtaking, deg, rain, sc, traits };
}

// 2026 calendar as originally published, no sprints.
export const TRACKS: Track[] = [
  t("australia", "Australian GP", "Melbourne", 58, 80, 19, ["braking"], OT.medium, DEG.medium, RAIN.medium, 0.6),
  t("china", "Chinese GP", "Shanghai", 56, 95, 23, ["lsGrip", "tyreKind"], OT.easy, DEG.high, RAIN.medium, 0.35),
  t("japan", "Japanese GP", "Suzuka", 53, 91, 22, ["hsAero"], OT.hard, DEG.medium, RAIN.medium, 0.35),
  t("bahrain", "Bahrain GP", "Sakhir", 57, 94, 23, ["braking", "tyreKind"], OT.easy, DEG.high, RAIN.veryLow, 0.3),
  t("saudi", "Saudi Arabian GP", "Jeddah", 50, 90, 20, ["power", "hsAero"], OT.medium, DEG.low, RAIN.veryLow, 0.7),
  t("miami", "Miami GP", "Miami", 57, 90, 20, ["lsGrip", "tyreKind"], OT.medium, DEG.medium, RAIN.medium, 0.45),
  t("canada", "Canadian GP", "Montreal", 70, 75, 19, ["braking", "power"], OT.easy, DEG.low, RAIN.medium, 0.6),
  t("monaco", "Monaco GP", "Monte Carlo", 78, 74, 20, ["lsGrip"], OT.veryHard, DEG.low, RAIN.low, 0.5),
  t("barcelona", "Barcelona-Catalunya GP", "Barcelona", 66, 78, 22, ["hsAero"], OT.hard, DEG.high, RAIN.low, 0.25),
  t("austria", "Austrian GP", "Spielberg", 71, 67, 20, ["power", "braking"], OT.easy, DEG.medium, RAIN.medium, 0.35),
  t("britain", "British GP", "Silverstone", 52, 88, 20, ["hsAero"], OT.medium, DEG.high, RAIN.high, 0.4),
  t("belgium", "Belgian GP", "Spa-Francorchamps", 44, 106, 19, ["power", "hsAero"], OT.easy, DEG.medium, RAIN.high, 0.4),
  t("hungary", "Hungarian GP", "Budapest", 70, 79, 20, ["lsGrip"], OT.veryHard, DEG.medium, RAIN.medium, 0.3),
  t("netherlands", "Dutch GP", "Zandvoort", 72, 72, 21, ["hsAero"], OT.veryHard, DEG.medium, RAIN.medium, 0.45),
  t("italy", "Italian GP", "Monza", 53, 83, 24, ["power"], OT.easy, DEG.low, RAIN.low, 0.3),
  t("madrid", "Spanish GP", "Madrid", 57, 90, 21, ["lsGrip", "braking"], OT.medium, DEG.medium, RAIN.low, 0.5),
  t("azerbaijan", "Azerbaijan GP", "Baku", 51, 104, 20, ["power", "braking"], OT.easy, DEG.low, RAIN.low, 0.7),
  t("singapore", "Singapore GP", "Marina Bay", 62, 96, 28, ["lsGrip", "braking"], OT.hard, DEG.medium, RAIN.medium, 0.8),
  t("usa", "United States GP", "Austin", 56, 96, 20, ["tyreKind"], OT.medium, DEG.high, RAIN.low, 0.4),
  t("mexico", "Mexico City GP", "Mexico City", 71, 80, 22, ["power", "lsGrip"], OT.medium, DEG.medium, RAIN.low, 0.45),
  t("brazil", "São Paulo GP", "Interlagos", 71, 72, 21, ["power"], OT.easy, DEG.medium, RAIN.high, 0.55),
  t("vegas", "Las Vegas GP", "Las Vegas", 50, 94, 21, ["power", "braking"], OT.easy, DEG.low, RAIN.veryLow, 0.5),
  t("qatar", "Qatar GP", "Lusail", 57, 84, 25, ["hsAero", "tyreKind"], OT.medium, DEG.veryHigh, RAIN.veryLow, 0.35),
  t("abudhabi", "Abu Dhabi GP", "Yas Marina", 58, 86, 22, ["lsGrip", "power"], OT.medium, DEG.low, RAIN.veryLow, 0.3),
];

export const trackById = (id: string): Track => TRACKS.find((x) => x.id === id)!;

export const overtakingLabel = (n: number) => ["", "", "Easy", "Medium", "Hard", "Very hard"][n];
export const degLabel = (n: number) => (n <= 0.7 ? "Low" : n <= 1 ? "Medium" : n <= 1.3 ? "High" : "Very high");
