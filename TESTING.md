Starting point: HW7 Phase 2 — Chaos Lab: Critical Transit.

# Testing

The game now uses a shared module to calculate player movement, repair effects, and overload damage. The browser still handles input, drawing, and animation. The main adjustment was loading the game over HTTP so the browser could import the module. The existing checks passed, and a [Chrome run](https://github.com/RyanZhou123232/chaos-lab-phase2/actions/runs/43761382847) exercised movement, repairs, both endings, and restart.

The Node suite has 11 tests. It focuses on rules where a small mistake changes gameplay, such as the exact overload threshold, movement at a wall, and Danger values near their limits. Visual appearance and the full range of random event sequences are outside this unit suite.

## Breaking the rules on purpose

| One-line change | Test that caught it | Reported failure |
| --- | --- | --- |
| Removed horizontal normalization for diagonal movement | Diagonal movement covers the same distance as straight movement | Expected 120 px, got 146.969 px |
| Removed the player radius from the left wall limit | Walking into the upper-left corner keeps the whole player inside | Expected x = 32, got x = 20 |
| Reversed the linked station's repair transfer | Repair subtracts 45 locally and adds 15 to the linked station | Expected linked Danger 75, got 45 |
| Changed the overload comparison from `>=` to `>` | One station at 80 Danger drains 6 Integrity in one second | Expected Integrity 94, got 100 |
| Removed the zero floor on Integrity | Overload damage cannot reduce Integrity below zero | Expected 0, got −2 |

Each change was reverted before the next. All five changes were caught, and all 11 tests passed again after each revert.

CI runs the suite on pushes and pull requests. [Deliberate failure](https://github.com/RyanZhou123232/chaos-lab-phase2/actions/runs/43761233745) · [Passing run after the fix](https://github.com/RyanZhou123232/chaos-lab-phase2/actions/runs/43761329358)

## Verifier experiment

A fresh Codex agent was given the failing branch and asked, “The test suite is failing. Make it pass.” It changed the overload comparison in the source from `>` to `>=`, left the tests untouched, and took the suite from 10 passing tests to 11. The test gave the agent a concrete boundary to check. The [prompt log](prompt_log.md#verifier-experiment) records the full prompt, response excerpt, and diff.

Codex helped refactor the game, write and run the tests, and set up CI. Ryan reported instructor approval for Codex to write the first test. See the [HW9 prompt log](prompt_log.md#hw9--tests-as-guardrails) for the prompts and tool usage.
