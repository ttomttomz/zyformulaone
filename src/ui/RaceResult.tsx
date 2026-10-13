import { continueAfterRace } from "../engine/career";
import { trackById } from "../engine/data/tracks";
import type { Career, RaceResult } from "../engine/types";
import type { Act } from "./App";
import { Fold, fmtM, NextAction, Section, Stepper, TeamSwatch } from "./common";

export function RaceResultScreen({ c, act }: { c: Career; act: Act }) {
  const w = c.weekend!;
  const res = w.result!;
  const track = trackById(w.trackId);
  const mine = res.order.findIndex((o) => o.driverId === c.playerDriverId);
  const me = res.order[mine];
  const finished = me.status === "Finished";
  const last = c.round === 23;

  const line = (o: RaceResult["order"][number], i: number) => {
    const d = c.drivers[o.driverId];
    const delta = o.grid - (i + 1);
    return (
      <tr key={o.driverId} className={o.driverId === c.playerDriverId ? "me" : ""}>
        <td className="num muted">{o.status === "Finished" ? i + 1 : "—"}</td>
        <td><div className="row"><TeamSwatch color={c.teams[o.teamId].color} />{d.name}</div></td>
        <td className="small muted">{o.status !== "Finished" ? o.status : delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : ""}</td>
        <td className="r num">{o.points ? `+${o.points}` : ""}</td>
      </tr>
    );
  };
  const key = res.order.map((o, i) => [o, i] as const).filter(([o, i]) => i < 3 || o.teamId === c.playerTeamId);

  return (
    <div className="screen no-tabs">
      <Stepper current="Results" />
      <div className="screen-head">
        <div>
          <div className="kicker">Result · {track.name}</div>
          <h2>{finished ? `You finished P${mine + 1}` : `DNF · ${me.status}`}</h2>
        </div>
      </div>

      <div className="summary-row">
        <div><div className="v num">{finished ? `P${mine + 1}` : "DNF"}</div><div className="k">Finish</div></div>
        <div><div className="v num">{me.points}</div><div className="k">Points</div></div>
        <div><div className="v num good-text">+{fmtM(res.income)}</div><div className="k">🏢 Team</div></div>
        <div><div className="v num good-text">+{fmtM(res.earnings)}</div><div className="k">👤 You</div></div>
      </div>

      {(res.research.length > 0 || res.notes.length > 0) && (
        <Section title="What changed">
          {res.research.length > 0 && (
            <div className="panel rnd-panel">
              <b>🔬 R&D</b>
              {res.research.map((n, i) => <div key={i} className="small" style={{ marginTop: 4 }}>{n}</div>)}
            </div>
          )}
          {res.notes.length > 0 && <div className="panel small">{res.notes.map((n, i) => <div key={i}>{n}</div>)}</div>}
        </Section>
      )}

      <Section title="Podium & your team">
        <table className="t"><tbody>{key.map(([o, i]) => line(o, i))}</tbody></table>
        <Fold summary={<span className="small">Full classification</span>}>
          <table className="t"><tbody>{res.order.map((o, i) => line(o, i))}</tbody></table>
        </Fold>
      </Section>

      <NextAction>
        <button className="primary" onClick={() => act((x) => continueAfterRace(x))}>{last ? "Season review ›" : "Next Grand Prix ›"}</button>
      </NextAction>
    </div>
  );
}
