// Seeded PRNG (mulberry32). The state is a plain number so it serializes with the save.
export class Rng {
  constructor(public state: number) {}

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Approximate standard normal (sum of uniforms).
  normal(): number {
    return this.next() + this.next() + this.next() + this.next() - 2;
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    const total = items.reduce((s, t) => s + weight(t), 0);
    let r = this.next() * total;
    for (const t of items) {
      r -= weight(t);
      if (r <= 0) return t;
    }
    return items[items.length - 1];
  }
}

// Run fn with an Rng bound to obj[key], writing the advanced state back.
export function withRng<T, K extends string>(obj: Record<K, number>, key: K, fn: (rng: Rng) => T): T {
  const rng = new Rng(obj[key]);
  const out = fn(rng);
  obj[key] = rng.state;
  return out;
}
