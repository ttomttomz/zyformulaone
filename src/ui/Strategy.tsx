import { useState } from "react";
import { effStats } from "../engine/boosts";
import { startRace } from "../engine/career";
import { trackById } from "../engine/data/tracks";
import { clampPitLaps, COMPOUNDS, degFactor, estimatePlan, lifeLaps } from "../engine/tyres";
import { startingGrid } from "../engine/weekend";
import type { Career, Compound } from "../engine/types";
import type { Act } from "./App";
import { Fold, NextAction, Section, Stepper, teamOf, TeamSwatch, Tyre } from "./common";
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

  const pos = (id: string) => rows.findIndex((r) => r.driverId === id) + 1;
  const mateId = rows.find((r) => r.driverId !== c.playerDriverId && teamOf(c, r.driverId)?.id === c.playerTeamId)?.driverId;

  return (
    <div className="screen no-tabs">
      <Stepper current="Strategy" />

      <div className="screen-head">
        <div>
          <div className="kicker">Qualifying · {track.name}{w.qualiWet ? " · 🌧 Wet" : ""}</div>
          <h2>You start P{myGrid}</h2>
          {w.gridPenalties[c.playerDriverId] ? <div className="pill bad" style={{ marginTop: 6 }}>Includes a {w.gridPenalties[c.playerDriverId]}-place grid penalty</div> : null}
        </div>
      </div>

      <Fold summary={<span className="small">🏁 Pole: <b>{c.drivers[rows[0].driverId].name}</b>{mateId ? ` · Teammate P${pos(mateId)}` : ""} · <span className="muted">full results</span></span>}>
        <div className="tower">
          {rows.map((r, i) => {
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
      </Fold>

      <Section step={1} title="Choose a tyre plan" hint="Best plans for your car here, fastest first. Times assume a dry race.">
        <div className="panel small"><Forecast c={c} /></div>
        <div className="choice-list">
          {opts.map((o, i) => (
            <button key={o.id} className={`choice ${sel === i ? "selected" : ""}`} onClick={() => choose(i)}>
              <span className="radio" />
              <span className="row grow" style={{ gap: 4 }}>
                {o.stints.map((s, j) => (
                  <span key={j} className="row" style={{ gap: 4 }}>
                    {j > 0 && <span className="muted">›</span>}
                    <Tyre c={s} />
                  </span>
                ))}
                <span className="muted small" style={{ marginLeft: 6 }}>{o.stints.length - 1}-stop</span>
              </span>
              <span className="num small">{i === 0 ? "⚡ Fastest" : `+${(o.estTime - best).toFixed(1)}s`}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section step={2} title="Set your pit stops" hint="Move each stop earlier or later. Striped = past the tyre's life (big time loss).">
        <div className="panel">
          <div className="stintbar">
            {opt.stints.map((s, i) => {
              const len = bounds[i + 1] - bounds[i];
              const life = lifeLaps(s, track, df);
              const over = Math.max(0, len - life);
              return (
                <div key={i} style={{ flex: len, background: TYRE_COLOR[s] }} title={`${COMPOUNDS[s].label}: ${len} laps (life ~${Math.round(life)})`}>
                  {over > 0 && <div className="over" style={{ width: `${(over / len) * 100}%` }} />}
                  <span>{len} laps</span>
                </div>
              );
            })}
          </div>
          {laps.map((l, i) => (
            <div key={i} className="pitrow">
              <div className="row small" style={{ gap: 6 }}>
                <b>Stop {i + 1}</b> <Tyre c={opt.stints[i]} /> › <Tyre c={opt.stints[i + 1]} />
              </div>
              <div className="row">
                <button className="small" onClick={() => nudge(i, -3)}>−3</button>
                <button className="small" onClick={() => nudge(i, -1)}>−1</button>
                <b className="num grow center">Lap {l}</b>
                <button className="small" onClick={() => nudge(i, 1)}>+1</button>
                <button className="small" onClick={() => nudge(i, 3)}>+3</button>
              </div>
            </div>
          ))}
          <div className="small muted" style={{ marginTop: 10 }}>
            Tyre life for you here: {(["S", "M", "H"] as Compound[]).map((k) => `${COMPOUNDS[k].label} ~${Math.round(lifeLaps(k, track, df))}`).join(" · ")} laps
          </div>
        </div>
      </Section>

      <NextAction above={<>Estimated: {est - best < 0.05 ? "optimal plan" : `+${(est - best).toFixed(1)}s vs best plan`}</>}>
        <button className="primary" onClick={() => act((x) => startRace(x, plan))}>Start the race ›</button>
      </NextAction>
    </div>
  );
}
