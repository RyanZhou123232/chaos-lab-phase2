# Chaos Lab — Prompt Log


## 01 — Initial Concept

**Model:ChatGPT 6 Astra
**Purpose:Design
**Original Prompt:

I want to design a small single-player game inspired by games like RV There Yet?, Overcooked, and Bombanana. I want the gameplay to feel chaotic, with multiple problems happening at once and the player constantly making decisions. Help me explore the core concept before implementation.

Let's make the game take place inside a mobile laboratory that travels automatically. Instead of controlling the vehicle, the player moves around inside and repairs different systems to keep the lab running.

I want to keep the long-press repair mechanic. The player should move toward a damaged station and hold a key to repair it. Help me evaluate whether this mechanic works well with the rest of the gameplay.



**Model:Claude Opus 5.5
**Purpose:implementationo Phase 1
**Original Prompt:



## 05 — Phase 1 Implementation

**Model:Claude Opus 5.5
**Purpose:implementationo Phase 1
**Original Prompt:

You are working in the local repository for "Chaos Lab: Critical Transit", a small single-player 2D top-down browser game. SPEC.md in this directory is the source of truth for the design. Read it fully before writing any code. If anything below conflicts with SPEC.md, follow SPEC.md and tell me about the conflict.

## Goal
Build the Phase 1 foundation: a runnable game with the core loop working. Another developer will finish it later without being able to ask me anything, so readable structure matters more than completeness. Do not build the finished game.

