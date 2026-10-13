import { DRIVERS, FIRST_NAMES, LAST_NAMES, PROFILES } from "./data/drivers";
import { PLAYER_TEAM_BUDGET, PLAYER_TEAM_STATS, TEAMS } from "./data/teams";
import { TRACKS, trackById } from "./data/tracks";
import { classify, createRace, running } from "./race";
import { aiConverge, aiDevelop, aiDriverTraining, advanceResearch, projectLabel, settleCarProjects } from "./research";
import { Rng, withRng } from "./rng";
import {
  carOverall, carTrackRating, clampStat, combined, DIFFICULTY, DRIVER_STAT_LABEL, driverOverall, driverRaceRating,
  driverValue, r1, seatedDrivers,
} from "./ratings";
import type {
  Career, Contract, Difficulty, Driver, DriverStat, DriverStats, Offer, Profile, RaceResult, TyrePlan,
} from "./types";
import { DRIVER_STATS, SAVE_VERSION } from "./types";
import { createWeekend, milestone } from "./weekend";

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const RACE_PRIZE = [2.0, 1.6, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const CONSTRUCTOR_PRIZE = [40, 35, 31, 28, 25, 22, 20, 18, 16, 14, 12, 10];
export const FIRST_SEASON = 2026;

export const STARTING_WALLET: Record<Profile, number> = { established: 3, superstar: 1.5, rookie: 1 };
export const DEFAULT_OWN_SALARY = 4;
export const MAX_OWN_SALARY = 15;

export const sponsorPerRace = (ov: number) => 1.6 + 3.2 * Math.max(0, Math.min(1, (ov - 50) / 40)) ** 1.5;

export interface NewCareerOptions {
  driverName: string;
  profile: Profile;
  difficulty: Difficulty;
  teamName: string;
  color: string;
  color2: string;
  seed?: number;
}

const codeOf = (name: string) => {
  const last = name.trim().split(/\s+/).pop() ?? "PLY";
  return (last.normalize("NFD").replace(/[^A-Za-z]/g, "") + "XXX").slice(0, 3).toUpperCase();
};

// Generate stats around a target overall, then shift so the overall matches exactly.
function genStats(rng: Rng, overall: number, spread = 4): DriverStats {
  const s = Object.fromEntries(DRIVER_STATS.map((k) => [k, overall + rng.range(-spread, spread)])) as DriverStats;
  const diff = overall - driverOverall(s);
  for (const k of DRIVER_STATS) s[k] = clampStat(s[k] + diff);
  return s;
}

export function genDriver(c: Career, rng: Rng, age: number, overall: number, potential: number): Driver {
  let name = "";
  do name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  while (Object.values(c.drivers).some((d) => d.name === name));
  return {
    id: `g${c.nextId++}`, name, code: codeOf(name), age, stats: genStats(rng, overall), potential,
    teamId: null, contractEnd: c.season,
  };
}

export function newCareer(o: NewCareerOptions): Career {
  const seed = o.seed ?? (Date.now() & 0x7fffffff);
  const c: Career = {
    version: SAVE_VERSION, rng: seed, difficulty: o.difficulty, profile: o.profile, season: FIRST_SEASON, round: 0, phase: "hub",
    drivers: {}, teams: {}, teamOrder: [], playerDriverId: "player", playerTeamId: "player", ownTeamId: "player",
    wallet: STARTING_WALLET[o.profile],
    contract: { teamId: "player", salary: DEFAULT_OWN_SALARY, pointBonus: 0, winBonus: 0, until: 9999 },
    research: [],
    points: { drivers: {}, teams: {} }, bestFinish: { drivers: {}, teams: {} }, weekend: null, seasonEnd: null,
    news: [], milestones: [], history: [],
    careerStats: { starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, titles: 0, dnfs: 0, earnings: 0 },
    pendingGridPenalties: {}, offseason: [], nextId: 1,
    seasonStart: { driver: { ...PROFILES[o.profile].stats }, car: { ...PLAYER_TEAM_STATS }, teamId: "player", driverOverall: {}, teamOverall: {} },
  };
  for (const t of TEAMS) {
    c.teams[t.id] = { id: t.id, name: t.name, color: t.color, color2: t.color2, stats: { ...t.stats }, budget: t.budget };
    c.teamOrder.push(t.id);
  }
  c.teams.player = {
    id: "player", name: o.teamName.trim() || "Zy Racing", color: o.color, color2: o.color2,
    stats: { ...PLAYER_TEAM_STATS }, budget: PLAYER_TEAM_BUDGET,
  };
  c.teamOrder.push("player");
  for (const d of DRIVERS) c.drivers[d.id] = { ...d, stats: { ...d.stats } };

  const prof = PROFILES[o.profile];
  withRng(c, "rng", (rng) => {
    c.drivers.player = {
      id: "player", name: o.driverName.trim() || "You", code: codeOf(o.driverName || "You"), age: prof.age,
      stats: { ...prof.stats }, potential: Math.round(rng.range(prof.potential[0], prof.potential[1])),
      teamId: "player", contractEnd: 9999, isPlayer: true,
    };
    // Lead driver: an experienced generated driver just above the player.
    const ov = Math.round(driverOverall(prof.stats)) + 3;
    const mate = genDriver(c, rng, 30, ov, ov + 1);
    mate.teamId = "player";
    mate.contractEnd = FIRST_SEASON + 1;
    c.drivers[mate.id] = mate;
  });
  resetPoints(c);
  snapshotSeasonStart(c);
  c.weekend = createWeekend(c);
  c.news.unshift(`Welcome to F1, ${c.drivers.player.name}! ${c.teams.player.name} lines up for the ${FIRST_SEASON} season.`);
  return c;
}

export function snapshotSeasonStart(c: Career) {
  c.seasonStart = {
    driver: { ...c.drivers[c.playerDriverId].stats },
    car: { ...c.teams[c.playerTeamId].stats },
    teamId: c.playerTeamId,
    driverOverall: Object.fromEntries(Object.values(c.drivers).filter((d) => !d.retired).map((d) => [d.id, driverOverall(d.stats)])),
    teamOverall: Object.fromEntries(c.teamOrder.map((id) => [id, carOverall(c.teams[id].stats)])),
  };
}

// ---------- money ----------

export const canSetSalary = (c: Career) => c.playerTeamId === c.ownTeamId && c.round === 0 && c.phase === "hub";

// At your own team you pay yourself; the money comes out of the team budget.
export function setSalary(c: Career, salary: number) {
  if (!canSetSalary(c)) return;
  c.contract.salary = Math.max(0, Math.min(MAX_OWN_SALARY, Math.round(salary * 2) / 2));
}

function resetPoints(c: Career) {
  c.points = { drivers: {}, teams: {} };
  c.bestFinish = { drivers: {}, teams: {} };
  for (const d of Object.values(c.drivers)) if (d.teamId && !d.retired) { c.points.drivers[d.id] = 0; c.bestFinish.drivers[d.id] = []; }
  for (const t of c.teamOrder) { c.points.teams[t] = 0; c.bestFinish.teams[t] = []; }
}

// ---------- standings ----------

function tieBreak(a: number[], b: number[]) {
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const x = sa[i] ?? 99, y = sb[i] ?? 99;
    if (x !== y) return x - y;
  }
  return 0;
}

