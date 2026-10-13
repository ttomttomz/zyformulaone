import { describe, expect, it } from "vitest";
import { continueAfterRace, finishRace, newCareer, resolveSeasonEnd, startRace } from "./career";
import { decide, simToNextStop } from "./race";
import { carOverall, driverOverall, seatedDrivers } from "./ratings";
import { LENGTHS, DRIVER_LENGTHS, projectCost } from "./research";
import type { Career, Profile } from "./types";
import { runQualifying } from "./weekend";
import { trackById } from "./data/tracks";
import { degFactor, strategyOptions } from "./tyres";
import { carOf, stepLap } from "./race";

const make = (profile: Profile = "established", seed = 7) =>
  newCareer({ driverName: "Test Driver", profile, difficulty: "normal", teamName: "Zy", color: "#f00", color2: "#fff", seed });

function playRace(c: Career) {
  runQualifying(c, "normal");
  startRace(c, c.weekend!.strategies![0]);
  const r = c.weekend!.race!;
  for (;;) {
    simToNextStop(c);
    if (r.finished) break;
    decide(c, r.pending!.options[1]?.id ?? r.pending!.options[0].id);
  }
  return finishRace(c);
}

function playSeason(c: Career) {
  while (c.phase !== "seasonEnd") {
    playRace(c);
    continueAfterRace(c);
  }
}

describe("new career", () => {
  it("has 12 teams of 2 drivers, player team last", () => {
    const c = make();
    expect(c.teamOrder).toHaveLength(12);
    for (const id of c.teamOrder) expect(seatedDrivers(c, id)).toHaveLength(2);
    const mine = carOverall(c.teams.player.stats);
    for (const id of c.teamOrder) if (id !== "player") expect(carOverall(c.teams[id].stats)).toBeGreaterThan(mine);
  });

  it.each(["established", "superstar", "rookie"] as Profile[])("%s: teammate starts ~3 above the player", (p) => {
    const c = make(p);
    const mate = seatedDrivers(c, "player").find((d) => !d.isPlayer)!;
    const diff = driverOverall(mate.stats) - driverOverall(c.drivers.player.stats);
    expect(diff).toBeGreaterThan(2);
    expect(diff).toBeLessThan(4.5);
  });

  it("Verstappen starts at 90", () => {
    expect(Math.round(driverOverall(make().drivers.verstappen.stats))).toBe(90);
  });
});

describe("race", () => {
  it("is deterministic for a given seed", () => {
    const a = make("established", 99), b = make("established", 99);
    expect(playRace(a).order.map((o) => o.driverId)).toEqual(playRace(b).order.map((o) => o.driverId));
  });

  it("awards 101 points when 10+ cars finish", () => {
    const c = make();
    const res = playRace(c);
    const finished = res.order.filter((o) => o.status === "Finished").length;
    if (finished >= 10) expect(res.order.reduce((s, o) => s + o.points, 0)).toBe(101);
  });
});

describe("season", () => {
  it("runs a full season, keeps 2 drivers per team and enforces the top-3 rule", () => {
    const c = make("superstar", 3);
    playSeason(c);
    expect(c.seasonEnd).not.toBeNull();
    resolveSeasonEnd(c, null);
    expect(c.season).toBe(2027);
    for (const id of c.teamOrder) expect(seatedDrivers(c, id)).toHaveLength(2);
    const top3 = Object.values(c.drivers)
      .filter((d) => d.teamId && !d.retired)
      .sort((a, b) => driverOverall(b.stats) - driverOverall(a.stats))
      .slice(0, 3);
    expect(new Set(top3.map((d) => d.teamId)).size).toBe(3);
  });

  it("moves the player when an offer is accepted", () => {
    const c = make("superstar", 5);
    playSeason(c);
    const offer = c.seasonEnd!.offers.find((o) => !o.renewal);
    if (!offer) return;
    resolveSeasonEnd(c, offer);
    expect(c.contract.salary).toBe(offer.salary);
    expect(c.contract.until).toBe(2026 + offer.years);
    expect(c.playerTeamId).toBe(offer.teamId);
    expect(c.drivers.player.teamId).toBe(offer.teamId);
    expect(seatedDrivers(c, offer.teamId)).toHaveLength(2);
    expect(seatedDrivers(c, "player")).toHaveLength(2);
  });
});

describe("research", () => {
  it("long projects pay more per race than short ones", () => {
    for (const L of [LENGTHS, DRIVER_LENGTHS]) {
      expect(L.long.gain / L.long.races).toBeGreaterThan(L.medium.gain / L.medium.races);
      expect(L.medium.gain / L.medium.races).toBeGreaterThan(L.short.gain / L.short.races);
    }
  });

  it("costs rise steeply near the top", () => {
    expect(projectCost("car", "short", 90) / projectCost("car", "short", 50)).toBeGreaterThan(3.5);
  });
});

describe("v2 systems", () => {
  it("driving Normal all race uses ~95% of the energy", () => {
    const c = make("established", 13);
    runQualifying(c, "normal");
    startRace(c, c.weekend!.strategies![0]);
    const r = c.weekend!.race!;
    const P = carOf(r, "player");
    while (!r.finished) { stepLap(c); if (r.pending) decide(c, r.pending.options[0].id); if (P.dnf) return; }
    // Safety cars recharge a little, so allow some slack.
    expect(100 - P.energy).toBeGreaterThan(80);
    expect(100 - P.energy).toBeLessThanOrEqual(96);
  });

  it("best strategy differs between tracks", () => {
    const df = degFactor(75, 70);
    const best = ["monaco", "canada", "italy", "brazil"].map((id) => strategyOptions(trackById(id), df)[0].stints.length);
    expect(new Set(best).size).toBeGreaterThan(1);
  });

  it("pays the player's salary from the team budget", () => {
    const c = make();
    const wallet = c.wallet;
    playRace(c);
    expect(c.wallet).toBeGreaterThan(wallet);
    expect(c.weekend!.result!.earnings).toBeCloseTo(c.contract.salary / 24, 1);
  });

  it("AI teams and drivers evolve over a season", () => {
    const c = make("established", 17);
    const before = Object.fromEntries(c.teamOrder.map((id) => [id, carOverall(c.teams[id].stats)]));
    const drvBefore = driverOverall(c.drivers.norris.stats);
    playSeason(c);
    const moved = c.teamOrder.filter((id) => id !== "player" && Math.abs(carOverall(c.teams[id].stats) - before[id]) > 0.5);
    expect(moved.length).toBeGreaterThan(6);
    expect(c.news.some((n) => n.includes("upgrade package"))).toBe(true);
    expect(driverOverall(c.drivers.norris.stats)).not.toBeCloseTo(drvBefore, 1);
  });
});