## Tech constraints
- Plain HTML, CSS, vanilla JavaScript, HTML Canvas. No frameworks, no npm, no build step, no backend, no external dependencies.
- Must run by double-clicking index.html in a desktop browser (file://). Therefore use classic <script> tags loaded in order, NOT ES modules (modules fail over file://).
- Fixed-size canvas (e.g. 960x640). Do not handle window resizing.

## File structure
- index.html: canvas + script tags in load order
- style.css: page styling only
- js/config.js: ALL tunable constants in one object (e.g. CONFIG), each with a short comment
- js/input.js: keyboard state; must distinguish "key held" from "key just pressed this frame"
- js/entities.js: Player and Station definitions
- js/game.js: game state, update(dt), and all rule logic (danger, repair, stress transfer, integrity, timer, win/lose)
- js/render.js: all drawing; reads state, never mutates it
- js/main.js: setup and the requestAnimationFrame loop using delta time in seconds (clamp dt to ~0.1 so tab-switching doesn't explode the simulation)

## Gameplay rules to implement now
Constants (put all of these in config.js):
- Game duration 90 s
- Starting Danger 25 per station
- Passive Danger increase +0.9 per second per station
- Warning threshold 60, Overload threshold 80
- Danger clamped to the range [0, 100]
- Repair effect -45 Danger on the repaired station
- Repair consequence +15 Danger on the linked station
- Starting Laboratory Integrity 100
- Overload damage -6 Integrity per second for EACH station at or above 80
- Also put in config, with values you choose and report to me: player speed, player size, station size, repair interaction range

Stress-transfer chain: Power -> Cooling -> Stabilizer -> Power
(repairing Power stresses Cooling, repairing Cooling stresses Stabilizer, repairing Stabilizer stresses Power). Store this as data on the stations (e.g. a linkedStationId), not as hard-coded if/else.

Phase 1 tasks, in priority order:
1. Lab scene: dark gray floor, wall boundaries, three stations physically separated so the player must walk between them. Power = orange/yellow, Cooling = cyan/blue, Stabilizer = purple.
2. Player movement with WASD and arrow keys, normalized diagonal speed, cannot leave the lab bounds.
3. Danger values: start at 25, rise passively, shown on/near each station as a number and a bar. Bar or outline turns warning color at >= 60 and red at >= 80.
4. Repair: when the player is within range of a station and presses E, apply the repair instantly (-45) and the stress transfer (+15 to the linked station). This is a TEMPORARY instant repair. It must trigger on the key-press edge only, so holding E does not repeat repairs.
5. Laboratory Integrity: loses 6/s per overloaded station. Show it in the HUD.
6. 90-second countdown in the HUD. Win if the timer reaches 0 with Integrity > 0. Lose when Integrity reaches 0. On game end, freeze the simulation and show a WIN / LOSE overlay. Press R to restart (R does nothing during play).

## Deliberately NOT in Phase 1 (leave clear TODO comments where each will go)
- Hold-E-for-1.5-seconds repair with a progress bar, cancelled by releasing E or leaving range, requiring a fresh E press after completion. Structure the repair code so this is a contained change: put the instant repair inside a single clearly named function, and add a TODO there describing the final behavior exactly as written in this sentence.
- Random incidents: every 9 s, +30 Danger to a random station. Leave a TODO in update() and a placeholder constant in config.
- Visual polish, sound, particles, screen shake.

## Out of scope entirely: do not add
Multiplayer, vehicle driving, inventory, item pickup, physics, NPCs, multiple levels, procedural generation, menus, difficulty settings, save systems.

## Code quality
- Descriptive names (playerSpeedPixelsPerSecond, not spd). Comment the WHY, not the WHAT.
- Keep rules in game.js and drawing in render.js; don't mix them.
- Do not create README.md or prompt_log.md. I will handle documentation separately.
- Do not run git commit. I will review and commit myself.

## When finished
1. Verify the code yourself: check script load order, check for obvious runtime errors, and trace one full repair through the code (Power repaired -> Cooling +15).
2. Report back with: the files created and what each one does; every acceptance criterion in SPEC.md marked as implemented / partially implemented / not implemented; the values you chose for unspecified constants; and anything you are unsure about or couldn't verify without running a browser.


Next, a scoped set of changes on top of the current Phase 1 code. Keep the existing structure, names, and file layout. Do not refactor or restyle anything not listed here.

1. .gitignore
Create a .gitignore appropriate for a dependency-free vanilla JS browser game: OS files (.DS_Store, Thumbs.db), editor folders (.vscode/, .idea/), logs, node_modules/ and .env as a precaution, and local Claude Code settings (.claude/settings.local.json). Also check whether you left any scratch or test files from your Node verification in the repo. List them and delete them unless they are useful to the next developer, in which case move them into tools/ and tell me how to run them.

2. Hold-to-repair (replace the temporary instant repair in completeRepair / its caller)
- Holding E within range of a station fills that station's repair progress over CONFIG.repairHoldDurationSeconds (1.5 s).
- On completion, apply the existing effects: -45 Danger to that station, +15 to its linked station.
- Releasing E or leaving range cancels an unfinished repair and resets progress to 0.
- After a completed repair, the player must release and press E again before a new repair starts.
- Only one station is repaired at a time (keep the current nearest-in-range rule).
- Draw a progress bar above the station being repaired.
Remove the TODO once this is done.

3. Random incidents
- Every 9 seconds (CONFIG), add +30 Danger to a random station.
- Show an on-screen warning for ~1.5 s naming the station (e.g. "COOLING SURGE!"), and flash that station briefly.
Remove the related TODOs once done.

4. Minimal danger feedback (keep it small)
- Stations at or above the overload threshold pulse red.
- A brief, small screen shake when an incident hits.
All new values go in CONFIG with comments.

Do not change any other gameplay values. Do not touch SPEC.md or README.md. Do not commit.

When done: report exactly what changed per file, trace one full hold-repair (including a cancel case) through the code, and list anything you could not verify without a browser.


Tuning pass. Change ONLY these values in js/config.js, nothing else in the code:
- game duration: 90 -> 60 seconds
- starting Danger per station: 25 -> 40
- passive Danger increase: 0.9 -> 1.2 per second
- random incident interval: 9 -> 6 seconds (amount stays +30)
- repair consequence on linked station: +15 -> +20

Update the comments on those values so they stay accurate. If tools/rules-check.js hard-codes any of the old numbers, change it to read them from CONFIG instead of hard-coding new ones, then run it and confirm it passes.

Do not touch SPEC.md or README.md. Do not commit. Report old -> new for each value and the rules-check result.



Final change pass before I freeze the code: visual feedback only. Do NOT change any gameplay rules or tuning values, with one exception: make sure CONFIG.repairLinkedStationDangerIncrease is 15 (set it back if it is 20).

Keep the existing structure and names. Put drawing in render.js. Only add the minimal state to game.js needed to know WHEN something happened (e.g. timestamps or short-lived effect lists for repair completions and Danger changes). game.js must not depend on render.js. All new tunable values go in CONFIG with comments.

Add, in this priority order (stop early if a later item would require restructuring):

1. Make the stress transfer visible. When a repair completes, animate a glowing pulse traveling from the repaired station to its linked station (~0.4 s), in the repaired station's color. When it arrives, the linked station briefly flashes. This is the core mechanic, so it must read clearly.

2. Floating numbers. Show "-45" rising from the repaired station, "+15" from the linked station, and "+30" from an incident station. Each fades out over ~0.8 s.

3. Overload pressure. While any station is overloaded, draw a pulsing red vignette around the screen edges, and make the Integrity bar flash to show it is taking damage.

4. Station identity. Draw a simple icon on each station with canvas primitives: Power = lightning bolt, Cooling = snowflake or fan, Stabilizer = rotating ring. Keep the existing colors.

5. Transit feel. The lab is a moving vehicle, so add subtle floor stripes or panel lines scrolling slowly in one direction behind everything. Keep it low-contrast so it never competes with the stations.

6. Timer urgency. In the last 10 seconds, the timer turns red and pulses.

Rules:
- All effects freeze with the rest of the game on the end screen, and reset on restart with R.
- The HUD and text must stay readable; effects must not cover the Danger numbers or the repair progress bar.
- Run node tools/rules-check.js and confirm it still passes. Add a check that completing a repair records the transfer effect, if that's easy.
- Update or remove any TODO comments these changes resolve.
- Do not touch SPEC.md or README.md. Do not commit.

Report: what was added per file, any new state fields in game.js and why each exists, which items (if any) you skipped and why, and anything that needs a visual check in the browser.