export function driverStandings(c: Career): [string, number][] {
  return Object.entries(c.points.drivers).sort(
    (a, b) => b[1] - a[1] || tieBreak(c.bestFinish.drivers[a[0]] ?? [], c.bestFinish.drivers[b[0]] ?? []),
  );
}

export function teamStandings(c: Career): [string, number][] {
  return Object.entries(c.points.teams).sort(
    (a, b) => b[1] - a[1] || tieBreak(c.bestFinish.teams[a[0]] ?? [], c.bestFinish.teams[b[0]] ?? []),
  );
}

// ---------- weekend flow ----------

export function startRace(c: Career, plan: TyrePlan) {
  c.weekend!.race = createRace(c, plan);
  c.phase = "race";
}

const nudge = (d: Driver, k: DriverStat, v: number) => { d.stats[k] = clampStat(d.stats[k] + v); };

export function finishRace(c: Career): RaceResult {
  const w = c.weekend!;
  const r = w.race!;
  const track = trackById(w.trackId);
  const { valid, dq, dnfs } = classify(r);
  const notes: string[] = [];
  const drvBefore = driverOverall(c.drivers[c.playerDriverId].stats);
  const carBefore = carOverall(c.teams[c.playerTeamId].stats);
  const order: RaceResult["order"] = [];
  valid.forEach((x, i) => order.push({ driverId: x.driverId, teamId: x.teamId, points: POINTS[i] ?? 0, status: "Finished", grid: x.grid }));
  for (const x of dq) order.push({ driverId: x.driverId, teamId: x.teamId, points: 0, status: "DSQ (tyre rule)", grid: x.grid });
  for (const x of dnfs) order.push({ driverId: x.driverId, teamId: x.teamId, points: 0, status: x.dnf!, grid: x.grid });

  order.forEach((o, i) => {
    c.points.drivers[o.driverId] = (c.points.drivers[o.driverId] ?? 0) + o.points;
    c.points.teams[o.teamId] = (c.points.teams[o.teamId] ?? 0) + o.points;
    const pos = o.status === "Finished" ? i + 1 : 30;
    (c.bestFinish.drivers[o.driverId] ??= []).push(pos);
    (c.bestFinish.teams[o.teamId] ??= []).push(pos);
  });

  // Money
  const incomeMult = (teamId: string) => (teamId === c.playerTeamId ? DIFFICULTY[c.difficulty].income : 1);
  let playerIncome = 0;
  for (const t of c.teamOrder) {
    let inc = sponsorPerRace(carOverall(c.teams[t].stats));
    order.forEach((o, i) => { if (o.teamId === t && o.status === "Finished") inc += RACE_PRIZE[i] ?? (i < 15 ? 0.25 : 0.15); });
    inc *= incomeMult(t);
    c.teams[t].budget = r1(c.teams[t].budget + inc);
    if (t === c.playerTeamId) playerIncome = r1(inc);
  }

  withRng(c, "rng", (rng) => {
    // Form: beat expectations → small gains, underperform → small losses. Youngsters grow a bit every race.
    const expected = order
      .map((o) => ({ id: o.driverId, p: combined(carTrackRating(c.teams[o.teamId].stats, track), driverRaceRating(c.drivers[o.driverId].stats, false)) }))
      .sort((a, b) => b.p - a.p)
      .map((x) => x.id);
    valid.forEach((x, i) => {
      const d = c.drivers[x.driverId];
      const delta = expected.indexOf(x.driverId) - i;
      if (delta >= 3) {
        const k = rng.pick<DriverStat>(["racecraft", "composure", "consistency", "pace"]);
        nudge(d, k, 0.4);
        if (d.isPlayer) notes.push(`Great drive! ${DRIVER_STAT_LABEL[k]} +0.4`);
      } else if (delta <= -4) {
        const k = rng.pick<DriverStat>(["composure", "consistency"]);
        nudge(d, k, -0.2);
        if (d.isPlayer) notes.push(`Below expectations. ${DRIVER_STAT_LABEL[k]} -0.2`);
      }
    });
    for (const d of Object.values(c.drivers)) {
      // Young drivers grow a little every race toward their Potential (~10% of the gap per season).
      if (!d.retired && d.age <= 24) {
        const gap = d.potential - driverOverall(d.stats);
        if (gap > 0) for (const k of DRIVER_STATS) nudge(d, k, (gap * 0.1 / TRACKS.length) * rng.range(0.5, 1.5));
      }
    }
    aiDriverTraining(c, rng);
    for (const n of aiDevelop(c, rng)) c.news.unshift(n);
  });

  // Player stats & milestones
  const pi = order.findIndex((o) => o.driverId === c.playerDriverId);
  const po = order[pi];
  const cs = c.careerStats;
  cs.starts++;
  cs.points += po.points;
  if (po.status !== "Finished") cs.dnfs++;
  else {
    if (pi === 0) { cs.wins++; milestone(c, "First Grand Prix win"); }
    if (pi < 3) { cs.podiums++; milestone(c, "First podium"); }
    if (po.points > 0) milestone(c, "First points");
    const mate = order.findIndex((o) => o.teamId === c.playerTeamId && o.driverId !== c.playerDriverId);
    if (mate > pi || order[mate]?.status !== "Finished") milestone(c, "First time ahead of your teammate");
  }
  milestone(c, "First Grand Prix start");

  // Pay the player: salary share + result bonuses, from the team's budget.
  const ct = c.contract;
  const earnings = Math.round((ct.salary / TRACKS.length + po.points * ct.pointBonus + (pi === 0 && po.status === "Finished" ? ct.winBonus : 0)) * 100) / 100;
  c.teams[c.playerTeamId].budget = r1(c.teams[c.playerTeamId].budget - earnings);
  c.wallet = Math.round((c.wallet + earnings) * 100) / 100;
  cs.earnings = Math.round((cs.earnings + earnings) * 100) / 100;

  const research = advanceResearch(c);
  const dDrv = driverOverall(c.drivers[c.playerDriverId].stats) - drvBefore;
  const dCar = carOverall(c.teams[c.playerTeamId].stats) - carBefore;
  if (Math.abs(dDrv) >= 0.05 || Math.abs(dCar) >= 0.05) {
    research.push(`Overall this race: driver ${dDrv >= 0 ? "+" : ""}${dDrv.toFixed(1)}, car ${dCar >= 0 ? "+" : ""}${dCar.toFixed(1)}`);
  }
  for (const p of c.research) research.push(`In progress: ${projectLabel(p)}, ${p.racesLeft} race${p.racesLeft > 1 ? "s" : ""} left`);
  const result: RaceResult = { order, income: playerIncome, earnings, notes, research };
  w.result = result;
  c.phase = "raceResult";
  const winner = c.drivers[order[0].driverId];
  c.news.unshift(`R${c.round + 1} ${track.name}: ${winner.name} wins. You: ${po.status === "Finished" ? `P${pi + 1}` : po.status}.`);
  c.news = c.news.slice(0, 40);
  return result;
}

