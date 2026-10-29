# Chaos Lab: Critical Transit

Original game design and foundation: **1h-barryy** (also recorded as **PeachSoda2001** in the source Git history). [Original repository](https://github.com/1h-barryy/2026-11-01_chaotic_lab).

Phase 2 continuation: **RyanZhou123232**, with AI assistance documented in `prompt_log.md`.

## Play

Download the repository, keep the files together, and open **index.html** in a desktop browser. No installation, server, build step, or internet connection is required. Direct `file://` loading was verified in Chrome.

You are a technician in a moving laboratory. Survive **90 seconds** while keeping Laboratory Integrity above zero. Move with **WASD or arrow keys**. Near a station, **hold E for 1.5 seconds** to repair it. Releasing E or leaving range cancels progress. Release and press E again after completing or cancelling a repair; holding E before entering range does not start a repair. Press **R** after winning or losing to restart.

Repairing reduces that system's Danger by **45**, but adds **15** to the next: **Power -> Cooling -> Stabilizer -> Power**. All systems begin at **40 Danger**, gain **1.2/s**, warn at **60**, and overload at **80**. Each overloaded system drains **6 Integrity/s**. Every **6 seconds**, a random system receives **+30 Danger** and an on-screen warning. Danger is clamped to 0–100.

Walk directly between the stations and repair the most urgent system. Consider where each repair sends its extra stress. Stations can be walked over; only the walls are solid.

## How conflicting instructions were resolved

The original `SPEC.md` is unchanged. Its earlier prose conflicts with its numbered acceptance criteria. The Phase 2 owner explicitly chose the **numbered criteria** as authoritative:

- Criterion 2 requires **40 / 1.2 per second**, while earlier prose says 25 / 0.9. Keep 40 / 1.2.
- Criterion 6 requires **90 seconds**, while earlier prose says 60. Change 60 to 90.
- Criterion 8 requires **6-second incidents**, while earlier prose says 9. Keep 6 seconds.

The inherited README advised changing Danger and incidents back to the earlier prose. That recommendation was inconsistent with the numbered criteria and is superseded by this decision. See `PHASE2_PLAN.md` for the recorded scope and baseline.

## Acceptance criteria report

1. **Player Movement — Met.** WASD and arrows move the technician, diagonal speed is normalized, and all four room walls constrain movement; automated rule checks cover both key sets and wall bounds, and Chrome keyboard checks confirm movement.
2. **System Danger — Met.** Three systems start at 40, increase by 1.2/s, and remain within 0–100; independent checks use literal acceptance values rather than deriving expectations from CONFIG.
3. **Repair Interaction — Met.** A 1.5-second E hold completes one repair; releasing, leaving range, or losing focus cancels it, with progress reset and a visible progress bar; checks cover each cancellation and Chrome verifies progress, cancellation, and completion.
4. **Repair Consequences — Met.** Repairs apply -45 locally and +15 to the linked station in the specified loop; all three links are independently checked, and the transfer effect appears in Chrome.
5. **System Failure — Met.** Warning begins at 60, overload at 80, and damage stacks at 6 Integrity/s per overloaded station; boundary and stacking checks pass, with overload feedback visible in Chrome.
6. **Win and Lose — Met.** The journey lasts 90 seconds and requires positive Integrity at arrival; zero Integrity loses, including a simultaneous arrival/death tie, and both outcomes were exercised in real Chrome.
7. **Restart — Met.** R resets both win and loss states, including timer, Integrity, systems, repair, and effects; it does nothing during play, and both end-screen restarts were exercised in Chrome.
8. **Random Events — Met.** One random system receives +30 every 6 seconds with a named warning; repeated cadence is checked independently, and Chrome confirms warning, flash, and popup.
9. **Game UI — Met.** The timer, Integrity, three Danger values/bars, and active repair progress are displayed; Chrome screenshots at a 1200×850 viewport were inspected for readable placement.
10. **Visual Feedback — Met.** Inherited transfer pulses, floating numbers, flashes, overload glow, and incident shake remain; event recording/freezing checks pass and repair, incident, and end-screen screenshots were inspected in Chrome.

## Phase 2 changes and preservation

The first commit is the unmodified source snapshot received at source commit `34d6af0`; its Git tree matches the source exactly. Subsequent commits record the plan, scoped fixes/checks, and documentation. `SPEC.md` has not been edited.

The existing file layout, station links, movement, repair consequences, hazards, state model, and renderer were retained. Production changes are confined to `js/config.js` and a small change in `js/game.js`:

- Increase journey length from 60 to 90 seconds.
- Count the initial held-key frame toward the 1.5-second repair instead of delaying by one frame. An E tap already released before the frame cannot start a repair.
- Limit final-frame simulation to the remaining journey time, preventing damage after arrival.

No production functions were discarded or renamed, and no architecture was replaced. The new acceptance checks add coverage; one existing test expectation was updated to reflect the initial repair frame now being counted.

## Code map

- `js/config.js`: all gameplay values, layout, colors, station definitions, and stress links.
- `js/input.js`: held keys versus fresh presses, browser key handling, and clearing input on focus loss.
- `js/entities.js`: player and station constructors.
- `js/game.js`: state and rules; `updateGame` coordinates movement, Danger, repairs, incidents, damage, and outcomes. `updateRepair` handles progress/cancellation; `completeRepair` applies effects and records feedback.
- `js/render.js`: Canvas drawing and visual effects, reading game state without changing rules.
- `js/main.js`: the frame loop, delta-time clamp, and input cleanup.
- `index.html` / `style.css`: page, Canvas, and classic-script loading.
- `tools/rules-check.js`: inherited regression suite, using a simulated Canvas.
- `tools/acceptance-check.js`: independent numbered gameplay acceptance checks.
- `tools/browser-check.cjs`: optional real-Chrome test of file loading, input, rendering, both endings, and restart; screenshots are written to `docs/screenshots/`.

Classic scripts share globals and load in this order: `config -> input -> entities -> game -> render -> main`. Preserve this order. Gameplay belongs in `game.js`; drawing belongs in `render.js`.

## Verification

With Node.js installed, run these from the repository root:

```sh
node tools/rules-check.js
node tools/acceptance-check.js
```

Both suites pass: nine inherited regression checks and nine independent acceptance groups. The suites do not replace browser checks.

For optional browser verification, install Playwright in a separate development environment, make it available to Node, then run `node tools/browser-check.cjs`. Set `CHROME_PATH` to an installed Chrome executable, or use Playwright's installed Chromium. This development-only tool is not needed to play the game.

Real headless Chrome was tested with direct `file://` loading, actual browser keyboard events, the production update/render loop, a controlled animation clock, and a fixed random target. It verified movement, mid-repair progress, cancellation, repair completion, transfer, incidents, a loss, restart, and a full 90-second victory using an automated repair strategy (30 repair-route cycles), followed by another restart. No page JavaScript errors were reported. This demonstrates a complete playable route under that event sequence; broad human playtesting and balance across random seeds remain future work.

[Repair progress](docs/screenshots/chaos-lab-repair.png) · [Incident and overload](docs/screenshots/chaos-lab-incident.png) · [Victory](docs/screenshots/chaos-lab-win.png)

## Known limitations and next steps

- Floating numbers show the configured change even when clamping makes the actual change smaller; e.g. repairing Danger 20 still displays -45. Concurrent popups can overlap.
- Linked Danger changes immediately; its visual pulse and +15 popup arrive 0.4 seconds later. This is feedback timing only.
- The Canvas remains fixed at 960×640. Small-window layout, touch controls, and mobile play are outside this inherited version and have not been validated.
- Basic shape art, no sound or particles. These are outside the numbered acceptance requirements.
- Human playtesting across more random incident sequences is still useful; the browser victory test is deterministic and automated.
- **Before submission, the student must personally write `HANDOFF_REPORT.md`.** The assignment explicitly prohibits AI writing that report, so it is deliberately not generated here. Use the actual inheritance experience, including what helped and what cost time. Confirm the original author's preferred real-name credit if supplied by the course; the repository only establishes the credited handles above.
