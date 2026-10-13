import { continueAfterRace } from "../engine/career";
import { trackById } from "../engine/data/tracks";
import type { Career } from "../engine/types";
import type { Act } from "./App";
import { fmtM, TeamSwatch } from "./common";

export function RaceResultScreen({ c, act }: { c: Career; act: Act }) {
  const w = c.weekend!;
  const res = w.result!;
  const track = trackById(w.trackId);
  const mine = res.order.findIndex((o) => o.driverId === c.playerDriverId);
  const me = res.order[mine];
  const last = c.round === 23;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <div className="muted small">Result · {track.name}</div>
          <h2>{me.status === "Finished" ? `You finished P${mine + 1}` : `DNF: ${me.status}`}</h2>
        </div>
        <div className="center small">
          <div className="pill good num" title="Team income">🏢 +{fmtM(res.income)}</div>
          <div className="pill good num" title="Your earnings" style={{ marginTop: 3 }}>👤 +{fmtM(res.earnings)}</div>
        </div>
      </div>
      {(res.research ?? []).length > 0 && (
        <div className="panel rnd-panel">
          <b>🔬 R&D update</b>
          {res.research.map((n, i) => <div key={i} className="small" style={{ marginTop: 4 }}>{n}</div>)}
        </div>
      )}
      {res.notes.length > 0 && (
        <div className="panel small">
          {res.notes.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      )}
      <table className="t">
        <tbody>
          {res.order.map((o, i) => {
            const d = c.drivers[o.driverId];
            const delta = o.grid - (i + 1);
            return (
              <tr key={o.driverId} className={o.driverId === c.playerDriverId ? "me" : ""}>
                <td className="num muted">{o.status === "Finished" ? i + 1 : "—"}</td>
                <td><div className="row"><TeamSwatch color={c.teams[o.teamId].color} />{d.name}</div></td>
                <td className="small muted">
                  {o.status !== "Finished" ? o.status : delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : ""}
                </td>
                <td className="r num">{o.points ? `+${o.points}` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="primary" onClick={() => act((x) => continueAfterRace(x))}>
        {last ? "Season review" : "Continue"}
      </button>
    </div>
  );
}