export function continueAfterRace(c: Career) {
  c.round++;
  if (c.round >= TRACKS.length) {
    computeSeasonEnd(c);
  } else {
    c.weekend = createWeekend(c);
    c.phase = "hub";
  }
}

// ---------- season end ----------

function topThree(c: Career): string[] {
  return Object.values(c.drivers)
    .filter((d) => d.teamId && !d.retired)
    .sort((a, b) => driverOverall(b.stats) - driverOverall(a.stats))
    .slice(0, 3)
    .map((d) => d.id);
}

function ageAndDevelop(c: Career, rng: Rng) {
  for (const d of Object.values(c.drivers)) {
    if (d.retired) continue;
    if (d.age <= 24) {
      // Growth happens race by race (see finishRace); nothing extra at season end.
    } else if (d.age <= 32) {
      for (const k of DRIVER_STATS) nudge(d, k, rng.range(-0.5, 0.5));
    } else {
      const k = (d.age - 32) * 0.4;
      nudge(d, "pace", -k * rng.range(0.8, 1.2));
      nudge(d, "composure", -k * 0.8);
      nudge(d, "racecraft", -k * 0.5);
      nudge(d, "wet", -k * 0.5);
      nudge(d, "consistency", -k * 0.2);
      nudge(d, "tyreMgmt", -k * 0.1);
    }
    d.age++;
  }
}

