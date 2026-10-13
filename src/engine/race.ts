import { effStats } from "./boosts";
import { trackById } from "./data/tracks";
import { Rng } from "./rng";
import { carTrackRating, combined, DIFFICULTY, driverRaceRating, SECONDS_PER_POINT } from "./ratings";
import {
  CLIPPING_PENALTY, COMPOUNDS, degFactor, lifeLaps, MODES, NORMAL_ENERGY_USE, strategyOptions, tyreHealth, wearPenalty,
} from "./tyres";
import type { CarRaceState, Career, Compound, Decision, DriveMode, RaceState, Track, TyrePlan } from "./types";
import { startingGrid } from "./weekend";

export { COMPOUNDS };

const MAX_DECISIONS = 4;

const toPlan = (p: TyrePlan) => p.pitLaps.map((lap, i) => ({ lap, compound: p.stints[i + 1] }));

export function carDegFactor(c: Career, cr: { driverId: string; teamId: string }) {
  return degFactor(effStats(c, cr.driverId).tyreMgmt, c.teams[cr.teamId].stats.tyreKind);
}

// AI picks among the 5 best strategies for its own car (closer to optimal = more likely),
// with a little jitter on pit laps, so the grid runs a mix of plans.
function aiPlan(c: Career, rng: Rng, track: Track, driverId: string, teamId: string, cache: Map<string, TyrePlan[]>): TyrePlan {
  // Bucket similar cars so the strategy search runs only a few times per race.
  const df = Math.round(carDegFactor(c, { driverId, teamId }) / 0.05) * 0.05;
  const key = df.toFixed(2);
  if (!cache.has(key)) cache.set(key, strategyOptions(track, df, 5));
  const opts = cache.get(key)! as (TyrePlan & { estTime: number })[];
  const p = rng.weighted(opts, (o) => Math.exp(-(o.estTime - opts[0].estTime) / 4));
  const pitLaps = p.pitLaps.map((l) => l + rng.int(-3, 3));
  return { stints: p.stints, pitLaps };
}

export function createRace(c: Career, plan: TyrePlan): RaceState {
  const w = c.weekend!;
  const track = trackById(w.trackId);
  const rng = new Rng(c.rng);
  c.rng = rng.state ^ 0x5bd1e995;
  const grid = startingGrid(c);
  const teammate = grid.find((id) => id !== c.playerDriverId && c.drivers[id].teamId === c.playerTeamId)!;
  const rainStart = w.willRain ? Math.max(3, Math.round(w.rainStartFrac * track.laps)) : null;
  const rainEnd0 = rainStart ? rainStart + rng.int(6, 20) : null;
  const cache = new Map<string, TyrePlan[]>();
  const variance = DIFFICULTY[c.difficulty].variance;
  const cars = grid.map((id, i): CarRaceState => {
    const d = c.drivers[id];
    const isP = id === c.playerDriverId;
    const p = isP ? plan : aiPlan(c, rng, track, id, d.teamId!, cache);
    return {
      driverId: id, teamId: d.teamId!, total: i * 0.3, lastLap: 0,
      compound: p.stints[0], tyreAge: 0, stintLaps: 0, compoundsUsed: [p.stints[0]],
      plan: toPlan(p), stops: 0, damage: 0, penalty: 0,
      form: rng.normal() * 0.18 * variance, // weekend form: setup, track feel
      mode: "normal", energy: 100, riskMod: 1, tempMods: [], grid: i + 1,
    };
  });
  return {
    rng: rng.state, trackId: track.id, lap: 0, totalLaps: track.laps, cars,
    wet: false, everWet: false, heavyRain: w.heavyRain,
    rainStart, rainEnd: rainEnd0 && rainEnd0 < track.laps - 1 ? rainEnd0 : null,
    scLapsLeft: 0, scUsed: false, feed: [{ lap: 0, text: `Lights out at the ${track.name}!`, tone: "info" }],
    pending: null, decisionsLeft: MAX_DECISIONS, firedKinds: [],
    playerDriverId: c.playerDriverId, teammateId: teammate, finished: false,
  };
}

// ---------- helpers ----------

export const running = (r: RaceState) => r.cars.filter((x) => !x.dnf).sort((a, b) => a.total - b.total);
export const carOf = (r: RaceState, id: string) => r.cars.find((x) => x.driverId === id)!;
const code = (c: Career, id: string) => c.drivers[id].code;

