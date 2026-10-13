# ZyFormulaOne — Requirements v2

Status: v2.0 (2026-10-13). Web mock v2 built (see README.md). Next: playtest & tune → Android app.

## 1. Vision

An offline Formula 1 career/management game for phones. You are a **driver-owner**: you race one car of a brand-new team starting at the back of the grid and decide its research, while making race-day calls: tyre strategy and pit windows, driving mode and energy, pit calls and in-race events. Seasons chain endlessly until you choose to retire.

## 2. Platform & scope

- **Offline only.** No multiplayer, no accounts, no network calls.
- **Android first**, iOS later.
- Personal project: real 2026 driver and team names are used (revisit if ever published, since names and likenesses are licensed).
- Target session length: **3–5 min per Grand Prix** (quali + race + management), about 2 h per season.

## 3. Core loop

```
Pre-season ─► [ Grand Prix × 24 ]                       ─► Season end
               ├─ Management: R&D, training, boosts        ├─ Standings & prize money
               ├─ Qualifying: pick Safe / Normal / Aggr.   ├─ Retirements
               ├─ Strategy: pick tyre plan + pit window    ├─ Contracts & transfer market
               └─ Race: modes, energy, Box, events         └─ (every 5 yrs) new regulations
```

## 4. Player role

- The player creates their driver and is **driver-owner** of the new 12th team (the "player team").
- The player drives one car. The **teammate is AI-controlled** and assigned by the game. The player does not choose the teammate in v1.
- At career start, the player is the team's **second driver**: the teammate starts **~3 Overall above the player's profile** (see Appendix A). Beating them is the first goal.
- The player controls **the team they currently drive for**: its research, budget and strategy.
- **Transfers:** at season end the player may receive contract offers from other teams (§11). Accepting one moves the player there, and they take over that team's management.
  - The old team becomes AI-run and **keeps its car upgrades**.
  - The player's **driver training/stats and personal money move with them**.
  - The player **always owns their original team** and can return to it at any season end.
- The player only influences the teammate via in-race events (e.g. "Your teammate is boxing — cover or extend?").

### 4.1 Career setup

The player enters a driver name and nationality, then picks one of three profiles:

| Profile | Start age | Overall | Potential (scouting range) | Feel |
|---|---|---|---|---|
| Established Driver | 25 | ~77 (mid-grid) | 78–82 | Balanced stats, strong from day one, little growth left |
| New Superstar | 18 | ~75 (mid-grid) | 88–95 | Raw speed (high Pace), low Consistency and Composure, huge ceiling |
| Promising Rookie | 18 | ~65 (back of grid) | 75–83 | Hardest start, decent ceiling |

Then a **difficulty** (§12) is chosen and the **team** is set up:

- Custom team **name**.
- **Two colours** (primary, secondary), picked from a preset palette.
- **Starting budget** at the level of the back-of-grid teams.

## 5. Drivers

### 5.1 Stats (1–100)

| Stat | Effect | Weight in Overall |
|---|---|---|
| Pace | One-lap speed (qualifying), base race pace | 25% |
| Racecraft | Overtaking and defending success | 20% |
| Consistency | Error / lock-up / crash probability, lap-time variance | 20% |
| Tyre Management | Tyre degradation rate, long-stint viability | 15% |
| Wet Skill | Performance in intermediate/wet conditions | 10% |
| Composure | Race starts, pressure situations, payoff of aggressive choices | 10% |

**Overall** = weighted average above (weights tunable).

### 5.2 Hidden attributes

- **Age**: drives the development curve.
- **Potential** (ceiling, hidden). Shown as a scouting range, e.g. "70–85".

### 5.3 Evolution