export function computeSeasonEnd(c: Career) {
  const ds = driverStandings(c);
  const ts = teamStandings(c);
  const pd = c.drivers[c.playerDriverId];
  const playerPos = ds.findIndex(([id]) => id === c.playerDriverId) + 1;
  const report = {
    driverStandings: ds, teamStandings: ts, retirements: [] as string[], moves: [] as string[],
    regulation: undefined as string | undefined, prize: 0, offers: [] as Offer[], canRetire: pd.age >= 35, marketScore: 0,
    canStay: c.playerTeamId === c.ownTeamId || c.contract.until > c.season,
  };

  c.history.push({
    season: c.season, driverPos: playerPos, teamName: c.teams[c.playerTeamId].name,
    teamPos: ts.findIndex(([id]) => id === c.playerTeamId) + 1, points: c.points.drivers[c.playerDriverId] ?? 0,
    champion: c.drivers[ds[0][0]].name, constructorsChampion: c.teams[ts[0][0]].name,
  });
  if (playerPos === 1) { c.careerStats.titles++; milestone(c, "World Champion"); }

  ts.forEach(([id], i) => {
    const prize = CONSTRUCTOR_PRIZE[i] * (id === c.playerTeamId ? DIFFICULTY[c.difficulty].income : 1);
    c.teams[id].budget = r1(c.teams[id].budget + prize);
    if (id === c.playerTeamId) report.prize = r1(prize);
  });

  aiConverge(c);
  withRng(c, "rng", (rng) => {
    ageAndDevelop(c, rng);

    // Retirements (AI only)
    for (const d of Object.values(c.drivers)) {
      if (d.retired || d.isPlayer) continue;
      const ov = driverOverall(d.stats);
      let p = d.age >= 42 ? 0.95 : d.age >= 34 ? Math.min(0.9, (d.age - 33) * 0.1) : 0;
      if (!d.teamId) p += d.age >= 28 ? 0.35 : 0.1;
      if (ov < 68) p += 0.1;
      if (rng.chance(p)) {
        const wasSeated = !!d.teamId;
        d.retired = true;
        d.teamId = null;
        // Unseated youngsters quietly drop out of the pool; only real retirements make the news.
        if (wasSeated || d.age >= 30) report.retirements.push(`${d.name} (${d.age})`);
      }
    }

    // New regulations every 5 seasons (announced the season before they apply).
    if ((c.season + 1 - FIRST_SEASON) % 5 === 0) {
      for (const id of c.teamOrder) {
        const t = c.teams[id];
        const bias = rng.range(-5, 5);
        for (const k of Object.keys(t.stats) as (keyof typeof t.stats)[]) {
          t.stats[k] = clampStat(t.stats[k] + Math.max(-8, Math.min(8, bias + rng.range(-3, 3))));
        }
      }
      report.regulation = `New regulations for ${c.season + 1}: every car has been reshuffled a little.`;
    }

    // Offers for the player: teams only want you if your rating + season form reaches their level.
    const top3 = topThree(c);
    const playerTop3 = top3.includes(c.playerDriverId);
    const myCar = carOverall(c.teams[c.playerTeamId].stats);
    const myValue = driverValue(pd);
    const myPts = c.points.drivers[c.playerDriverId] ?? 0;
    const mateId = Object.keys(c.points.drivers).find((id) => id !== c.playerDriverId && c.drivers[id].teamId === c.playerTeamId);
    const beatMate = !mateId || ds.findIndex(([id]) => id === c.playerDriverId) < ds.findIndex(([id]) => id === mateId);
    const marketScore = driverOverall(pd.stats) + (myValue - driverOverall(pd.stats)) * 0.5 + Math.min(8, myPts / 30) + (beatMate ? 2 : -3);
    report.marketScore = r1(marketScore);
    const candidates = c.teamOrder
      .filter((id) => id !== c.playerTeamId && id !== c.ownTeamId)
      .filter((id) => carOverall(c.teams[id].stats) >= myCar - 2)
      .filter((id) => marketScore >= carOverall(c.teams[id].stats) - 4)
      .filter((id) => {
        const seated = seatedDrivers(c, id);
        if (playerTop3 && seated.some((d) => top3.includes(d.id))) return false;
        return seated.length < 2 || seated.some((d) => driverValue(d) < myValue - 1);
      })
      .sort((a, b) => carOverall(c.teams[b].stats) - carOverall(c.teams[a].stats));
    let teamsOffering = 0;
    for (const id of candidates) {
      if (teamsOffering >= 3) break;
      if (!rng.chance(0.75)) continue;
      teamsOffering++;
      report.offers.push(...offerPackages(c, rng, id, marketScore, false));
    }
    // Your current (non-owned) team may offer a renewal when the contract runs out.
    if (!report.canStay && marketScore >= carOverall(c.teams[c.playerTeamId].stats) - 8) {
      report.offers.unshift(...offerPackages(c, rng, c.playerTeamId, marketScore, true));
    }
  });

  c.seasonEnd = report;
  c.phase = "seasonEnd";
}

