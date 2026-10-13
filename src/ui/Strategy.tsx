import { useState } from "react";
import { effStats } from "../engine/boosts";
import { startRace } from "../engine/career";
import { trackById } from "../engine/data/tracks";
import { clampPitLaps, COMPOUNDS, degFactor, estimatePlan, lifeLaps } from "../engine/tyres";
import { startingGrid } from "../engine/weekend";
import type { Career, Compound } from "../engine/types";
import type { Act } from "./App";
import { teamOf, TeamSwatch, Tyre } from "./common";
import { Forecast } from "./Hub";

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}`;
};

export const TYRE_COLOR: Record<Compound, string> = { S: "#ef4444", M: "#facc15", H: "#f3f4f6", I: "#22c55e", W: "#3b82f6" };

export function Strategy({ c, act }: { c: Career; act: Act }) {
  const w = c.weekend!;
  const track = trackById(w.trackId);
  const rows = w.quali!;
  const grid = startingGrid(c);
  const myGrid = grid.indexOf(c.playerDriverId) + 1;
  const pole = rows[0].time!;
  const shown = rows.filter((r, i) => i < 5 || teamOf(c, r.driverId)?.id === c.playerTeamId);
  const opts = w.strategies!;
  const df = degFactor(effStats(c, c.playerDriverId).tyreMgmt, c.teams[c.playerTeamId].stats.tyreKind);
  const best = opts[0].estTime;

  const [sel, setSel] = useState(0);
  const [laps, setLaps] = useState<number[]>(opts[0].pitLaps);
  const opt = opts[sel];
  const plan = { stints: opt.stints, pitLaps: laps };
  const est = estimatePlan(plan, track, df);
  const choose = (i: number) => { setSel(i); setLaps(opts[i].pitLaps); };
  const nudge = (i: number, d: number) => setLaps((l) => clampPitLaps(l.map((x, j) => (j === i ? x + d : x)), track.laps));

  const bounds = [0, ...laps, track.laps];

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <div className="muted small">Qualifying · {track.name}{w.qualiWet ? " · 🌧 Wet" : ""}</div>
          <h2>You start P{myGrid}</h2>
        </div>
      </div>
      <div className="tower">
        {shown.map((r) => {
          const i = rows.indexOf(r);
          const t = teamOf(c, r.driverId)!;
          const me = r.driverId === c.playerDriverId;
          return (
            <div key={r.driverId} className={`r ${me ? "me" : t.id === c.playerTeamId ? "mate" : ""}`}>
              <span className="pos num">{i + 1}</span>
              <TeamSwatch color={t.color} />
              <span>{c.drivers[r.driverId].name}</span>
              <span className="muted small">{r.note ?? ""}</span>
              <span className="gap num">{r.time === null ? "No time" : i === 0 ? fmtTime(r.time) : `+${(r.time - pole).toFixed(3)}`}</span>
            </div>
          );
        })}
      </div>
      {w.gridPenalties[c.playerDriverId] ? <div className="pill bad">Includes a {w.gridPenalties[c.playerDriverId]}-place grid penalty</div> : null}

      <h3>Tyre strategy</h3>
      <div className="panel small"><Forecast c={c} /><div className="muted" style={{ marginTop: 4 }}>Plans are for a dry race. In rain, use the Box button or the pit wall calls.</div></div>
      {opts.map((o, i) => (
        <button key={o.id} className={`full ${sel === i ? "selected" : ""}`} onClick={() => choose(i)}>
          <div className="row between">
            <div className="row" style={{ gap: 4 }}>
              {o.stints.map((s, j) => (
                <span key={j} className="row" style={{ gap: 4 }}>
                  {j > 0 && <span className="muted">›</span>}
                  <Tyre c={s} />
                </span>
              ))}
            </div>
            <span className="num small">{i === 0 ? "⚡ Fastest" : `+${(o.estTime - best).toFixed(1)}s`}</span>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>{o.name}</div>
        </button>
      ))}

      <div className="panel">
        <div className="row between">
          <b>Pit window</b>
          <span className="num small">{est - best < 0.05 ? "Optimal" : `+${(est - best).toFixed(1)}s vs best`}</span>
        </div>
        <div className="stintbar">
          {opt.stints.map((s, i) => {
            const len = bounds[i + 1] - bounds[i];
            const life = lifeLaps(s, track, df);
            const over = Math.max(0, len - life);
            return (
              <div key={i} style={{ flex: len, background: TYRE_COLOR[s] }} title={`${COMPOUNDS[s].label}: ${len} laps (life ~${Math.round(life)})`}>
                {over > 0 && <div className="over" style={{ width: `${(over / len) * 100}%` }} />}
                <span>{len}</span>
              </div>
            );
          })}
        </div>
        <div className="muted small" style={{ marginTop: 4 }}>Numbers = laps per stint. Striped = beyond the tyre's life (big time loss).</div>
        {laps.map((l, i) => (
          <div key={i} className="row between" style={{ marginTop: 8 }}>
            <span className="row" style={{ gap: 6 }}>
              Stop {i + 1}: <Tyre c={opt.stints[i]} /> › <Tyre c={opt.stints[i + 1]} />
            </span>
            <span className="row">
              <button className="small" onClick={() => nudge(i, -3)}>−3</button>
              <button className="small" onClick={() => nudge(i, -1)}>−1</button>
              <b className="num" style={{ width: 54, textAlign: "center" }}>Lap {l}</b>
              <button className="small" onClick={() => nudge(i, 1)}>+1</button>
              <button className="small" onClick={() => nudge(i, 3)}>+3</button>
            </span>
          </div>
        ))}
        <div className="small muted" style={{ marginTop: 8 }}>
          Tyre life for you here: {(["S", "M", "H"] as Compound[]).map((k) => `${COMPOUNDS[k].label} ~${Math.round(lifeLaps(k, track, df))}`).join(" · ")} laps
        </div>
      </div>

      <button className="primary" onClick={() => act((x) => startRace(x, plan))}>Start the race</button>
    </div>
  );
}
