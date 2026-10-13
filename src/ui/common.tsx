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
