import { useState } from "react";
import { BOOSTS, buyBoost, MAX_BOOSTS } from "../engine/boosts";
import { canSetSalary, driverStandings, MAX_OWN_SALARY, setSalary, teamStandings } from "../engine/career";
import { degLabel, overtakingLabel, TRACKS } from "../engine/data/tracks";
import {
  CAR_STAT_LABEL, CAR_WEIGHTS, carOverall, carTrackRating, DRIVER_STAT_LABEL, DRIVER_WEIGHTS, driverOverall, seatedDrivers,
} from "../engine/ratings";
import { currentStatValue, fundsFor, lengthsFor, projectCost, SLOTS, startResearch } from "../engine/research";
import type { Career, CarStat, DriverStat, QualiApproach, ResearchLength } from "../engine/types";
import { CAR_STATS, DRIVER_STATS } from "../engine/types";
import { runQualifying } from "../engine/weekend";
import type { Act } from "./App";
import { Delta, fmtM, freeSlots, StatBar, TeamSwatch } from "./common";

type Tab = "race" | "team" | "rnd" | "standings" | "news";

export function Hub({ c, act, onQuit }: { c: Career; act: Act; onQuit: () => void }) {
  const [tab, setTab] = useState<Tab>("race");
  const team = c.teams[c.playerTeamId];
  return (
    <div>
      <div className="topbar">
        <div>
          <div style={{ fontWeight: 800 }}>{c.season} · Round {c.round + 1}/{TRACKS.length}</div>
          <div className="muted small row"><TeamSwatch color={team.color} />{team.name}</div>
        </div>
        <div className="row">
          <div className="center small">
            <div className="pill num" title="Team budget">🏢 {fmtM(team.budget)}</div>
            <div className="pill num" title="Your personal money" style={{ marginTop: 3 }}>👤 {fmtM(c.wallet)}</div>
          </div>
          <button className="small ghost" onClick={onQuit}>Menu</button>
        </div>
      </div>
      {tab === "race" && <NextRace c={c} act={act} goRnd={() => setTab("rnd")} />}
      {tab === "team" && <TeamTab c={c} act={act} />}
      {tab === "rnd" && <Research c={c} act={act} />}
      {tab === "standings" && <Standings c={c} />}
      {tab === "news" && <News c={c} />}
      <nav className="tabs">
        <div>
          {([["race", "🏁", "Race"], ["team", "🏎️", "Team"], ["rnd", "🔬", "R&D"], ["standings", "🏆", "Standings"], ["news", "📰", "News"]] as const).map(
            ([k, ico, label]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                <span className="ico">{ico}</span>{label}
                {k === "rnd" && freeSlots(c, SLOTS) > 0 && <span className="badge">{freeSlots(c, SLOTS)}</span>}
              </button>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

const APPROACHES: { id: QualiApproach; label: string; hint: string }[] = [
  { id: "safe", label: "Safe", hint: "Slower, almost no mistakes" },
  { id: "normal", label: "Normal", hint: "Balanced" },
  { id: "aggressive", label: "Aggressive", hint: "Faster, error risk depends on Consistency" },
];

export function Forecast({ c }: { c: Career }) {
  const w = c.weekend!;
  const p = Math.round(w.rainForecast * 100);
  const icon = p >= 50 ? "🌧" : p >= 25 ? "🌦" : p >= 10 ? "⛅" : "☀️";
  return (
    <div className="row between">
      <span className="muted">Race forecast</span>
      <span className="num">
        {icon} {p}% rain{p >= 15 ? ` · likely laps ${w.rainWindow[0]}–${w.rainWindow[1]}` : ""}
      </span>
    </div>
  );
}

function NextRace({ c, act, goRnd }: { c: Career; act: Act; goRnd: () => void }) {
  const track = TRACKS[c.round];
  const w = c.weekend!;
  const [err, setErr] = useState<string | null>(null);
  const ranking = c.teamOrder
    .map((id) => ({ id, r: carTrackRating(c.teams[id].stats, track) }))
    .sort((a, b) => b.r - a.r);
  const myRank = ranking.findIndex((x) => x.id === c.playerTeamId) + 1;
  const penalty = w.gridPenalties[c.playerDriverId];
  const free = freeSlots(c, SLOTS);
  return (
    <div className="stack">
      {free > 0 && (
        <button className="full panel rnd-panel" onClick={goRnd}>
          <b>🔬 {free} R&D slot{free > 1 ? "s" : ""} free</b>
          <div className="small muted">Start a project before the race. Progress happens after every race.</div>
        </button>
      )}
      <div className="panel">
        <div className="muted small">Round {c.round + 1} · {track.country}</div>
        <h2>{track.name}</h2>
        <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
          {track.traits.map((t) => <span key={t} className="pill">{t}</span>)}
        </div>
        <table className="t" style={{ marginTop: 10 }}>
          <tbody>
            <tr><td className="muted">Laps</td><td className="r num">{track.laps}</td></tr>
            <tr><td className="muted">Overtaking</td><td className="r">{overtakingLabel(track.overtaking)}</td></tr>
            <tr><td className="muted">Tyre degradation</td><td className="r">{degLabel(track.deg)}</td></tr>
            <tr><td className="muted">Safety Car likelihood</td><td className="r num">{Math.round(track.sc * 100)}%</td></tr>
            <tr><td className="muted">Your car here</td><td className="r num">#{myRank} of {ranking.length}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 8 }}><Forecast c={c} /></div>
        {penalty ? <div className="pill bad" style={{ marginTop: 8 }}>Grid penalty: −{penalty} places</div> : null}
        {w.qualiWet ? <div className="pill warn" style={{ marginTop: 8 }}>Wet qualifying expected</div> : null}
      </div>

      <h3>Weekend prep <span className="muted small">({w.boosts.length}/{MAX_BOOSTS}, personal money)</span></h3>
      <div className="grid2">
        {BOOSTS.map((b) => {
          const on = w.boosts.includes(b.id);
          return (
            <button
              key={b.id}
              className={`small ${on ? "selected" : ""}`}
              disabled={!on && (w.boosts.length >= MAX_BOOSTS || c.wallet < b.cost)}
              onClick={() => { if (!on) act((x) => { setErr(buyBoost(x, b.id)); }); }}
            >
              <div className="row between"><b>{b.label}</b>{on && "✓"}</div>
              <div className="muted">+{b.amount} {DRIVER_STAT_LABEL[b.stat]} · {fmtM(b.cost)}</div>
            </button>
          );
        })}
      </div>
      {err && <div className="pill bad">{err}</div>}

      <h3>Qualifying approach</h3>
      {APPROACHES.map((a) => (
        <button key={a.id} className="full" onClick={() => act((x) => { runQualifying(x, a.id); })}>
          <b>{a.label}</b>
          <div className="muted small">{a.hint}</div>
        </button>
      ))}
    </div>
  );
}

function TeamTab({ c, act }: { c: Career; act: Act }) {
  const me = c.drivers[c.playerDriverId];
  const team = c.teams[c.playerTeamId];
  const mate = seatedDrivers(c, c.playerTeamId).find((d) => d.id !== me.id);
  const potLo = Math.max(Math.round(driverOverall(me.stats)), me.potential - 3);
  const ss = c.seasonStart;
  const carStart = ss.teamId === c.playerTeamId ? ss.car : undefined;
  const drvStart = ss.driver;
  const ct = c.contract;
  const own = c.playerTeamId === c.ownTeamId;
  return (
    <div className="stack">
      <div className="panel">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{me.name}</div>
            <div className="muted small">Age {me.age} · Potential {potLo}–{me.potential + 3}</div>
          </div>
          <div className="center">
            <div className="ovr num">{driverOverall(me.stats).toFixed(1)}</div>
            <Delta v={driverOverall(me.stats) - driverOverall(drvStart)} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {DRIVER_STATS.map((k) => <StatBar key={k} label={`${DRIVER_STAT_LABEL[k]} ${Math.round(DRIVER_WEIGHTS[k] * 100)}%`} value={me.stats[k]} start={drvStart[k]} />)}
        </div>
      </div>

      <div className="panel">
        <div className="row between">
          <b>Contract</b>
          <span className="pill num">👤 {fmtM(c.wallet)}</span>
        </div>
        <table className="t" style={{ marginTop: 6 }}>
          <tbody>
            <tr><td className="muted">Team</td><td className="r">{team.name}{own ? " (you own it)" : ""}</td></tr>
            <tr><td className="muted">Salary</td><td className="r num">{fmtM(ct.salary)} / season</td></tr>
            {!own && <tr><td className="muted">Bonuses</td><td className="r num">{fmtM(ct.pointBonus)}/pt · {fmtM(ct.winBonus)}/win</td></tr>}
            {!own && <tr><td className="muted">Until</td><td className="r num">end of {ct.until}</td></tr>}
            <tr><td className="muted">Career earnings</td><td className="r num">{fmtM(c.careerStats.earnings)}</td></tr>
          </tbody>
        </table>
        {own && (
          canSetSalary(c) ? (
            <div style={{ marginTop: 8 }}>
              <div className="small muted">Set your salary for {c.season}. It is paid from the team budget: more for your training and boosts, less for the car.</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="small" onClick={() => act((x) => setSalary(x, x.contract.salary - 1))}>−1</button>
                <input type="range" min={0} max={MAX_OWN_SALARY} step={0.5} value={ct.salary} className="grow"
                  onChange={(e) => act((x) => setSalary(x, Number(e.target.value)))} />
                <button className="small" onClick={() => act((x) => setSalary(x, x.contract.salary + 1))}>+1</button>
              </div>
            </div>
          ) : (
            <div className="small muted" style={{ marginTop: 6 }}>You can change your salary before the first race of next season.</div>
          )
        )}
      </div>

      <div className="panel">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }} className="row"><TeamSwatch color={team.color} />{team.name}</div>
            <div className="muted small">Car</div>
          </div>
          <div className="center">
            <div className="ovr num">{carOverall(team.stats).toFixed(1)}</div>
            {carStart && <Delta v={carOverall(team.stats) - carOverall(carStart)} />}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {CAR_STATS.map((k) => <StatBar key={k} label={`${CAR_STAT_LABEL[k]} ${Math.round(CAR_WEIGHTS[k] * 100)}%`} value={team.stats[k]} start={carStart?.[k]} />)}
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>Green = gained this season.</div>
      </div>
      {mate && (
        <div className="panel row between">
          <div>
            <div className="muted small">Teammate</div>
            <div style={{ fontWeight: 700 }}>{mate.name}</div>
            <div className="muted small">Age {mate.age} · contract to {mate.contractEnd}</div>
          </div>
          <div className="ovr num">{Math.round(driverOverall(mate.stats))}</div>
        </div>
      )}
    </div>
  );
}

function Research({ c, act }: { c: Career; act: Act }) {
  const [picking, setPicking] = useState<"car" | "driver" | null>(null);
  const [stat, setStat] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const slots = (["car", "driver"] as const).flatMap((target) => {
    const active = c.research.filter((p) => p.target === target);
    return Array.from({ length: SLOTS[target] }, (_, i) => ({ target, p: active[i] ?? null }));
  });

  const statsFor = (t: "car" | "driver") => (t === "car" ? CAR_STATS : DRIVER_STATS) as readonly string[];
  const labelFor = (t: "car" | "driver", k: string) => (t === "car" ? CAR_STAT_LABEL[k as CarStat] : DRIVER_STAT_LABEL[k as DriverStat]);

  return (
    <div className="stack">
      <div className="muted small">
        Car research is paid by the team (🏢), driver training by you (👤). Longer projects pay more per race, but lock the slot
        and carry a small risk. Costs rise steeply as a stat gets higher.
      </div>
      {slots.map(({ target, p }, i) => (
        <div key={i} className="panel">
          <div className="muted small">{target === "car" ? "🔧 Car research slot · 🏢" : "🏋️ Driver training slot · 👤"}</div>
          {p ? (
            <>
              <div className="row between">
                <b>{labelFor(target, p.stat)} +{p.gain}</b>
                <span className="muted small num">{p.racesLeft} race{p.racesLeft > 1 ? "s" : ""} left</span>
              </div>
              <div className="progress">
                <div style={{ width: `${(1 - p.racesLeft / lengthsFor(target)[p.length].races) * 100}%` }} />
              </div>
            </>
          ) : (
            <button className="small" style={{ marginTop: 6 }} onClick={() => { setPicking(target); setStat(null); setErr(null); }}>
              + Start project
            </button>
          )}
        </div>
      ))}

      {picking && (
        <div className="modal-bg" onClick={() => setPicking(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2>{picking === "car" ? "Car research" : "Driver training"}</h2>
              <span className="pill num">{picking === "car" ? "🏢" : "👤"} {fmtM(fundsFor(c, picking))}</span>
            </div>
            <h3>Stat</h3>
            <div className="grid2">
              {statsFor(picking).map((k) => {
                const busy = c.research.some((p) => p.target === picking && p.stat === k);
                return (
                  <button key={k} disabled={busy} className={`small ${stat === k ? "selected" : ""}`} onClick={() => setStat(k)}>
                    {labelFor(picking, k)} <span className="muted num">{currentStatValue(c, picking, k).toFixed(1)}</span>
                  </button>
                );
              })}
            </div>
            {stat && (
              <>
                <h3>Duration</h3>
                {(["short", "medium", "long"] as ResearchLength[]).map((len) => {
                  const L = lengthsFor(picking)[len];
                  const cost = projectCost(picking, len, currentStatValue(c, picking, stat));
                  return (
                    <button
                      key={len}
                      className="opt full"
                      disabled={cost > fundsFor(c, picking)}
                      onClick={() => {
                        let e: string | null = null;
                        act((x) => { e = startResearch(x, picking, stat as CarStat | DriverStat, len); });
                        setErr(e);
                        setPicking(null);
                      }}
                    >
                      <div className="row between">
                        <b>{L.label}: +{L.gain}</b>
                        <span className="num">{fmtM(cost)}</span>
                      </div>
                      <span className="hint">{L.races} races · {(L.gain / L.races).toFixed(2)} per race{len === "long" ? " · small risk of delay" : ""}</span>
                    </button>
                  );
                })}
              </>
            )}
            <button className="ghost full center" style={{ marginTop: 10 }} onClick={() => setPicking(null)}>Cancel</button>
          </div>
        </div>
      )}
      {err && <div className="pill bad">{err}</div>}
    </div>
  );
}

function Standings({ c }: { c: Career }) {
  const [mode, setMode] = useState<"d" | "t">("d");
  const ds = driverStandings(c);
  const ts = teamStandings(c);
  const ss = c.seasonStart;
  return (
    <div>
      <div className="grid2" style={{ marginBottom: 10 }}>
        <button className={`center ${mode === "d" ? "selected" : ""}`} onClick={() => setMode("d")}>Drivers</button>
        <button className={`center ${mode === "t" ? "selected" : ""}`} onClick={() => setMode("t")}>Constructors</button>
      </div>
      <table className="t">
        <tbody>
          {mode === "d"
            ? ds.map(([id, pts], i) => {
                const d = c.drivers[id];
                const t = d.teamId ? c.teams[d.teamId] : null;
                const ov = driverOverall(d.stats);
                return (
                  <tr key={id} className={id === c.playerDriverId ? "me" : ""}>
                    <td className="num muted">{i + 1}</td>
                    <td><div className="row"><TeamSwatch color={t?.color ?? "#555"} />{d.name}</div></td>
                    <td className="r num muted">{ov.toFixed(1)} {ss.driverOverall[id] !== undefined && <Delta v={ov - ss.driverOverall[id]} />}</td>
                    <td className="r num">{pts}</td>
                  </tr>
                );
              })
            : ts.map(([id, pts], i) => {
                const ov = carOverall(c.teams[id].stats);
                return (
                  <tr key={id} className={id === c.playerTeamId ? "me" : ""}>
                    <td className="num muted">{i + 1}</td>
                    <td><div className="row"><TeamSwatch color={c.teams[id].color} />{c.teams[id].name}</div></td>
                    <td className="r num muted">{ov.toFixed(1)} {ss.teamOverall[id] !== undefined && <Delta v={ov - ss.teamOverall[id]} />}</td>
                    <td className="r num">{pts}</td>
                  </tr>
                );
              })}
        </tbody>
      </table>
      <div className="muted small" style={{ marginTop: 6 }}>Grey = current rating, coloured = change this season.</div>
    </div>
  );
}

function News({ c }: { c: Career }) {
  return (
    <div className="stack">
      {c.offseason.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Off-season</h3>
          {c.offseason.map((m, i) => <div key={i} className="small" style={{ padding: "3px 0" }}>{m}</div>)}
        </div>
      )}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Paddock news</h3>
        {c.news.map((m, i) => <div key={i} className="small" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}>{m}</div>)}
      </div>
      {c.milestones.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Milestones</h3>
          {c.milestones.map((m) => <div key={m} className="small">🏅 {m}</div>)}
        </div>
      )}
    </div>
  );
}