// Energy the car should still have at the end of `lap` to finish on plan driving Normal.
export const energyTarget = (r: RaceState, lap = r.lap) => 100 - (NORMAL_ENERGY_USE * lap) / r.totalLaps;

export function carTyreHealth(c: Career, r: RaceState, cr: CarRaceState) {
  return tyreHealth(cr.compound, cr.tyreAge, trackById(r.trackId), carDegFactor(c, cr));
}

function dryCompoundFor(remaining: number, used: Compound[], track: Track, df: number): Compound {
  const fits = (k: Compound) => lifeLaps(k, track, df) >= remaining;
  const opts: Compound[] = fits("S") ? ["S", "M", "H"] : fits("M") ? ["M", "H", "S"] : ["H", "M", "S"];
  const dryUsed = used.filter((x) => x !== "I" && x !== "W");
  if (dryUsed.length === 1) return opts.find((o) => o !== dryUsed[0])!;
  return opts[0];
}

function replanDry(c: Career, cr: CarRaceState, fromLap: number, totalLaps: number, track: Track) {
  const df = carDegFactor(c, cr);
  const remaining = totalLaps - fromLap;
  const first = dryCompoundFor(remaining, cr.compoundsUsed, track, df);
  cr.plan = [{ lap: fromLap, compound: first }];
  if (remaining > lifeLaps(first, track, df) * 1.05 && remaining > 12) {
    cr.plan.push({ lap: fromLap + Math.round(remaining / 2), compound: first === "H" ? "M" : "H" });
  }
}

// Bring the next stop forward to `lap`, keeping its compound (or forcing one).
function pitAt(c: Career, cr: CarRaceState, lap: number, r: RaceState, track: Track, compound?: Compound) {
  if (compound) {
    cr.plan = cr.plan.filter((p) => p.lap > lap + 6);
    cr.plan.unshift({ lap, compound });
  } else if (cr.plan.length) {
    cr.plan[0].lap = lap;
  } else {
    cr.plan.unshift({ lap, compound: dryCompoundFor(r.totalLaps - lap, cr.compoundsUsed, track, carDegFactor(c, cr)) });
  }
}

export const suggestedCompound = (c: Career, r: RaceState, cr: CarRaceState): Compound =>
  r.wet ? "I" : cr.plan[0]?.compound ?? dryCompoundFor(r.totalLaps - r.lap, cr.compoundsUsed, trackById(r.trackId), carDegFactor(c, cr));

function push(r: RaceState, text: string, tone: "info" | "good" | "bad" | "player" = "info") {
  r.feed.unshift({ lap: r.lap, text, tone });
  if (r.feed.length > 60) r.feed.pop();
}

function retire(c: Career, r: RaceState, cr: CarRaceState, why: string, lap: number) {
  cr.dnf = why;
  cr.dnfLap = lap;
  const mine = cr.driverId === r.playerDriverId;
  push(r, `${c.drivers[cr.driverId].name} OUT — ${why}`, mine ? "bad" : "info");
  if (why.includes("failure")) c.pendingGridPenalties[cr.driverId] = 5;
}

function swap(a: CarRaceState, b: CarRaceState) {
  const t = a.total;
  a.total = b.total;
  b.total = t;
}

// AI energy management: stay near the target, push when battling and ahead of schedule.
function aiMode(r: RaceState, cr: CarRaceState, close: boolean): DriveMode {
  const target = energyTarget(r);
  if (cr.energy < target - 3) return "save";
  if (close && cr.energy > target + 4) return "push";
  if (r.totalLaps - r.lap <= 5 && cr.energy > 8) return "push";
  return "normal";
}

// ---------- player controls ----------

export function setMode(c: Career, mode: DriveMode) {
  carOf(c.weekend!.race!, c.playerDriverId).mode = mode;
}

export function requestBox(c: Career, compound: Compound | null) {
  const r = c.weekend!.race!;
  const cr = carOf(r, c.playerDriverId);
  if (compound) {
    cr.boxRequest = compound;
    push(r, `Box, box! ${COMPOUNDS[compound].label}s next lap.`, "player");
  } else {
    cr.boxRequest = undefined;
    push(r, "Box cancelled, stay out.", "player");
  }
}

