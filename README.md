# ZyFormulaOne — web mock

Offline F1 career game. Requirements: [REQUIREMENTS.md](REQUIREMENTS.md).

## Run

```bash
npm install
npm run dev        # open the printed URL; use a phone-sized window or browser device mode
npm test           # engine tests
npm run balance -- 5 superstar normal   # headless: auto-play N seasons and print balance numbers
```

## Android app

The same web build is wrapped with Capacitor (`android/`). App ID: `com.ttomttomz.zyformulaone`.

```bash
npm run android:apk   # builds ZyFormulaOne.apk in the project root (debug-signed)
```

One-time setup on this Mac (already done): `brew install openjdk@21 && brew install --cask android-commandlinetools`, then the SDK
packages `platform-tools`, `platforms;android-36` and `build-tools;36.0.0` via `sdkmanager`. `android/local.properties` points at the SDK.

To install: copy `ZyFormulaOne.apk` to the phone, open it and allow "install unknown apps" for your file manager. Saves are kept in
app storage and survive updates as long as the same APK signing key is used (the debug key on this Mac).

Icon and splash are rendered from `resources/logo.svg`.

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
