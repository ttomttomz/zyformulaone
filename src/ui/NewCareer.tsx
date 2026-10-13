import { useState } from "react";
import { newCareer } from "../engine/career";
import { PROFILES } from "../engine/data/drivers";
import { TEAM_COLORS } from "../engine/data/teams";
import { DIFFICULTY, driverOverall } from "../engine/ratings";
import type { Career, Difficulty, Profile } from "../engine/types";
import { Logo } from "./common";

export function NewCareer({ onCreate, onCancel }: { onCreate: (c: Career) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<Profile>("established");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [teamName, setTeamName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [color2, setColor2] = useState(TEAM_COLORS[8]);

  const ok = name.trim().length >= 2 && teamName.trim().length >= 2;

  return (
    <div className="stack">
      <div className="topbar">
        <Logo size={22} />
        <button className="small ghost" onClick={onCancel}>Cancel</button>
      </div>

      <h3>Your driver</h3>
      <input type="text" placeholder="Driver name (e.g. Alex Moreau)" value={name} onChange={(e) => setName(e.target.value)} maxLength={28} />
      {(Object.keys(PROFILES) as Profile[]).map((p) => {
        const P = PROFILES[p];
        return (
          <button key={p} className={`full ${profile === p ? "selected" : ""}`} onClick={() => setProfile(p)}>
            <div className="row between">
              <b>{P.label}</b>
              <span className="pill num">OVR {Math.round(driverOverall(P.stats))}</span>
            </div>
            <div className="muted small">Age {P.age} · Potential {P.potential[0]}–{P.potential[1]}</div>
            <div className="small" style={{ marginTop: 4 }}>{P.blurb}</div>
          </button>
        );
      })}

      <h3>Difficulty</h3>
      <div className="grid3">
        {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
          <button key={d} className={`center ${difficulty === d ? "selected" : ""}`} onClick={() => setDifficulty(d)}>
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>
      <div className="muted small">Scales AI development speed, your income and race chaos.</div>

      <h3>Your team</h3>
      <input type="text" placeholder="Team name (e.g. Zy Racing)" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={22} />
      <div className="small muted">Primary colour</div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {TEAM_COLORS.map((x) => (
          <button key={x} className={`dot ${color === x ? "on" : ""}`} style={{ background: x }} onClick={() => setColor(x)} aria-label={x} />
        ))}
      </div>
      <div className="small muted">Secondary colour</div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {TEAM_COLORS.map((x) => (
          <button key={x} className={`dot ${color2 === x ? "on" : ""}`} style={{ background: x }} onClick={() => setColor2(x)} aria-label={x} />
        ))}
      </div>
      <div className="panel row" style={{ background: `linear-gradient(110deg, ${color} 0 60%, ${color2} 60%)`, height: 44 }} />

      <button
        className="primary"
        disabled={!ok}
        onClick={() => onCreate(newCareer({ driverName: name, profile, difficulty, teamName, color, color2 }))}
      >
        Start career
      </button>
    </div>
  );
}
