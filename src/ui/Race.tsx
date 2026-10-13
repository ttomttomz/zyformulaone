import { useEffect, useState } from "react";
import { finishRace } from "../engine/career";
import { trackById } from "../engine/data/tracks";
import {
  carOf, carTyreHealth, decide, energyTarget, requestBox, running, setMode, stepLap, suggestedCompound,
} from "../engine/race";
import { COMPOUNDS, MODES } from "../engine/tyres";
import type { Career, Compound, DriveMode } from "../engine/types";
import type { Act } from "./App";
import { TeamSwatch, Tyre } from "./common";

const SPEEDS = [
  { label: "1×", ms: 700 },
  { label: "2×", ms: 350 },
  { label: "4×", ms: 150 },
  { label: "8×", ms: 60 },
];

const healthColor = (h: number) => (h > 0.5 ? "var(--good)" : h > 0.2 ? "var(--warn)" : "var(--bad)");

export function Race({ c, act }: { c: Career; act: Act }) {
  const r = c.weekend!.race!;
  const track = trackById(r.trackId);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [boxing, setBoxing] = useState(false);

  useEffect(() => {
    if (!playing || r.pending || r.finished || boxing) return;
    const id = setTimeout(() => {
      act((x) => stepLap(x), { save: (x) => !!x.weekend!.race!.pending || x.weekend!.race!.finished || x.weekend!.race!.lap % 10 === 0 });
    }, SPEEDS[speed].ms);
    return () => clearTimeout(id);
  }, [playing, speed, r.lap, r.pending, r.finished, boxing, act]);

  const field = running(r);
  const leader = field[0];
  const out = r.cars.filter((x) => x.dnf).sort((a, b) => (b.dnfLap ?? 0) - (a.dnfLap ?? 0));
  const gapText = (total: number, i: number) => {
    if (i === 0) return "Leader";
    const gap = total - leader.total;
    const laps = Math.floor(gap / (track.baseLap * 1.02));
    return laps >= 1 ? `+${laps} LAP` : `+${gap.toFixed(1)}`;
  };
  const P = carOf(r, c.playerDriverId);
  const myIdx = field.indexOf(P);
  const ahead = field[myIdx - 1], behind = field[myIdx + 1];
  const health = carTyreHealth(c, r, P);
  const target = energyTarget(r);
  const dryUsed = new Set(P.compoundsUsed.filter((k) => k !== "I" && k !== "W"));

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <div className="muted small">{track.name}</div>
          <div className="big num">Lap {Math.min(r.lap, r.totalLaps)}/{r.totalLaps}</div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.scLapsLeft > 0 && <span className="pill warn">SAFETY CAR</span>}
          {r.wet && <span className="pill">🌧 {r.heavyRain ? "Heavy" : "Light"} rain</span>}
          {myIdx >= 0 && <span className="pill num">P{myIdx + 1}</span>}
        </div>
      </div>

      {!P.dnf && !r.finished && (
        <div className="panel cockpit">
          <div className="row between small">
            <span className="muted">Ahead {ahead ? `${c.drivers[ahead.driverId].code} ${(P.total - ahead.total).toFixed(1)}s` : "—"}</span>
            <span className="muted">Behind {behind ? `${c.drivers[behind.driverId].code} ${(behind.total - P.total).toFixed(1)}s` : "—"}</span>
          </div>

          <div className="gauge">
            <span className="row" style={{ gap: 6 }}><Tyre c={P.compound} /> <span className="small">{COMPOUNDS[P.compound].label} · {P.stintLaps} laps</span></span>
            <div className="meter"><div style={{ width: `${Math.max(0, Math.min(1, health)) * 100}%`, background: healthColor(health) }} /></div>
            <span className="num small" style={{ color: healthColor(health) }}>{health < 0 ? "CLIFF" : `${Math.round(health * 100)}%`}</span>
          </div>

          <div className="gauge">
            <span className="small">⚡ Energy</span>
            <div className="meter">
              <div style={{ width: `${P.energy}%`, background: P.clipping ? "var(--bad)" : P.energy < target - 3 ? "var(--warn)" : "var(--info)" }} />
              <i className="mark" style={{ left: `${target}%` }} title="On-plan level for Normal driving" />
            </div>
            <span className="num small">{Math.round(P.energy)}%</span>
          </div>
          <div className="muted small">
            {P.clipping ? "⚠️ Clipping! Out of energy." : P.energy >= target - 1 ? "On plan to finish." : `Below plan by ${Math.round(target - P.energy)}%. Consider Save.`}
          </div>

          <div className="seg" style={{ marginTop: 8 }}>
            {(["save", "normal", "push"] as DriveMode[]).map((m) => (
              <button key={m} className={P.mode === m ? `on ${m}` : ""} onClick={() => act((x) => setMode(x, m), { save: false })}>
                {MODES[m].label}
              </button>
            ))}
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {P.mode === "push" ? "Faster, more tyre wear, more energy, higher crash risk." : P.mode === "save" ? "Slower, saves tyres and energy, fewer mistakes." : "Balanced. Uses ~95% of energy over the race."}
          </div>

          <div className="row between" style={{ marginTop: 10 }}>
            <span className="small">
              {P.boxRequest
                ? <>📦 Boxing next lap for <Tyre c={P.boxRequest} /></>
                : P.plan[0] ? <>Plan: lap {P.plan[0].lap} › <Tyre c={P.plan[0].compound} /></> : <span className="muted">No more planned stops</span>}
            </span>
            {P.boxRequest
              ? <button className="small" onClick={() => act((x) => requestBox(x, null))}>Cancel box</button>
              : <button className="small boxbtn" onClick={() => setBoxing(true)}>📦 BOX</button>}
          </div>
        </div>
      )}

      <div className="row">
        {!r.finished ? (
          <>
            <button className="small" onClick={() => setPlaying((p) => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
            {SPEEDS.map((s, i) => (
              <button key={s.label} className={`small ${speed === i ? "selected" : ""}`} onClick={() => setSpeed(i)}>{s.label}</button>
            ))}
          </>
        ) : (
          <button className="primary" onClick={() => act((x) => { finishRace(x); })}>See results</button>
        )}
      </div>

      <div className="tower">
        {field.map((x, i) => {
          const d = c.drivers[x.driverId];
          const t = c.teams[x.teamId];
          const me = x.driverId === c.playerDriverId;
          const mate = x.driverId === r.teammateId;
          const h = carTyreHealth(c, r, x);
          return (
            <div key={x.driverId} className={`r ${me ? "me" : mate ? "mate" : ""}`}>
              <span className="pos num">{i + 1}</span>
              <TeamSwatch color={t.color} />
              <span>
                {d.code}
                {x.damage > 0 && <span title="damage"> 🔧</span>}
                {x.penalty > 0 && <span className="muted small"> +{x.penalty}s</span>}
                {x.mode === "push" && !me && <span className="small" title="pushing"> ▲</span>}
              </span>
              <span className="row" style={{ gap: 4 }}>
                <Tyre c={x.compound} />
                <span className="small num" style={{ width: 30, color: healthColor(h) }}>{h < 0 ? "!!" : `${Math.round(h * 100)}%`}</span>
              </span>
              <span className="gap num">{gapText(x.total, i)}</span>
            </div>
          );
        })}
        {out.map((x) => (
          <div key={x.driverId} className={`r out ${x.driverId === c.playerDriverId ? "me" : ""}`}>
            <span className="pos">—</span>
            <TeamSwatch color={c.teams[x.teamId].color} />
            <span>{c.drivers[x.driverId].code}</span>
            <span />
            <span className="gap small">OUT</span>
          </div>
        ))}
      </div>

      <div className="panel feed">
        {r.feed.map((f, i) => (
          <div key={i} className={f.tone}>
            <span className="muted num">L{f.lap} </span>{f.text}
          </div>
        ))}
      </div>

      {boxing && (
        <div className="modal-bg" onClick={() => setBoxing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Box next lap</h2>
            <div className="muted small" style={{ marginTop: 4 }}>
              Choose the tyres. This replaces your next planned stop.
              {!r.everWet && dryUsed.size < 2 && " ⚠️ You must still use a second dry compound."}
            </div>
            {(["S", "M", "H", "I"] as Compound[]).map((k) => {
              const sug = suggestedCompound(c, r, P) === k;
              return (
                <button key={k} className="opt row" onClick={() => { act((x) => requestBox(x, k)); setBoxing(false); }}>
                  <Tyre c={k} />
                  <b>{COMPOUNDS[k].label}</b>
                  {sug && <span className="pill good">Suggested</span>}
                </button>
              );
            })}
            <button className="ghost full center" style={{ marginTop: 10 }} onClick={() => setBoxing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {r.pending && (
        <div className="modal-bg">
          <div className="modal">
            <div className="muted small">Lap {r.lap} · Decision ({r.decisionsLeft} left)</div>
            <h2 style={{ marginTop: 4 }}>{r.pending.title}</h2>
            <div className="muted" style={{ marginTop: 6 }}>{r.pending.text}</div>
            {r.pending.options.map((o) => (
              <button key={o.id} className="opt" onClick={() => act((x) => decide(x, o.id))}>
                <b>{o.label}</b>
                {o.hint && <span className="hint">{o.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
