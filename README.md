# ZyFormulaOne — web mock

Offline F1 career game. Requirements: [REQUIREMENTS.md](REQUIREMENTS.md).

## Run

```bash
npm install
npm run dev        # open the printed URL; use a phone-sized window or browser device mode
npm test           # engine tests
npm run balance -- 5 superstar normal   # headless: auto-play N seasons and print balance numbers
```

## Layout

- `src/engine/`: pure TypeScript game engine, no UI and no browser APIs. It is deterministic for a given seed, and the Android app will reuse it as-is.
  - `data/`: drivers, teams and tracks (2026 calendar).
  - `ratings.ts`: overall formulas, the pace model, the difficulty table.
  - `research.ts`: R&D and training, plus AI development.
  - `weekend.ts`: weather forecast, qualifying, strategy options.
  - `tyres.ts`: tyre model, driving modes, energy constants, strategy generator.
  - `boosts.ts`: weekend boosts bought with personal money.
  - `race.ts`: lap-by-lap race sim, driving modes, energy, Box requests, events and decisions.
  - `career.ts`: new career, race results, economy and contracts, season end, transfer market, the top-3 rule.
- `src/ui/`: React screens. Saves go to `localStorage` (3 slots) and are mock only.
- `scripts/balance.ts`: tuning tool.

## Known mock limitations

- No "next year's car" research before a regulation change.
- No mid-season "farewell" announcements.
- No full wet tyres (Inters only).
- Strategy estimates assume a dry race; rain is handled live.
- Balance is a first pass; tune after playtesting.
