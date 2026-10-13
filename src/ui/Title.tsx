import { useState } from "react";
import { TRACKS } from "../engine/data/tracks";
import { SAVE_VERSION, type Career } from "../engine/types";
import { Logo } from "./common";
import { deleteSlot, loadSlot, SLOT_COUNT } from "./storage";

export function Title({ onLoad, onNew }: { onLoad: (slot: number, c: Career) => void; onNew: (slot: number) => void }) {
  const [, refresh] = useState(0);
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => loadSlot(i));

  return (
    <div>
      <div style={{ padding: "40px 0 28px" }} className="center">
        <Logo />
        <div className="muted small" style={{ marginTop: 6 }}>Offline Formula One career</div>
      </div>
      <h3>Careers</h3>
      {slots.map((c, i) => (
        <div key={i} className="panel">
          {c && c.version !== SAVE_VERSION ? (
            <div className="row between">
              <span className="muted small">Slot {i + 1}: save from an older version</span>
              <button className="small" onClick={() => { deleteSlot(i); refresh((n) => n + 1); }}>Delete</button>
            </div>
          ) : c ? (
            <>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 700 }}>{c.drivers[c.playerDriverId].name}</div>
                  <div className="muted small">
                    {c.teams[c.playerTeamId].name} · {c.phase === "retired" ? "Retired" : `${c.season} · Round ${Math.min(c.round + 1, TRACKS.length)}/${TRACKS.length}`}
                  </div>
                </div>
                <span className="pill">Slot {i + 1}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="primary" onClick={() => onLoad(i, c)}>Continue</button>
                <button
                  className="small ghost"
                  onClick={() => { if (confirm("Delete this career?")) { deleteSlot(i); refresh((n) => n + 1); } }}
                >Delete</button>
              </div>
            </>
          ) : (
            <div className="row between">
              <span className="muted">Empty slot {i + 1}</span>
              <button className="small" onClick={() => onNew(i)}>New career</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