// ---------- lap simulation ----------

export function stepLap(c: Career) {
  const r = c.weekend!.race!;
  if (r.pending || r.finished) return;
  const track = trackById(r.trackId);
  const rng = new Rng(r.rng);
  const variance = DIFFICULTY[c.difficulty].variance;
  const lap = r.lap + 1;
  const energyPerLap = NORMAL_ENERGY_USE / r.totalLaps;
  let crashed = false;
  let scDeployed = false;

  // Weather transitions & AI reactions
  if (r.rainStart === lap) {
    r.wet = true;
    r.everWet = true;
    push(r, r.heavyRain ? "🌧 Heavy rain is falling!" : "🌦 Light rain is falling.", "info");
    for (const cr of r.cars) {
      if (cr.driverId === r.playerDriverId || cr.dnf) continue;
      if (r.heavyRain || rng.chance(0.5)) pitAt(c, cr, lap + rng.int(0, 2), r, track, "I");
    }
  }
  if (r.rainEnd === lap) {
    r.wet = false;
    push(r, "☀️ The rain has stopped. The track is drying.", "info");
    for (const cr of r.cars) {
      if (cr.driverId === r.playerDriverId || cr.dnf || cr.compound !== "I") continue;
      replanDry(c, cr, lap + rng.int(1, 3), r.totalLaps, track);
    }
  }

  const ordered = running(r);
  const before = new Map(ordered.map((x, i) => [x.driverId, i]));

  if (lap === 1) {
    for (const cr of ordered) {
      cr.total += rng.normal() * 0.5 * variance - (effStats(c, cr.driverId).composure - 75) / 60;
    }
    if (rng.chance(0.15)) {
      const victim = ordered[rng.int(Math.min(5, ordered.length - 1), ordered.length - 1)];
      retire(c, r, victim, "Lap 1 collision", lap);
      crashed = true;
    }
  }

  ordered.forEach((cr, i) => {
    if (cr.dnf) return;
    const isP = cr.driverId === r.playerDriverId;
    const s = effStats(c, cr.driverId);
    const team = c.teams[cr.teamId];
    cr.pitThisLap = false;
    if (!isP) {
      const ahead = ordered[i - 1], behind = ordered[i + 1];
      const close = (!!ahead && cr.total - ahead.total < 1.2) || (!!behind && behind.total - cr.total < 1);
      cr.mode = aiMode(r, cr, close);
    }
    const M = MODES[cr.mode];
    const df = carDegFactor(c, cr);

    if (r.scLapsLeft > 0) {
      cr.lastLap = track.baseLap * 1.4;
      cr.energy = Math.min(100, cr.energy + energyPerLap * 0.5); // harvesting behind the SC
    } else {
      const perf = combined(carTrackRating(team.stats, track), driverRaceRating(s, r.wet));
      let t = track.baseLap + (100 - perf) * SECONDS_PER_POINT;
      const comp = COMPOUNDS[cr.compound];
      if (r.wet) t += 3 + (cr.compound === "I" ? 0 : r.heavyRain ? 7 : 2.5);
      else t += cr.compound === "I" ? 3.5 : comp.pace;
      t += wearPenalty(cr.compound, cr.tyreAge, track, df);
      t += [0, 0.8, 2][cr.damage] + cr.form + M.pace;
      for (const m of cr.tempMods) t += m.pace;
      t += rng.normal() * 0.25 * (1.3 - s.consistency / 100) * variance;

      // Energy: running out means clipping (big slowdown) and no push benefit.
      const use = energyPerLap * M.energy;
      if (cr.energy - use < 0) {
        cr.energy = 0;
        t += CLIPPING_PENALTY - M.pace;
        if (!cr.clipping && isP) push(r, "⚡ Out of energy! You're clipping on the straights.", "bad");
        cr.clipping = true;
      } else {
        cr.energy -= use;
        cr.clipping = false;
      }

      const errP = 0.0035 * (1.5 - s.consistency / 100) * cr.riskMod * M.risk * (r.wet ? 2.5 : 1) * variance;
      if (rng.chance(errP)) {
        if (rng.chance(0.12)) {
          retire(c, r, cr, "Crash", lap);
          crashed = true;
          return;
        }
        const loss = rng.range(2, 5);
        t += loss;
        if (isP) push(r, `Mistake! You lose ${loss.toFixed(1)}s`, "bad");
      }
      const failP = ((100 - team.stats.reliability) / 100) ** 2 * 0.008 * cr.riskMod * (cr.mode === "push" ? 1.3 : 1);
      if (rng.chance(failP)) {
        retire(c, r, cr, rng.pick(["Power unit failure", "Gearbox failure", "Hydraulics failure"]), lap);
        return;
      }
      cr.lastLap = t;
    }
    cr.total += cr.lastLap;
    cr.tempMods = cr.tempMods.map((m) => ({ ...m, laps: m.laps - 1 })).filter((m) => m.laps > 0);

    // Pit stop: player request first, then the plan.
    let next: Compound | null = null;
    if (cr.boxRequest && lap < r.totalLaps) {
      next = cr.boxRequest;
      cr.boxRequest = undefined;
      cr.plan.shift(); // the manual stop replaces the next planned one
    } else if (cr.plan.length && cr.plan[0].lap <= lap && lap < r.totalLaps) {
      next = cr.plan.shift()!.compound;
    }
    if (next) {
      let loss = track.pitLoss * (r.scLapsLeft > 0 ? 0.55 : 1) + rng.normal() * 0.4;
      if (rng.chance(0.03)) {
        const extra = rng.range(3, 6);
        loss += extra;
        if (cr.teamId === c.playerTeamId) push(r, `Slow stop for ${code(c, cr.driverId)} (+${extra.toFixed(1)}s)`, "bad");
      }
      cr.total += loss;
      cr.lastLap += loss;
      cr.compound = next;
      cr.tyreAge = 0;
      cr.stintLaps = 0;
      cr.stops++;
      cr.pitThisLap = true;
      if (!cr.compoundsUsed.includes(next)) cr.compoundsUsed.push(next);
      if (cr.damage === 1) cr.damage = 0;
      if (cr.teamId === c.playerTeamId) {
        push(r, `${code(c, cr.driverId)} pits for ${COMPOUNDS[next].label}s`, isP ? "player" : "info");
      }
    } else {
      cr.tyreAge += r.scLapsLeft > 0 ? 0.4 : M.wear;
      cr.stintLaps++;
    }
  });

  // Safety car compresses the field; otherwise resolve overtakes.
  const field = running(r);
  if (r.scLapsLeft > 0) {
    for (let i = 1; i < field.length; i++) {
      const ahead = field[i - 1].total;
      field[i].total = ahead + Math.max(0.8, (field[i].total - ahead) * 0.4);
    }
    r.scLapsLeft--;
    if (r.scLapsLeft === 0) push(r, "🟢 Safety Car in. Racing resumes!", "info");
  } else {
    const ord = ordered.filter((x) => !x.dnf);
    for (let i = 1; i < ord.length; i++) {
      const A = ord[i - 1], B = ord[i];
      if (B.total >= A.total || A.pitThisLap || B.pitThisLap) continue;
      const sA = effStats(c, A.driverId), sB = effStats(c, B.driverId);
      const paceDelta = A.lastLap - B.lastLap;
      const p = Math.max(0.03, Math.min(0.92,
        0.2 + paceDelta * 0.35 + (sB.racecraft - sA.racecraft) / 120 - (track.overtaking - 2) * 0.13 + (B.mode === "push" ? 0.08 : 0)));
      if (rng.chance(p)) {
        B.total = Math.min(B.total, A.total - 0.2);
        ord[i - 1] = B;
        ord[i] = A;
        if (B.driverId === r.playerDriverId) push(r, `You pass ${code(c, A.driverId)}!`, "good");
        if (A.driverId === r.playerDriverId) push(r, `${code(c, B.driverId)} passes you`, "bad");
      } else {
        B.total = A.total + rng.range(0.2, 0.6);
      }
    }
    if ((crashed && rng.chance(0.65)) || rng.chance((track.sc * 0.4) / r.totalLaps)) {
      if (lap < r.totalLaps - 2) {
        r.scLapsLeft = rng.int(3, 5);
        r.scUsed = true;
        scDeployed = true;
        push(r, "🟡 SAFETY CAR deployed!", "info");
        for (const cr of running(r)) {
          if (cr.driverId === r.playerDriverId) continue;
          const life = lifeLaps(cr.compound, track, carDegFactor(c, cr));
          const soon = cr.plan.length && cr.plan[0].lap - lap <= 10;
          if ((soon || cr.tyreAge > life * 0.45) && rng.chance(0.8)) pitAt(c, cr, lap + 1, r, track);
        }
      }
    }
  }

  r.lap = lap;

  if (lap === 1) {
    const now = running(r).findIndex((x) => x.driverId === r.playerDriverId);
    const was = before.get(r.playerDriverId);
    if (now >= 0 && was !== undefined && now !== was) {
      const n = was - now;
      push(r, n > 0 ? `Great start! +${n} position${n > 1 ? "s" : ""}` : `Poor start, ${-n} position${n < -1 ? "s" : ""} lost`, n > 0 ? "good" : "bad");
    }
  }

  if (lap >= r.totalLaps) {
    r.finished = true;
    const lead = running(r)[0];
    if (lead) push(r, `🏁 ${c.drivers[lead.driverId].name} wins the ${track.name}!`, "good");
  } else {
    r.pending = nextDecision(c, r, rng, scDeployed);
  }
  r.rng = rng.state;
}

