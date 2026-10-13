// Headless balance check: plays careers with a simple auto-player and prints key numbers.
// Usage: npm run balance -- [seasons] [profile] [difficulty]
import { continueAfterRace, driverStandings, finishRace, newCareer, resolveSeasonEnd, startRace, teamStandings } from "../src/engine/career";
import { decide, simToNextStop } from "../src/engine/race";
import { carOverall, driverOverall } from "../src/engine/ratings";
import { currentStatValue, projectCost, SLOTS, startResearch } from "../src/engine/research";
import { runQualifying } from "../src/engine/weekend";
import { CAR_STATS, DRIVER_STATS, type Difficulty, type Profile } from "../src/engine/types";

const seasons = Number(process.argv[2] ?? 3);
const profile = (process.argv[3] ?? "established") as Profile;
const difficulty = (process.argv[4] ?? "normal") as Difficulty;

const c = newCareer({ driverName: "Test Driver", profile, difficulty, teamName: "Zy Racing", color: "#E10600", color2: "#FFFFFF", seed: 42 });

let dnfs = 0, races = 0, sc = 0, rain = 0, dsq = 0, decisions = 0;
const lapGaps: number[] = [];
const stops: Record<number, number> = {};

for (let s = 0; s < seasons; s++) {
  while (c.phase !== "seasonEnd") {
    // Research: keep slots busy with long projects on the weakest stat.
    for (const target of ["car", "driver"] as const) {
      while (c.research.filter((p) => p.target === target).length < SLOTS[target]) {
        const stats = target === "car" ? CAR_STATS : DRIVER_STATS;
        const free = stats.filter((k) => !c.research.some((p) => p.stat === k));
        const k = free.sort((a, b) => currentStatValue(c, target, a) - currentStatValue(c, target, b))[0];
        const funds = target === "car" ? c.teams[c.playerTeamId].budget : c.wallet;
        const len = funds > projectCost(target, "long", currentStatValue(c, target, k)) + (target === "car" ? 5 : 0.5) ? "long" : "short";
        if (startResearch(c, target, k, len)) break;
      }
    }
    runQualifying(c, "normal");
    startRace(c, c.weekend!.strategies![0]);
    const r = c.weekend!.race!;
    for (;;) {
      simToNextStop(c);
      if (r.finished) break;
      decisions++;
      decide(c, r.pending!.options[0].id);
    }
    races++;
    if (r.scUsed) sc++;
    if (r.everWet) rain++;
    const res = finishRace(c);
    dnfs += res.order.filter((o) => o.status !== "Finished" && !o.status.startsWith("DSQ")).length;
    dsq += res.order.filter((o) => o.status.startsWith("DSQ")).length;
    const fin = r.cars.filter((x) => !x.dnf).sort((a, b) => a.total - b.total);
    lapGaps.push((fin[fin.length - 1].total - fin[0].total) / r.totalLaps);
    for (const x of r.cars) stops[x.stops] = (stops[x.stops] ?? 0) + 1;
    continueAfterRace(c);
  }
  const ds = driverStandings(c), ts = teamStandings(c);
  const name = (id: string) => c.drivers[id].name;
  console.log(`\n=== Season ${c.season} ===`);
  console.log("Drivers:", ds.slice(0, 5).map(([id, p]) => `${name(id)} ${p}`).join(" | "));
  console.log("Teams:  ", ts.map(([id, p]) => `${c.teams[id].name} ${p}`).join(" | "));
  console.log(`Wallet $${c.wallet}M, salary $${c.contract.salary}M`);
  console.log(`Player: P${ds.findIndex(([id]) => id === "player") + 1} (${c.points.drivers.player} pts), driver ovr ${driverOverall(c.drivers.player.stats).toFixed(1)}, ` +
    `team ${c.teams[c.playerTeamId].name} car ovr ${carOverall(c.teams[c.playerTeamId].stats).toFixed(1)}, budget ${c.teams[c.playerTeamId].budget}`);
  console.log("Car overall:", c.teamOrder.map((id) => `${c.teams[id].name} ${carOverall(c.teams[id].stats).toFixed(1)}`).join(", "));
  console.log("Offers:", c.seasonEnd!.offers.map((o) => c.teams[o.teamId].name).join(", ") || "none", "| Retirements:", c.seasonEnd!.retirements.join(", ") || "none");
  resolveSeasonEnd(c, null);
  console.log("Off-season:", c.offseason.slice(0, 12).join(" · "));
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`\nRaces ${races}: DNFs/race ${(dnfs / races).toFixed(2)}, DSQ ${dsq}, SC ${((sc / races) * 100).toFixed(0)}%, rain ${((rain / races) * 100).toFixed(0)}%, ` +
  `decisions/race ${(decisions / races).toFixed(1)}, first→last gap ${avg(lapGaps).toFixed(2)} s/lap, stops`, stops);