const STYLES = [
  { style: "Security", years: 3, salary: 1, pointBonus: 0.01, winBonus: 0.2 },
  { style: "Balanced", years: 2, salary: 0.85, pointBonus: 0.03, winBonus: 0.5 },
  { style: "Performance", years: 1, salary: 0.6, pointBonus: 0.06, winBonus: 1 },
];

// Each interested team puts two different packages on the table.
function offerPackages(c: Career, rng: Rng, teamId: string, marketScore: number, renewal: boolean): Offer[] {
  const car = carOverall(c.teams[teamId].stats);
  const base = Math.max(1, Math.min(25, 1 + (car - 60) * 0.25 + (marketScore - 70) * 0.3)) * rng.range(0.9, 1.1);
  const styles = [...STYLES].sort(() => rng.next() - 0.5).slice(0, 2).sort((a, b) => b.years - a.years);
  return styles.map((s) => ({
    teamId, style: s.style, years: s.years, renewal,
    salary: Math.round(base * s.salary * 10) / 10, pointBonus: s.pointBonus, winBonus: s.winBonus,
  }));
}

export function retirePlayer(c: Career) {
  c.phase = "retired";
}

// choice: null = stay (contract running or own team), an Offer = sign it, "own" = return to your own team.
export function resolveSeasonEnd(c: Career, choice: Offer | "own" | null) {
  const rep = c.seasonEnd!;
  const moves: string[] = [];
  const pd = c.drivers[c.playerDriverId];
  if (choice === null && !rep.canStay) choice = "own"; // contract over and nothing signed: go home
  const target = choice === "own" ? c.ownTeamId : choice?.teamId ?? null;

  withRng(c, "rng", (rng) => {
    // Player transfer / new contract
    if (target && target !== c.playerTeamId) {
      const old = c.playerTeamId;
      settleCarProjects(c, old);
      const seated = seatedDrivers(c, target);
      if (seated.length >= 2) {
        const drop = seated.sort((a, b) => driverValue(a) - driverValue(b))[0];
        drop.teamId = null;
        moves.push(`${drop.name} is released by ${c.teams[target].name}`);
      }
      pd.teamId = target;
      c.playerTeamId = target;
      moves.push(target === c.ownTeamId
        ? `⭐ You return to your own team, ${c.teams[target].name}!`
        : `⭐ You join ${c.teams[target].name}! ${c.teams[old].name} continues without you.`);
    }
    if (choice === "own") {
      c.contract = { teamId: c.ownTeamId, salary: DEFAULT_OWN_SALARY, pointBonus: 0, winBonus: 0, until: 9999 };
    } else if (choice) {
      c.contract = contractFrom(choice, c.season);
      if (choice.renewal) moves.push(`⭐ You re-sign with ${c.teams[choice.teamId].name} (${choice.years} yr, $${choice.salary}M/yr)`);
    }

    // Expiring contracts
    const prevTeam = new Map(Object.values(c.drivers).map((d) => [d.id, d.teamId]));
    for (const d of Object.values(c.drivers)) {
      if (d.isPlayer || d.retired || !d.teamId || d.contractEnd > c.season) continue;
      const keep = driverOverall(d.stats) >= 78 || d.age <= 24 ? 0.65 : 0.35;
      if (rng.chance(keep)) d.contractEnd = c.season + rng.int(1, 3);
      else d.teamId = null;
    }

    // Rookies from F2
    const open = c.teamOrder.reduce((n, id) => n + Math.max(0, 2 - seatedDrivers(c, id).length), 0);
    const freeAgents = Object.values(c.drivers).filter((d) => !d.teamId && !d.retired && !d.isPlayer).length;
    const rookies = Math.max(3, open - freeAgents + 3);
    for (let i = 0; i < rookies; i++) {
      const ov = rng.range(62, 72);
      const g = genDriver(c, rng, rng.int(18, 21), ov, Math.round(Math.min(95, ov + rng.range(6, 20))));
      c.drivers[g.id] = g;
    }

    // Fill seats: strongest cars pick first, respecting the top-3 rule.
    const top3 = topThreeAll(c);
    const teams = [...c.teamOrder].sort((a, b) => carOverall(c.teams[b].stats) - carOverall(c.teams[a].stats));
    for (const id of teams) {
      while (seatedDrivers(c, id).length < 2) {
        const hasTop = seatedDrivers(c, id).some((d) => top3.includes(d.id));
        const pool = Object.values(c.drivers)
          .filter((d) => !d.teamId && !d.retired && !d.isPlayer)
          .filter((d) => !(hasTop && top3.includes(d.id)))
          .sort((a, b) => driverValue(b) - driverValue(a));
        if (!pool.length) break;
        const pick = pool[Math.min(pool.length - 1, rng.chance(0.7) ? 0 : rng.int(0, 2))];
        pick.teamId = id;
        pick.contractEnd = c.season + (pick.age <= 23 ? rng.int(2, 3) : rng.int(1, 2));
        const prev = prevTeam.get(pick.id);
        if (prev === id) moves.push(`${pick.name} re-signs with ${c.teams[id].name}`);
        else moves.push(`${pick.name} signs for ${c.teams[id].name}${prev ? ` (from ${c.teams[prev].name})` : pick.id.startsWith("g") && pick.age <= 21 ? " (rookie)" : ""}`);
      }
    }

    enforceTopThree(c, moves);
  });

  rep.moves = moves;
  c.offseason = [
    ...rep.retirements.map((x) => `👋 ${x} retires`),
    ...(rep.regulation ? [`📜 ${rep.regulation}`] : []),
    ...moves,
  ];
  c.season++;
  c.round = 0;
  resetPoints(c);
  snapshotSeasonStart(c);
  c.weekend = createWeekend(c);
  c.seasonEnd = null;
  c.phase = "hub";
  c.news.unshift(`The ${c.season} season begins. Driving for ${c.teams[c.playerTeamId].name}.`);
  if ((c.season + 1 - FIRST_SEASON) % 5 === 0) {
    c.news.unshift(`📜 New regulations announced for ${c.season + 1}. Expect the pecking order to shift a little.`);
  }
}