// ---------- decisions ----------

function fired(r: RaceState, k: string) {
  return r.firedKinds.filter((x) => x === k).length;
}

function nextDecision(c: Career, r: RaceState, rng: Rng, scDeployed: boolean): Decision | null {
  const P = carOf(r, r.playerDriverId);
  if (P.dnf) return null;
  const lap = r.lap;
  const field = running(r);
  const pos = field.indexOf(P);
  const ahead = field[pos - 1];
  const behind = field[pos + 1];
  const T = carOf(r, r.teammateId);
  const make = (kind: string, title: string, text: string, options: Decision["options"], ctx?: Decision["ctx"]): Decision => {
    r.firedKinds.push(kind);
    r.decisionsLeft--;
    return { kind, title, text, options, ctx };
  };

  // Forced events (always shown)
  if (r.rainStart && lap === r.rainStart - 2 && !fired(r, "weather")) {
    return make("weather", "Rain incoming", "Radar shows rain in ~2 laps. Intensity unknown.", [
      { id: "box_now", label: "Box now for Inters", hint: "Early, safe, slow until the rain arrives" },
      { id: "box_on_rain", label: "Box when it starts", hint: "Best timing if it's heavy" },
      { id: "stay_out", label: "Stay out on slicks", hint: "Great if it's only light" },
    ]);
  }
  if (r.wet && P.compound !== "I" && r.rainStart && lap === r.rainStart + 2 && !fired(r, "wet_slicks") && r.heavyRain && !P.boxRequest) {
    return make("wet_slicks", "Slicks in heavy rain!", "You're losing seconds every lap on slicks.", [
      { id: "box", label: "Box for Inters now" },
      { id: "stay", label: "Hang on, it might stop" },
    ]);
  }
  if (r.rainEnd && lap === r.rainEnd && P.compound === "I" && !fired(r, "drying")) {
    return make("drying", "Track drying", "A dry line is appearing. When do you switch back to slicks?", [
      { id: "now", label: "Box for slicks now", hint: "Gain time if the track is ready" },
      { id: "wait", label: "Wait 2-3 laps", hint: "Safer, but others may jump you" },
    ]);
  }
  if (scDeployed && lap < r.totalLaps - 3 && !P.boxRequest) {
    return make("sc", "Safety Car!", `Your tyres are ${P.stintLaps} laps old (${COMPOUNDS[P.compound].label}). A stop costs about half the usual time.`, [
      { id: "pit", label: "Box under Safety Car" },
      { id: "stay", label: "Stay out, keep track position" },
    ]);
  }

  // Optional events: capped, keep one in reserve for forced ones until late in the race.
  if (r.decisionsLeft <= 0 || (r.decisionsLeft < 2 && lap < r.totalLaps * 0.8) || r.scLapsLeft > 0 || lap < 3) return null;

  const nextStop = P.plan[0]?.lap ?? Infinity;
  if (T && !T.dnf && T.pitThisLap && Math.abs(T.total - P.total) < 6 && nextStop - lap <= 8 && nextStop > lap + 1 && !fired(r, "teammate_box") && !P.boxRequest) {
    return make("teammate_box", "Teammate boxes", `${c.drivers[T.driverId].name} just pitted, threatening the undercut on you.`, [
      { id: "cover", label: "Cover: box next lap" },
      { id: "extend", label: "Extend your stint (+4 laps)" },
    ]);
  }
  if (behind && behind.driverId === r.teammateId && behind.total - P.total < 1 && P.lastLap - behind.lastLap > 0.15 && !fired(r, "teammate_battle")) {
    return make("teammate_battle", "Teammate on your tail", `${c.drivers[T.driverId].name} is faster and right behind you.`, [
      { id: "hold", label: "Hold position", hint: "Risk of contact between teammates" },
      { id: "let_by", label: "Let them through", hint: "Safe for the team" },
    ]);
  }
  if (ahead && ahead.driverId !== r.teammateId && P.total - ahead.total < 1 && fired(r, "overtake") < 2 && rng.chance(0.35)) {
    return make("overtake", `Attack ${code(c, ahead.driverId)}`, `You're ${(P.total - ahead.total).toFixed(1)}s behind ${c.drivers[ahead.driverId].name} for P${pos}.`, [
      { id: "risky", label: "Risky lunge", hint: "Higher chance, risk of contact" },
      { id: "patient", label: "Patient attack", hint: "Normal chance, no extra risk" },
      { id: "save", label: "Back off, save tyres" },
    ], { target: ahead.driverId });
  }
  if (behind && behind.driverId !== r.teammateId && behind.total - P.total < 0.8 && behind.lastLap < P.lastLap && fired(r, "defend") < 2 && rng.chance(0.35)) {
    return make("defend", `Defend from ${code(c, behind.driverId)}`, `${c.drivers[behind.driverId].name} is all over your gearbox for P${pos + 1}.`, [
      { id: "hard", label: "Defend hard", hint: "Likely hold, risk contact/penalty" },
      { id: "normal", label: "Normal defence" },
      { id: "let_by", label: "Let them by, save tyres" },
    ], { attacker: behind.driverId });
  }
  if (!fired(r, "brakes") && lap > r.totalLaps * 0.25 && lap < r.totalLaps * 0.75 && rng.chance(0.25 / (r.totalLaps * 0.5))) {
    return make("brakes", "Brake temps rising", "Engineers see brake temperatures climbing on your car.", [
      { id: "lift", label: "Lift and coast", hint: "Lose ~0.35s/lap for 6 laps" },
      { id: "push", label: "Push through", hint: "Risk of failure" },
    ]);
  }
  return null;
}