- **Training** (player driver): via the research system (§7).
- **Race results**: small gains/losses after each race based on performance vs expectation (e.g. beating your teammate, finishing above the car's expected position).
- **Age curve**: under 25, fast growth toward Potential. From 25 to 32, stable. Over 33, slow decline, mostly in Pace and Composure. Tyre Management and Consistency decline last.
- AI drivers evolve automatically following the same rules, plus their own **training**: small gains every race (faster when young, slow once at their Potential). Rating changes are visible in the standings.

### 5.4 Retirement & rookies

- Retirement window: **ages 34–42**. Each season-end, the retirement probability rises with age, a falling Overall, and having no seat.
- Drivers 38+ may announce a **farewell season** mid-season.
- Seats freed by retirements are filled from a generated **F2 rookie pool**: fictional names, ages 18–21, with varied Potential.
- The grid size is constant: 12 teams × 2 drivers = 24 drivers.

## 6. Teams (cars)

### 6.1 Stats (1–100)

| Stat | Effect | Weight in Overall |
|---|---|---|
| Power Unit | Top speed, acceleration | 20% |
| High-Speed Aero | Fast corners | 20% |
| Low-Speed Grip | Slow corners, traction | 20% |
| Braking | Heavy braking zones | 10% |
| Tyre Kindness | Car-induced tyre wear | 15% |
| Reliability | DNF / failure probability (higher when pushing) | 15% |

### 6.2 Starting grid order

- Best team starts at **85–90 Overall**, leaving room to grow.
- The player team starts **last**, clearly below the slowest AI team (e.g. ~55 vs ~65).
- AI teams also develop each season with their own budgets. Development builds up in the factory and arrives as **upgrade packages** every few races, announced in the news (e.g. "Ferrari bring an upgrade package: High-Speed Aero +1.2").

### 6.3 Performance model (principle)

At each track, car performance = Σ (track weight × car stat). Lap pace blends car and driver at **~70% car / 30% driver** (tunable). Variance comes from Consistency, Reliability, weather and events.

## 7. Research & training

- A **single system** for car research and driver training. **Car research is paid from the team budget; driver training from the driver's personal money** (§8).
- **Slots:** 2 car-research slots and 1 driver-training slot running in parallel (tunable).
- Each project targets one stat and comes in three lengths. Long-term pays clearly better per race:

| Length | Duration | Gain | Gain/race |
|---|---|---|---|
| Short | 2 races | +2 | 1.0 |
| Medium | 5 races | +7 | 1.4 |
| Long | 10 races | +18 | 1.8 |

- **Trade-offs for long projects:**
  - The slot is locked for the whole duration.
  - The payoff arrives late; projects can run across seasons.
  - A small risk of delay or partial failure.
- **Rising costs:** cost grows steeply with the current stat value. For example, going from 90→91 costs roughly 4× more than 50→51. This is the built-in catch-up mechanic.
- Before a regulation change (§10), projects can target **next year's car**. *(Not in the mock yet.)*

**Tuned values in the mock (v2):**

| | Short | Medium | Long |
|---|---|---|---|
| Car (team budget): gain / races / base cost | +2 / 2 / $1.6M | +7 / 5 / $4.6M | +18 / 10 / $10.5M |
| Driver (personal money): gain / races / base cost | +1.5 / 2 / $0.3M | +5 / 5 / $0.9M | +12 / 10 / $2M |

- **Car cost formula:** base cost × (1 + ((stat − 50) / 15)²), so 90→91 costs about 8× more than 50→51.
- **Driver cost formula:** base cost × (1 + ((stat − 60) / 20)²). Driver stats sit higher, so the curve starts later.
- **Driver gain modifiers:** ×1.2 under 25, ×0.6 over 32, and only 25% of the gain once the driver reaches their Potential.
- **Young drivers (≤24)** also grow a little every race toward their Potential, about 10% of the gap per season. There is no single season-end jump, so growth is visible race by race.
- **AI teams** develop at 40% of the player's efficiency. At season end, AI cars drift 18% toward a fixed level (82), so the grid doesn't inflate over long careers.
- **Season-1 targets, as measured:**
  - Car: +9 to +11 (56 → about 66).
  - Young driver: +5 to +6.
  - Established driver: +3.
- **Longer term:** midfield in seasons 2–3, podiums around season 5, title contention around season 6–7.

## 8. Economy

Two currencies:

- **Team budget (🏢)**
  - **Income:** prize money per race result and per constructors' position, plus sponsors. In the mock, sponsors pay $1.6M + up to $3.2M per race depending on the car rating.
  - **Spending:** car research and the player's salary.
- **Personal money (👤)**, the driver's own bank balance.
  - **Income:** salary, paid per race, plus contract bonuses per point and per win.
  - **Spending:** driver training and weekend boosts.
  - **Starting balance:** Established $3M, Superstar $1.5M, Rookie $1M.
- **Salary at your own team:** you **set it yourself** before the first race of each season ($0–15M, default $4M). It is paid from the team budget, so it's a direct trade-off: more for your training and boosts, less for the car.
- **Salary at another team:** fixed by the contract (§11).
- **Weekend boosts:** up to 2 per weekend, bought before qualifying. Each is small and lasts only that weekend:

| Boost | Effect | Cost |
|---|---|---|
| Simulator session | +2 Pace | $0.25M |
| Engineer briefing | +3 Racecraft | $0.15M |
| Physio & recovery | +3 Consistency | $0.15M |
| Tyre workshop | +3 Tyre Mgmt | $0.15M |
| Wet-weather drills | +4 Wet Skill | $0.10M |
| Mental coach | +3 Composure | $0.10M |

## 9. Race weekend

### 9.1 Calendar (2026, no sprints)

24 rounds, each with **Qualifying + Race**. We use the **2026 calendar as originally published**, ignoring any later changes.

| # | Grand Prix | Key car stats | Overtaking | Tyre deg | Rain chance |
|---|---|---|---|---|---|
| 1 | Australia (Melbourne) | Balanced, Braking | Medium | Medium | Medium |
| 2 | China (Shanghai) | Low-Speed Grip, Tyre Kindness | Easy | High | Medium |
| 3 | Japan (Suzuka) | High-Speed Aero | Hard | Medium | Medium |
| 4 | Bahrain (Sakhir) | Braking, Tyre Kindness, Traction | Easy | High | Very low |
| 5 | Saudi Arabia (Jeddah) | Power Unit, High-Speed Aero | Medium | Low | Very low |
| 6 | Miami | Low-Speed Grip, Tyre Kindness | Medium | Medium | Medium |
| 7 | Canada (Montreal) | Braking, Power Unit | Easy | Low | Medium |
| 8 | Monaco | Low-Speed Grip | Very hard | Low | Low |
| 9 | Barcelona-Catalunya | High-Speed Aero | Hard | High | Low |
| 10 | Austria (Red Bull Ring) | Power Unit, Braking | Easy | Medium | Medium |
| 11 | Great Britain (Silverstone) | High-Speed Aero | Medium | High | High |
| 12 | Belgium (Spa) | Power Unit, High-Speed Aero | Easy | Medium | High |
| 13 | Hungary (Hungaroring) | Low-Speed Grip | Very hard | Medium | Medium |
| 14 | Netherlands (Zandvoort) | High-Speed Aero | Very hard | Medium | Medium |
| 15 | Italy (Monza) | Power Unit | Easy | Low | Low |
| 16 | Spain (Madrid) | Low-Speed Grip, Braking | Medium | Medium | Low |
| 17 | Azerbaijan (Baku) | Power Unit, Braking | Easy | Low | Low |
| 18 | Singapore | Low-Speed Grip, Braking | Hard | Medium | Medium |
| 19 | USA (Austin) | Balanced, Tyre Kindness | Medium | High | Low |
| 20 | Mexico | Power Unit, Low-Speed Grip | Medium | Medium | Low |
| 21 | Brazil (Interlagos) | Balanced, Power Unit | Easy | Medium | High |
| 22 | Las Vegas | Power Unit, Braking | Easy | Low | Very low |
| 23 | Qatar (Lusail) | High-Speed Aero, Tyre Kindness | Medium | Very high | Very low |
| 24 | Abu Dhabi (Yas Marina) | Low-Speed Grip, Power Unit | Medium | Low | Very low |

Each track also has a **safety-car probability** and a lap count. Exact numeric weights live in the game data and will be tuned during the mock.

### 9.2 Qualifying

- The player picks one approach: **Safe / Normal / Aggressive**.
- Aggressive: higher pace bonus, but the error probability scales inversely with Consistency (an error can mean a slow lap or a crash, which puts you at the back of the grid).
- AI drivers pick automatically. The result sets the grid.

### 9.3 Weather forecast & tyre strategy

*(The v1 roguelike strategy cards have been removed.)*

- **Forecast:** shown before qualifying and on the strategy screen: rain chance, plus the likely lap window when the chance is 15% or more.
- **Strategy options:** after qualifying, the player sees the **4–5 best dry tyre strategies** for their car at this track, e.g. "1-stop · Medium → Hard" or "2-stop · Soft → Medium → Soft".
  - They are computed from the tyre model: compound pace, wear, tyre life (which depends on the track, the driver's Tyre Mgmt and the car's Tyre Kindness), pit loss, and the cost of losing track position on hard-to-pass tracks.
  - Each shows an **estimated time vs the fastest**.
- **Pit window:** the player sets the lap of each stop (±1 / ±3). A bar shows each stint's length against the tyre's life; striped means beyond the cliff. The time estimate updates live.
- **Variety:** different tracks favour different plans, e.g. a 1-stop at Monaco and Monza, a 2-stop at Canada and Austria. AI cars pick among the top plans for their own car, so the grid runs a mix.
- **Tyre rules:** real ones. Soft / Medium / Hard / Intermediate. In a dry race, two dry compounds are mandatory.

### 9.4 Race simulation, controls & events

- Shown as a **live timing tower** with a lap-by-lap event feed. Each car shows its compound and **tyre health %** (green → yellow → red → "!!" past the cliff).
- **Player cockpit:**
  - **Gaps:** to the cars ahead and behind.
  - **Tyre health bar:** compound and laps on the set.
  - **Energy bar:** with an "on-plan" marker.
  - **Driving mode:** Save / Normal / Push.
  - **📦 Box button:** pit next lap, pick the compound. It replaces the next planned stop and can be cancelled.
- **Driving modes:**

| Mode | Pace | Tyre wear | Mistake risk | Energy use |
|---|---|---|---|---|
| Save | +0.35 s/lap | ×0.8 | ×0.6 | ×0.7 |
| Normal | — | ×1 | ×1 | ×1 |
| Push | −0.25 s/lap | ×1.3 | ×1.6 (and more failures) | ×1.3 |

- **Energy (2026-style):**
  - Driving Normal for the whole race uses **95%** of the store.
  - Running empty means **clipping**: +1.5 s/lap, and pushing does nothing.
  - Safety Car laps recharge a little.
  - AI cars manage their energy too: they push in battles when ahead of plan and save when behind.
- **5–8 events per race**, of which **at most ~4 are decisions** (the sim pauses). Each decision offers 2–3 options, with odds driven by driver and car stats.

| Category | Example | Choices |
|---|---|---|
| Weather | "Rain in 3 laps (70%)" | Pit for inters / wait / stay on slicks |
| Safety car / VSC | "Crash at T4, SC deployed" | Pit / stay out |
| Overtake | "In DRS range of Leclerc" | Risky lunge / patient / back off to save tyres |
| Defend | "Hamilton closing fast" | Defend hard / normal / let him by |
| Teammate | "Teammate boxes, undercut threat" | Cover / extend / swap positions |
| Car | "Brake temps rising" | Lift and coast / push through (reliability risk) |
| Info only | Crashes, fastest laps, penalties | — |

*(The v1 "tyres falling off" and "final laps push" decisions are now covered by the tyre health bar, the Box button and the driving modes.)*

### 9.5 Damage & penalties (simple version)

Both are triggered mostly by risky choices (overtake, defend, aggressive quali) and by events. The odds depend on Racecraft, Composure and Consistency.

- **Damage**, three outcomes:
  - **Minor** (e.g. front wing): lose pace until the next pit stop, and that stop takes longer.
  - **Major**: a large pace loss for the rest of the race.
  - **Terminal**: DNF.
- **Penalties:**
  - **5 s time penalty**: causing a collision, or rarely track limits / unsafe release.
  - **Grid penalty** next race (−5 places): after a power-unit failure, i.e. a Reliability DNF.
- To be iterated after playtesting the mock.

## 10. Regulations cycle

- **Every 5 seasons**, new regulations are introduced.
- They are **announced one season ahead**, so research can be split between the current and next car.
- **Soft impact:** each team's stats shift by roughly ±3–8, partly random and partly driven by investment in the new car. Track weightings may also shift slightly (e.g. "Power Unit matters more").
- Goal: some surprises, **no full reset** of the pecking order.

## 11. Season end

1. Final drivers' and constructors' standings, prize money.
2. **Retirements** (§5.4).
3. **Contracts & transfer market**
   - Contracts last 1–3 seasons. Drivers with expiring contracts go to the market.
   - Driver market value depends on Overall, season results, age and Potential.
   - AI teams make offers in prestige order.
   - **Offers to the player:** up to 3 teams. Each puts **2 different contract packages** on the table:

| Package | Length | Salary | Bonus per point | Bonus per win |
|---|---|---|---|---|
| Security | 3 years | 100% | $0.01M | $0.2M |
| Balanced | 2 years | 85% | $0.03M | $0.5M |
| Performance | 1 year | 60% | $0.06M | $1.0M |

   - **Base salary:** grows with the team's car rating and the player's **market rating** (Overall + potential bonus + season points + beating the teammate).
   - **Player options at season end:**
     - Stay, if the contract is running or it's your own team.
     - Sign an offer.
     - Accept a **renewal** from your current team when the contract ends.
     - **Return to your own team**, always available.
     - Retire, from age 35.
   - Rookies fill the remaining seats.
4. **Top-3 rule** (applies from the first transfer window onward): the 3 highest-**Overall** drivers can never be in the same team. Teams that already have a top-3 driver cannot sign another. If a violation would occur, the lower-rated driver is moved to the best available seat.
   - Goal: avoid a locked-in, boring grid.

## 12. Difficulty

Three levels, chosen at career start: **Easy / Normal / Hard**. They scale:

- AI team development speed
- Player budget and income
- Race variance and error rates

## 13. Saves

- **3 save slots** (one career each).
- Autosave after every session (management, qualifying, race).

## 14. Career end

- The career is **endless**.
- From around age 35, the player receives **retirement opportunities** at season end. Accepting one ends the career and shows a **career summary**: titles, wins, podiums, teams driven for, records.
- The player can then start a new career from scratch.
- Milestones/achievements are tracked along the way: first points, first podium, first win, first title.

## 15. Tech direction

- **Simulation engine in pure TypeScript**, UI-independent and deterministic given a seed, so it is testable and reproducible.
- **Phase 1:** web mock (React + TypeScript) in the browser.
- **Phase 2:** Android app reusing the same engine (Capacitor or React Native, decided at Phase 2). iOS later from the same code.
- All data (drivers, teams, tracks, cards, events) lives in data files, not hard-coded.
- Storage: local only.

## 16. Out of scope for v1 (future ideas)

- Choosing your teammate
- 2D track map with moving cars
- Multiplayer / online anything
- Fictional-name mode for store publishing
- Sprint races
- Detailed finances (salaries for the player, staff hiring)

## 17. Open items for v2 of this doc

1. **Initial ratings:** review the draft in Appendix A.
2. **Card pool & event library:** full lists with odds (to be drafted during the mock).
3. **Prestige & sponsor formulas** (to be drafted during the mock).

## Appendix A — Initial ratings (draft)

Based on the 2025 season and early-2026 form under the new regulations. Overall values are computed with the weights in §5.1 and §6.1. All values are tunable.

Note: Alonso (44) and Hamilton (41) are already at or beyond the retirement window, so both are likely to retire after season 1 or 2.

### Drivers

| Driver | Team | Age | Pace | Racecraft | Consistency | Tyre Mgmt | Wet | Composure | **Overall** |
|---|---|---|---|---|---|---|---|---|---|
| Max Verstappen | Red Bull | 28 | 91 | 91 | 88 | 87 | 92 | 90 | **90** |
| Lando Norris | McLaren | 26 | 89 | 82 | 81 | 83 | 83 | 79 | **84** |
| Oscar Piastri | McLaren | 25 | 86 | 83 | 85 | 83 | 77 | 85 | **84** |
| Charles Leclerc | Ferrari | 28 | 91 | 83 | 79 | 81 | 83 | 81 | **84** |
| George Russell | Mercedes | 28 | 88 | 82 | 84 | 82 | 81 | 83 | **84** |
| Fernando Alonso | Aston Martin | 44 | 79 | 88 | 83 | 85 | 84 | 87 | **84** |
| Lewis Hamilton | Ferrari | 41 | 82 | 85 | 81 | 86 | 87 | 80 | **83** |
| Carlos Sainz | Williams | 31 | 82 | 81 | 82 | 83 | 80 | 80 | **82** |
| Alex Albon | Williams | 30 | 79 | 78 | 79 | 80 | 75 | 78 | **78** |
| Pierre Gasly | Alpine | 30 | 78 | 77 | 77 | 77 | 77 | 77 | **77** |
| Kimi Antonelli | Mercedes | 19 | 84 | 75 | 69 | 73 | 78 | 71 | **76** |
| Esteban Ocon | Haas | 29 | 74 | 75 | 74 | 75 | 79 | 73 | **75** |
| Nico Hülkenberg | Audi | 38 | 76 | 73 | 78 | 74 | 73 | 75 | **75** |
| Sergio Pérez | Cadillac | 36 | 74 | 78 | 69 | 85 | 75 | 69 | **75** |
| Isack Hadjar | Red Bull | 21 | 79 | 73 | 71 | 72 | 75 | 73 | **74** |
| Valtteri Bottas | Cadillac | 36 | 77 | 69 | 77 | 75 | 69 | 73 | **74** |
| Oliver Bearman | Haas | 20 | 76 | 77 | 69 | 71 | 71 | 75 | **73** |
| Gabriel Bortoleto | Audi | 21 | 75 | 72 | 73 | 71 | 69 | 73 | **73** |
| Liam Lawson | Racing Bulls | 24 | 74 | 75 | 67 | 69 | 69 | 71 | **71** |
| Lance Stroll | Aston Martin | 27 | 69 | 68 | 67 | 69 | 77 | 67 | **69** |
| Franco Colapinto | Alpine | 22 | 71 | 71 | 63 | 67 | 65 | 69 | **68** |
| Arvid Lindblad | Racing Bulls | 18 | 75 | 67 | 65 | 65 | 67 | 67 | **68** |

Hidden Potential for drivers under 25: Antonelli 87, Lindblad 84, Hadjar 83, Bearman 83, Bortoleto 82, Lawson 77, Colapinto 75.

Scale: the best driver (Verstappen) starts at **90**, leaving room to grow. All drivers are anchored relative to him.

**Player driver profiles:**

| Profile | Pace | Racecraft | Consistency | Tyre Mgmt | Wet | Composure | **Overall** |
|---|---|---|---|---|---|---|---|
| Established Driver | 78 | 77 | 78 | 76 | 75 | 76 | **77** |
| New Superstar | 84 | 76 | 66 | 70 | 76 | 71 | **75** |
| Promising Rookie | 71 | 67 | 61 | 63 | 63 | 61 | **65** |

The **AI teammate** in the player team is a generated experienced driver: age ~30, **Overall = player profile + 3** (80 / 78 / 68), and Potential roughly equal to their current Overall, so the player can catch up through growth.

### Teams

| Team | Power Unit | HS Aero | LS Grip | Braking | Tyre Kind. | Reliability | **Overall** |
|---|---|---|---|---|---|---|---|
| Mercedes | 94 | 88 | 85 | 86 | 84 | 90 | **88** |
| Ferrari | 89 | 85 | 88 | 86 | 80 | 84 | **86** |
| McLaren | 86 | 88 | 87 | 85 | 86 | 82 | **86** |
| Red Bull | 84 | 84 | 80 | 82 | 78 | 80 | **82** |
| Alpine | 88 | 74 | 72 | 74 | 72 | 80 | **77** |
| Haas | 86 | 72 | 72 | 73 | 74 | 80 | **76** |
| Racing Bulls | 82 | 73 | 72 | 72 | 72 | 76 | **75** |
| Williams | 86 | 70 | 68 | 72 | 70 | 78 | **74** |
| Audi | 78 | 72 | 72 | 73 | 72 | 70 | **73** |
| Aston Martin | 66 | 76 | 72 | 72 | 70 | 58 | **69** |
| Cadillac | 84 | 64 | 62 | 65 | 64 | 70 | **69** |
| Player team | 60 | 55 | 55 | 56 | 56 | 54 | **56** |
