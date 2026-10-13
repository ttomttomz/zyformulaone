import { useState, type ReactNode } from "react";
import type { Career, Compound } from "../engine/types";

export const fmtM = (n: number) => `$${Math.abs(n) < 1 ? n.toFixed(2) : n.toFixed(1)}M`;

export function Tyre({ c }: { c: Compound }) {
  return <span className={`tyre ${c}`}>{c}</span>;
}

export function Delta({ v }: { v: number }) {
  if (Math.abs(v) < 0.05) return null;
  return <span className={`delta num ${v > 0 ? "up" : "down"}`}>{v > 0 ? "+" : ""}{v.toFixed(1)}</span>;
}

export function StatBar({ label, value, start, max = 100 }: { label: string; value: number; start?: number; max?: number }) {
  const base = start !== undefined ? Math.min(start, value) : value;
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <div className="bar">
        <div style={{ width: `${(base / max) * 100}%` }} />
        {start !== undefined && value > start && <div className="gain" style={{ width: `${((value - start) / max) * 100}%` }} />}
      </div>
      <span className="v num">{value.toFixed(1)}</span>
      <Delta v={start !== undefined ? value - start : 0} />
    </div>
  );
}

// R&D slots with no project running.
export function freeSlots(c: Career, slots: { car: number; driver: number }) {
  const used = (t: string) => c.research.filter((p) => p.target === t).length;
  return slots.car - used("car") + slots.driver - used("driver");
}

export function TeamSwatch({ color }: { color: string }) {
  return <span className="swatch" style={{ background: color }} />;
}

export const teamOf = (c: Career, driverId: string) => {
  const t = c.drivers[driverId].teamId;
  return t ? c.teams[t] : null;
};

export function Logo({ size = 34 }: { size?: number }) {
  return <div className="logo" style={{ fontSize: size }}>Zy<span>Formula</span>One</div>;
}

// ---------- layout building blocks ----------

const STEPS = ["Prepare", "Qualify", "Strategy", "Race", "Results"] as const;
export type WeekendStep = (typeof STEPS)[number];

// Where the player is in the race weekend.
export function Stepper({ current }: { current: WeekendStep }) {
  const idx = STEPS.indexOf(current);
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => (
        <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
          <span className="dot">{i < idx ? "✓" : i + 1}</span>
          <span className="lbl">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// A titled block of the screen. `step` shows a number badge; `optional` softens it.
export function Section({ step, title, hint, optional, children }: {
  step?: number; title: string; hint?: string; optional?: boolean; children: ReactNode;
}) {
  return (
    <section className={`section ${optional ? "optional" : ""}`}>
      <header>
        {step !== undefined && <span className="step-num">{step}</span>}
        <div>
          <h3>{title}{optional && <span className="opt-tag">optional</span>}</h3>
          {hint && <div className="hint">{hint}</div>}
        </div>
      </header>
      {children}
    </section>
  );
}

// Folded content: summary line always visible, details on tap.
export function Fold({ summary, children, open: initial = false }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className={`fold ${open ? "open" : ""}`}>
      <button className="fold-head" onClick={() => setOpen((o) => !o)}>
        <span className="grow">{summary}</span>
        <span className="chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="fold-body">{children}</div>}
    </div>
  );
}

// The one main action of a screen, pinned to the bottom.
export function NextAction({ children, above }: { children: ReactNode; above?: ReactNode }) {
  return (
    <div className="next-action">
      {above && <div className="next-above">{above}</div>}
      {children}
    </div>
  );
}
