import { useState } from "react";
import { resolveSeasonEnd, retirePlayer } from "../engine/career";
import { carOverall, driverOverall } from "../engine/ratings";
import type { Career, Offer } from "../engine/types";
import type { Act } from "./App";
import { fmtM, TeamSwatch } from "./common";

type Choice = { kind: "stay" } | { kind: "own" } | { kind: "offer"; offer: Offer } | { kind: "retire" };

export function SeasonEnd({ c, act }: { c: Career; act: Act }) {
  const rep = c.seasonEnd!;
  const [choice, setChoice] = useState<Choice | null>(null);
  const ds = rep.driverStandings;
  const ts = rep.teamStandings;
  const myPos = ds.findIndex(([id]) => id === c.playerDriverId) + 1;
  const myPts = ds.find(([id]) => id === c.playerDriverId)?.[1] ?? 0;
  const champ = c.drivers[ds[0][0]];
  const own = c.teams[c.ownTeamId];
  const atOwn = c.playerTeamId === c.ownTeamId;
  const cur = c.teams[c.playerTeamId];

  const byTeam = new Map<string, Offer[]>();
  for (const o of rep.offers) byTeam.set(o.teamId, [...(byTeam.get(o.teamId) ?? []), o]);
  const isSel = (o: Offer) => choice?.kind === "offer" && choice.offer === o;

  return (
    <div className="stack">
      <div className="center" style={{ padding: "16px 0 4px" }}>
        <div className="muted small">{c.season} season review</div>
        <h2 style={{ fontSize: 26, marginTop: 4 }}>{myPos === 1 ? "🏆 WORLD CHAMPION!" : `You finished P${myPos}`}</h2>
        <div className="muted">{myPts} points · constructors prize {fmtM(rep.prize)} · 👤 {fmtM(c.wallet)}</div>
      </div>

      <div className="panel">
        <div className="row between"><span className="muted">Drivers' champion</span><b>{champ.name}</b></div>
        <div className="row between"><span className="muted">Constructors' champion</span><b>{c.teams[ts[0][0]].name}</b></div>
      </div>

      <h3>Constructors</h3>
      <table className="t">
        <tbody>
          {ts.map(([id, pts], i) => (
            <tr key={id} className={id === c.playerTeamId ? "me" : ""}>
              <td className="num muted">{i + 1}</td>
              <td><div className="row"><TeamSwatch color={c.teams[id].color} />{c.teams[id].name}</div></td>
              <td className="r num">{pts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(rep.retirements.length > 0 || rep.regulation) && (
        <div className="panel small">
          {rep.retirements.map((r) => <div key={r}>👋 {r} retires</div>)}
          {rep.regulation && <div>📜 {rep.regulation}</div>}
        </div>
      )}

      <h3>Your future</h3>
      <div className="muted small">Market rating: {rep.marketScore} (your rating + form this season)</div>

      {rep.canStay && (
        <button className={`full ${choice?.kind === "stay" ? "selected" : ""}`} onClick={() => setChoice({ kind: "stay" })}>
          <b>{atOwn ? `Stay with ${cur.name} (your team)` : `Continue with ${cur.name}`}</b>
          <div className="muted small">
            {atOwn
              ? `Keep building your own team. Car ${Math.round(carOverall(cur.stats))}. Set your salary before round 1.`
              : `Contract until end of ${c.contract.until} · ${fmtM(c.contract.salary)}/season`}
          </div>
        </button>
      )}
      {!atOwn && (
        <button className={`full ${choice?.kind === "own" ? "selected" : ""}`} onClick={() => setChoice({ kind: "own" })}>
          <b className="row"><TeamSwatch color={own.color} />Return to {own.name} (you own it)</b>
          <div className="muted small">Car {Math.round(carOverall(own.stats))} · you set your own salary</div>
        </button>
      )}

      {[...byTeam.entries()].map(([teamId, offers]) => {
        const t = c.teams[teamId];
        const mates = Object.values(c.drivers).filter((d) => d.teamId === teamId && !d.retired && !d.isPlayer);
        return (
          <div key={teamId} className="offer-group">
            <div className="row between">
              <b className="row"><TeamSwatch color={t.color} />{offers[0].renewal ? `Renewal: ${t.name}` : `Offer: ${t.name}`}</b>
              <span className="pill num">Car {Math.round(carOverall(t.stats))}</span>
            </div>
            <div className="muted small" style={{ marginTop: 2 }}>
              Drivers: {mates.map((d) => `${d.name} (${Math.round(driverOverall(d.stats))})`).join(", ") || "open seats"}
            </div>
            {offers.map((o, i) => (
              <button key={i} className={`opt ${isSel(o) ? "selected" : ""}`} onClick={() => setChoice({ kind: "offer", offer: o })}>
                <div className="row between">
                  <b>{o.style}</b>
                  <span className="num">{fmtM(o.salary)}/season · {o.years} yr</span>
                </div>
                <span className="hint">Bonus {fmtM(o.pointBonus)}/point · {fmtM(o.winBonus)}/win</span>
              </button>
            ))}
          </div>
        );
      })}
      {rep.offers.length === 0 && <div className="muted small">No offers this year. Results and rating drive interest from other teams.</div>}
      {!atOwn && byTeam.size > 0 && <div className="muted small">Joining a team means you run its R&D and budget. Unfinished car research stays with your old team.</div>}

      {rep.canRetire && (
        <button className={`full ${choice?.kind === "retire" ? "selected" : ""}`} onClick={() => setChoice({ kind: "retire" })}>
          <b>Retire from Formula One</b>
          <div className="muted small">End your career and see your legacy.</div>
        </button>
      )}

      <button
        className="primary"
        disabled={!choice}
        onClick={() =>
          act((x) => {
            if (!choice) return;
            if (choice.kind === "retire") retirePlayer(x);
            else if (choice.kind === "stay") resolveSeasonEnd(x, null);
            else if (choice.kind === "own") resolveSeasonEnd(x, "own");
            else resolveSeasonEnd(x, x.seasonEnd!.offers[rep.offers.indexOf(choice.offer)]);
          })
        }
      >
        Confirm
      </button>
    </div>
  );
}
