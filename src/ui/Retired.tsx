import type { Career } from "../engine/types";
import { Logo } from "./common";

export function Retired({ c, onQuit }: { c: Career; onQuit: () => void }) {
  const me = c.drivers[c.playerDriverId];
  const s = c.careerStats;
  const stats: [string, number][] = [
    ["Titles", s.titles], ["Wins", s.wins], ["Podiums", s.podiums], ["Poles", s.poles],
    ["Points", s.points], ["Starts", s.starts], ["DNFs", s.dnfs],
  ];
  const earned = `$${s.earnings.toFixed(1)}M`;
  return (
    <div className="stack">
      <div className="center" style={{ padding: "24px 0 8px" }}>
        <Logo size={22} />
        <h2 style={{ fontSize: 26, marginTop: 16 }}>{me.name}</h2>
        <div className="muted">Retired at {me.age} after {c.history.length} season{c.history.length === 1 ? "" : "s"} · career earnings {earned}</div>
      </div>
      <div className="grid3">
        {stats.map(([k, v]) => (
          <div key={k} className="panel center">
            <div className="big num">{v}</div>
            <div className="muted small">{k}</div>
          </div>
        ))}
      </div>
      <h3>Seasons</h3>
      <table className="t">
        <tbody>
          {c.history.map((h) => (
            <tr key={h.season}>
              <td className="num">{h.season}</td>
              <td>{h.teamName}</td>
              <td className="r num">P{h.driverPos}</td>
              <td className="r num muted">{h.points} pts</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.milestones.length > 0 && (
        <>
          <h3>Milestones</h3>
          {c.milestones.map((m) => <div key={m} className="small">🏅 {m}</div>)}
        </>
      )}
      <button className="primary" onClick={onQuit}>Back to menu</button>
    </div>
  );
}