export function decide(c: Career, optionId: string) {
  const r = c.weekend!.race!;
  const d = r.pending;
  if (!d) return;
  const track = trackById(r.trackId);
  const rng = new Rng(r.rng);
  const P = carOf(r, r.playerDriverId);
  const me = effStats(c, r.playerDriverId);
  const lap = r.lap;
  const out = (t: string, tone: "good" | "bad" | "player" = "player") => push(r, t, tone);

  const collision = (other: CarRaceState | undefined, blame: boolean) => {
    const roll = rng.next();
    if (roll < 0.1) {
      retire(c, r, P, "Collision damage", lap);
    } else {
      P.damage = roll < 0.4 ? 2 : 1;
      out(P.damage === 2 ? "Contact! Major damage to your car." : "Contact! Front wing damaged.", "bad");
    }
    if (other && !other.dnf) other.damage = Math.max(other.damage, 1) as 1 | 2;
    if (blame && rng.chance(0.4)) {
      P.penalty += 5;
      out("Stewards: 5-second time penalty for causing a collision.", "bad");
    }
  };
  const risk = P.riskMod * MODES[P.mode].risk;

  switch (d.kind) {
    case "weather":
      if (optionId === "box_now") { pitAt(c, P, lap + 1, r, track, "I"); out("Boxing for Inters now."); }
      else if (optionId === "box_on_rain") { pitAt(c, P, r.rainStart!, r, track, "I"); out("We'll box when the rain arrives."); }
      else out("Staying out on slicks.");
      break;
    case "wet_slicks":
      if (optionId === "box") { pitAt(c, P, lap + 1, r, track, "I"); out("Boxing for Inters."); }
      else out("Hanging on with slicks...");
      break;
    case "drying":
      if (optionId === "now") { replanDry(c, P, lap + 1, r.totalLaps, track); out("Boxing for slicks."); }
      else { replanDry(c, P, lap + 3, r.totalLaps, track); out("Waiting a few laps before slicks."); }
      break;
    case "sc":
      if (optionId === "pit") { pitAt(c, P, lap + 1, r, track); out("Box this lap."); }
      else out("Staying out.");
      break;
    case "teammate_box":
      if (optionId === "cover") { pitAt(c, P, lap + 1, r, track); out("Covering the undercut, box next lap."); }
      else { if (P.plan[0]) P.plan[0].lap = Math.min(r.totalLaps - 2, P.plan[0].lap + 4); out("Extending the stint."); }
      break;
    case "teammate_battle": {
      const T = carOf(r, r.teammateId);
      if (optionId === "let_by") { swap(P, T); out("You let your teammate through."); }
      else if (rng.chance(0.1)) { collision(T, false); out("Teammates collide! The garage is furious.", "bad"); }
      else out("You hold position. Clean battle.", "good");
      break;
    }
    case "overtake": {
      const A = carOf(r, String(d.ctx!.target));
      if (A.dnf) break;
      if (optionId === "save") {
        P.tyreAge = Math.max(0, P.tyreAge - 2);
        P.tempMods.push({ pace: 0.2, laps: 3 });
        out("Backing off to look after the tyres.");
        break;
      }
      const sA = effStats(c, A.driverId);
      const base = 0.35 + (A.lastLap - P.lastLap) * 0.3 + (me.racecraft - sA.racecraft) / 100 - (track.overtaking - 2) * 0.1;
      const p = Math.max(0.05, Math.min(0.9, base + (optionId === "risky" ? 0.3 : 0)));
      const contactP = optionId === "risky" ? 0.12 * risk * (1.3 - me.composure / 100) : 0;
      if (rng.chance(contactP)) collision(A, true);
      else if (rng.chance(p)) { swap(P, A); P.total -= 0.05; out(`Brilliant move on ${c.drivers[A.driverId].code}!`, "good"); }
      else out(`${c.drivers[A.driverId].code} holds you off.`, "bad");
      break;
    }
    case "defend": {
      const B = carOf(r, String(d.ctx!.attacker));
      if (B.dnf) break;
      if (optionId === "let_by") {
        swap(P, B);
        P.tyreAge = Math.max(0, P.tyreAge - 1.5);
        out(`You let ${c.drivers[B.driverId].code} by.`);
        break;
      }
      const sB = effStats(c, B.driverId);
      const adv = (P.lastLap - B.lastLap) * 0.3 + (sB.racecraft - me.racecraft) / 100;
      const hold = Math.max(0.1, Math.min(0.95, (optionId === "hard" ? 0.85 : 0.55) - adv));
      if (optionId === "hard" && rng.chance(0.08 * (1.3 - me.composure / 100) * risk)) collision(B, rng.chance(0.6));
      else if (rng.chance(hold)) out(`You hold off ${c.drivers[B.driverId].code}!`, "good");
      else { swap(P, B); out(`${c.drivers[B.driverId].code} gets past.`, "bad"); }
      break;
    }
    case "brakes":
      if (optionId === "lift") { P.tempMods.push({ pace: 0.35, laps: 6 }); out("Lifting and coasting to cool the brakes."); }
      else if (rng.chance(0.12 * (1.4 - c.teams[P.teamId].stats.reliability / 100))) retire(c, r, P, "Brake failure", lap);
      else out("Brakes survive. Phew.", "good");
      break;
  }
  r.pending = null;
  r.rng = rng.state;
}

// Run laps until the next decision or the end.
export function simToNextStop(c: Career) {
  const r = c.weekend!.race!;
  while (!r.pending && !r.finished) stepLap(c);
}

export function classify(r: RaceState) {
  const finishers = running(r);
  const dnfs = r.cars.filter((x) => x.dnf).sort((a, b) => (b.dnfLap ?? 0) - (a.dnfLap ?? 0));
  const dq: CarRaceState[] = [];
  const valid = finishers.filter((x) => {
    const dryUsed = new Set(x.compoundsUsed.filter((k) => k !== "I" && k !== "W"));
    if (!r.everWet && dryUsed.size < 2) { dq.push(x); return false; }
    return true;
  });
  for (const x of valid) x.total += x.penalty;
  valid.sort((a, b) => a.total - b.total);
  return { valid, dq, dnfs };
}