const contractFrom = (o: Offer, season: number): Contract => ({
  teamId: o.teamId, salary: o.salary, pointBonus: o.pointBonus, winBonus: o.winBonus, until: season + o.years,
});

function topThreeAll(c: Career): string[] {
  return Object.values(c.drivers)
    .filter((d) => !d.retired)
    .sort((a, b) => driverOverall(b.stats) - driverOverall(a.stats))
    .slice(0, 3)
    .map((d) => d.id);
}

// The 3 best drivers can never share a team: the lower-rated one swaps with the
// weakest driver of the strongest team that has no top-3 driver. The player is never moved.
export function enforceTopThree(c: Career, moves: string[]) {
  for (let guard = 0; guard < 6; guard++) {
    const top3 = topThree(c);
    const clash = c.teamOrder.find((id) => seatedDrivers(c, id).filter((d) => top3.includes(d.id)).length >= 2);
    if (!clash) return;
    const pair = seatedDrivers(c, clash).filter((d) => top3.includes(d.id));
    const mover = pair.filter((d) => !d.isPlayer).sort((a, b) => driverOverall(a.stats) - driverOverall(b.stats))[0];
    const dest = [...c.teamOrder]
      .filter((id) => id !== clash && !seatedDrivers(c, id).some((d) => top3.includes(d.id)))
      .sort((a, b) => carOverall(c.teams[b].stats) - carOverall(c.teams[a].stats))[0];
    if (!mover || !dest) return;
    const out = seatedDrivers(c, dest).filter((d) => !d.isPlayer).sort((a, b) => driverOverall(a.stats) - driverOverall(b.stats))[0];
    mover.teamId = dest;
    if (out) out.teamId = clash;
    moves.push(`⚖️ Top-3 rule: ${mover.name} moves to ${c.teams[dest].name}${out ? `, ${out.name} goes to ${c.teams[clash].name}` : ""}`);
  }
}

export { running };
