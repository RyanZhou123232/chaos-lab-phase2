# Chaos Lab: Critical Transit

## Overview

Chaos Lab is a small, single-player 2D browser game. You play a technician inside a moving laboratory, keeping Power, Cooling, and Stabilizer running until the lab reaches its destination. The lab travels automatically; your job is to handle the repairs.

Each system's Danger rises over time, and random incidents make things worse. Repairing one system lowers its Danger but adds stress to the next: **Power → Cooling → Stabilizer → Power**. Keep Laboratory Integrity above zero until the timer runs out.

The current build uses HTML, CSS, and JavaScript with Canvas. The full design is in [SPEC.md](SPEC.md).

## How to Run

1. Download or clone the project, keeping the files together.
2. Open `index.html` in a desktop browser. The game starts immediately.

There are no dependencies to install and no server is required by the code. Opening the page directly has not been verified in a browser during this cleanup.

For the existing automated rules checks, run this from the project root with Node.js installed:

```sh
node tools/rules-check.js
```

All nine checks passed during this cleanup. They simulate input and game updates using a fake canvas, so they do not verify browser rendering or visual clarity.

## Controls

| Key | Action |
| --- | --- |
| WASD or arrow keys | Move around the lab. Walls keep you inside. |
| Hold E near a station | Repair it after 1.5 seconds. Releasing E or leaving range cancels progress. |
| R on the win/lose screen | Restart the game. |

Each repair needs a fresh E press. Release and press again after completing or cancelling a repair, or if you entered range while already holding E.

## Current Progress

Status is based on the acceptance criteria in [SPEC.md](SPEC.md), source inspection, and the existing rules checks. **Met** means implemented in code; browser behavior and visual readability still need checking. The checks use the current configuration, so passing them does not mean the tuning matches the spec.

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Player Movement | Met | WASD/arrows, equal diagonal speed, and wall bounds are implemented. |
| 2 | System Danger | Partially Met | Clamped to 0–100, but starts at **40** and rises **1.2/s**; spec requires 25 and 0.9/s. |
| 3 | Repair Interaction | Met | 1.5-second hold; releasing E or leaving range resets progress. |
| 4 | Repair Consequences | Met | −45 Danger locally, +15 to the next system in the specified loop. |
| 5 | System Failure | Met | Warning at 60, overload at 80; each overload drains 6 Integrity/s. |
| 6 | Win and Lose | Partially Met | Win with Integrity remaining, lose at zero; rounds last **60 seconds**, rather than the specified 90. |
| 7 | Restart | Met | R resets the game after a win or loss. |
| 8 | Random Events | Partially Met | Random system gains +30 with a warning every **6 seconds**; spec requires 9. |
| 9 | Game UI | Met | Drawing code includes time, Integrity, Danger values/bars, and repair progress. Browser readability is unverified. |
| 10 | Visual Feedback | Met | Pulses, flashes, floating numbers, and incident shake are implemented. Their appearance is unverified. |

## Code Structure

| File | What to look for |
| --- | --- |
| `js/config.js` | Gameplay values, layout, colors, and station links in `CONFIG`. Start here for tuning. |
| `js/game.js` | Rules and state. `updateGame` runs each frame; `updateRepair` handles holds/cancels; `completeRepair` applies the repair and linked stress; `updateRandomIncidents` and `applyOverloadDamageToIntegrity` handle hazards. Win/lose checks are at the end of `updateGame`. |
| `js/render.js` | Canvas drawing and effects. Start at `renderGame` for UI or visual changes. |
| `js/input.js` | Keyboard input and `KEY_BINDINGS`. Tracks held keys separately from fresh presses. |
| `js/entities.js` | `createPlayer` and `createStations` build the starting objects. |
| `js/main.js` | Starts the frame loop: update, draw, then clear fresh key presses. |
| `index.html` / `style.css` | Canvas, script loading, and page layout. |
| `tools/rules-check.js` | Existing automated checks; not loaded by the game. |

The scripts share globals and load in this order: `config → input → entities → game → render → main`. Keep that order and avoid duplicate global names. Rules belong in `game.js`; drawing belongs in `render.js`.

## Next Steps

1. Bring the four mismatched values in `js/config.js` back to the spec: 25 starting Danger, 0.9/s increase, 90-second rounds, and 9-second incidents.
2. Check movement, repairs, cancellation, win/lose, and restart in a desktop browser. The existing checks do not cover every acceptance criterion.
3. Playtest the specified tuning. The previous README reports a few informal author playtests; balance still needs a focused review.
4. Check UI and effects in a browser, especially overlapping floating numbers, warning/progress placement, and smaller windows. Fix readability problems before adding polish.

## Known Issues / Shortcuts

- Floating numbers show the configured change, even when Danger hits its 0 or 100 limit. A repair at 20 Danger still displays −45.
- Popups on the same station can overlap because they share a drawing path and have no stacking offset.
- Linked Danger changes immediately, but the pulse and +15 popup arrive 0.4 seconds later. Only the feedback is delayed.
- Stations are intentionally not solid; the player can walk over them. Only walls block movement.
- The canvas is fixed at 960×640, with no resize handling or touch controls. Small-window layout has not been verified.
- The art uses basic shapes. Sound and particles are not implemented and are not required by the acceptance criteria.
