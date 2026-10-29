# Phase 2 plan and decisions

## Source and preservation

- Original designer and foundation author: **1h-barryy**, credited in the source Git history also as **PeachSoda2001**.
- Source: https://github.com/1h-barryy/2026-11-01_chaotic_lab
- Received source commit: `34d6af0`.
- The first commit of this new repository contains the original files unchanged. Its Git tree matches the source tree: `2bf241d58d5d7599d7bd0a5703829b9aac08e157`.
- Extend the existing vanilla JavaScript / Canvas structure; preserve the original logic and names. Do not rewrite the game or modify the inherited SPEC.md.

## Agreed interpretation — 2026-10-29

The Phase 2 owner explicitly chose the **numbered acceptance criteria** in SPEC.md as the authority. The inherited README and the earlier prose do not override them.

- Criterion 2: start all systems at **40 Danger**, increasing by **1.2 per second**, capped at 100. Earlier prose says 25 / 0.9. Keep the existing 40 / 1.2 configuration.
- Criterion 6: survive **90 seconds** with positive Integrity. Earlier prose and current code say 60 seconds. Change the configuration to 90.
- Criterion 8: incidents every **6 seconds**, adding **30 Danger** to one random system. Earlier prose says 9 seconds. Keep 6 seconds.
- Criterion 4: each completed repair applies **-45** locally and **+15** to the next system, in the Power -> Cooling -> Stabilizer -> Power loop. Keep these values.
- The inherited README incorrectly recommends reverting Danger and incident values to the earlier prose. Replace that advice with this explicit interpretation.

## Initial verification and targets

The inherited nine rules checks pass. Most features already exist, including repair progress and visual effects. Passing those checks alone does not establish compliance: they derive tuning expectations from CONFIG and do not cover all acceptance criteria.

1. Preserve the baseline, then make this plan commit before implementation.
2. Correct journey length and add independent checks for the numbered criteria, covering movement, Danger, repair, failure, victory, defeat, and restart.
3. Fix only concrete issues exposed by verification; keep existing architecture and visual design.
4. Verify browser behavior if available and report the actual scope of testing honestly.
5. Update README item by item and append verbatim Phase 2 prompts to prompt_log.md.

## Submission responsibility

The assignment explicitly requires the student to write HANDOFF_REPORT.md **without AI**. No AI-written report will be substituted. The student must add their own report before submission. The original author's real name is not confirmed by the repository; attribution uses their public handle and recorded commit-author name rather than inventing a name.
