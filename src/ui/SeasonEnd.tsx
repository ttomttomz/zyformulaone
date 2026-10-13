import { useState } from "react";
import { resolveSeasonEnd, retirePlayer } from "../engine/career";
import { carOverall, driverOverall } from "../engine/ratings";
import type { Career, Offer } from "../engine/types";
import type { Act } from "./App";
import { Fold, fmtM, NextAction, Section, TeamSwatch } from "./common";

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

  const teamPos = ts.findIndex(([id]) => id === c.playerTeamId) + 1;
  const choiceText = !choice ? "Pick one option above" : choice.kind === "stay" ? `Stay with ${cur.name}` : choice.kind === "own" ? `Return to ${own.name}`
    : choice.kind === "retire" ? "Retire from Formula One" : `Sign with ${c.teams[choice.offer.teamId].name} (${choice.offer.style})`;

  return (
    <div className="screen no-tabs">
      <div className="center" style={{ padding: "12px 0 0" }}>
        <div className="kicker muted small">{c.season} season review</div>
        <h2 style={{ fontSize: 26, marginTop: 4 }}>{myPos === 1 ? "🏆 WORLD CHAMPION!" : `You finished P${myPos}`}</h2>
      </div>

      <div className="summary-row">
        <div><div className="v num">{myPts}</div><div className="k">Points</div></div>
        <div><div className="v num">P{teamPos}</div><div className="k">Team</div></div>
        <div><div className="v num good-text">+{fmtM(rep.prize)}</div><div className="k">🏢 Prize</div></div>
        <div><div className="v num">{fmtM(c.wallet)}</div><div className="k">👤 You</div></div>
      </div>

      <Section title="The season">
      <div className="panel">
        <div className="row between"><span className="muted">Drivers' champion</span><b>{champ.name}</b></div>
        <div className="row between"><span className="muted">Constructors' champion</span><b>{c.teams[ts[0][0]].name}</b></div>
      </div>

      <Fold summary={<span className="small">Constructors' standings</span>}>
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
      </Fold>

      {(rep.retirements.length > 0 || rep.regulation) && (
        <div className="panel small">
          {rep.retirements.map((r) => <div key={r}>👋 {r} retires</div>)}
          {rep.regulation && <div>📜 {rep.regulation}</div>}
        </div>
      )}

      </Section>

      <Section step={1} title="Your future" hint={`Choose one option. Market rating ${rep.marketScore} (your rating + this season's form).`}>

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

      </Section>

      {rep.canRetire && (
        <button className={`full ${choice?.kind === "retire" ? "selected" : ""}`} onClick={() => setChoice({ kind: "retire" })}>
          <b>Retire from Formula One</b>
          <div className="muted small">End your career and see your legacy.</div>
        </button>
      )}

      <NextAction above={choiceText}>
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
        Confirm ›
      </button>
      </NextAction>
    </div>
  );
}
