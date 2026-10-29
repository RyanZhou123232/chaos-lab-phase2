# Chaos Lab: Critical Transit

## Overview

Chaos Lab is a single-player, 2D top-down survival game where the player controls a technician inside a moving laboratory.

The laboratory is transporting an unstable experimental core. During the journey, different systems start to malfunction, and the player needs to run around fixing them before the whole laboratory breaks down.

The goal is simple: **keep the laboratory running until it reaches its destination.**

I want the game to feel chaotic and a little funny, similar to the pressure of Overcooked and the repair mechanics in RV There Yet?. The player should constantly have to decide what to fix first while dealing with new problems.

## Core Gameplay

The laboratory moves automatically, so the player doesn't need to drive.

There are three main systems:

- **Power**
- **Cooling**
- **Stabilizer**

Each system has a Danger meter that increases over time. If a system gets too dangerous, it starts damaging the laboratory.

The player moves between stations and holds **E** to repair them.

The main mechanic is that **fixing one system adds stress to another system**.

For example, fixing Power will increase the Danger of Cooling. This creates a cycle where the player needs to manage all three systems instead of focusing on just one.

The basic gameplay loop is:

**Check systems → Move → Repair → Deal with consequences → Repeat**

## Game Mechanics

### Movement and Repair

- WASD or arrow keys to move.
- Hold E near a station for 1.5 seconds to repair it.
- Releasing E or walking away cancels the repair.
- A progress bar shows repair progress.
- The player can only repair one station at a time.

### System Danger

Each system has a Danger value from 0 to 100.

- All systems start at 25 Danger.
- Danger increases by 0.9 per second.
- At 60 Danger, the system enters a warning state.
- At 80 Danger, the system becomes overloaded.
- Each overloaded system damages Laboratory Integrity by 6 per second.

Laboratory Integrity starts at 100. Multiple overloaded systems can damage it at the same time.

### Repair Consequences

A completed repair:

- Reduces the repaired system's Danger by 45.
- Increases another system's Danger by 15.

The systems are connected in a fixed loop:

**Power → Cooling → Stabilizer → Power**

For example:

- Repair Power → Cooling gains 15 Danger.
- Repair Cooling → Stabilizer gains 15 Danger.
- Repair Stabilizer → Power gains 15 Danger.

### Random Events

Every 9 seconds, a random system gains 30 Danger.

A short warning appears on screen to tell the player what happened.

These events represent things like road bumps or equipment malfunctions during transportation.

## Game Objective

Each game lasts 60 seconds.

**Win:** The player survives until the timer reaches zero with Laboratory Integrity above zero.

**Lose:** Laboratory Integrity reaches zero.

After winning or losing, the player can press **R** to restart.

## Visual Design

The game uses a simple 2D top-down view of the laboratory.

I want a colorful, slightly stylized look inspired by low-poly games, but using basic 2D shapes for now.

The room contains three repair stations positioned in different areas, so the player has to move between them.

Suggested colors:

- Power — Orange / Yellow
- Cooling — Cyan / Blue
- Stabilizer — Purple
- Warning / Damage — Red
- Background — Dark gray

The UI should show:

- Remaining time
- Laboratory Integrity
- Danger levels for all three systems
- Repair progress
- System warnings and random events

Visual feedback should make it clear when something is going wrong.

## Scope

The game should be a small, complete, playable experience.

For this version, I only want:

- One room
- One player
- Three repair stations
- Movement and repair interactions
- System Danger and cascading failures
- Random events
- A timer and win/lose conditions

No multiplayer, driving, inventory, complex physics, or multiple levels.

The main focus is making the repair system and time pressure fun to play.

The game can be expanded later with 3D environments, physical repairs, and more chaotic events, but those are not part of this version.


## Acceptance Criteria

The game is considered complete when the following features work as intended.

### Must Have

1. **Player Movement:** The player can move around the laboratory using WASD or arrow keys and cannot leave the room.

2. **System Danger:** All three systems start at 40 Danger, and their Danger increases by 1.2 per second, up to 100.

3. **Repair Interaction:** The player can hold E near a station for 1.5 seconds to repair it. Releasing E or moving away cancels the repair.

4. **Repair Consequences:** Repairing a system reduces its Danger by 45 but increases the next system's Danger by 15, following the Power → Cooling → Stabilizer → Power loop.

5. **System Failure:** Systems reach the warning state at 60 Danger and become overloaded at 80. Each overloaded system reduces Laboratory Integrity by 6 per second.

6. **Win and Lose:** The player wins by surviving the 90-second journey with Integrity remaining. The player loses if Integrity reaches zero.

7. **Restart:** After winning or losing, the player can press R to restart the game.

### Should Have

8. **Random Events:** Every 6 seconds, a random system gains 30 Danger, and the player receives a warning.

9. **Game UI:** The player can see the remaining time, Laboratory Integrity, system Danger levels, and repair progress.

### Nice to Have

10. **Visual Feedback:** Repairing a system or experiencing a failure produces a simple visual effect, such as a flash or shake.


## Original Vision

I originally wanted Chaos Lab to be a chaotic survival game inspired by RV There Yet?, Overcooked, and BOMBANANA.

What interests me most is the feeling of having too many things going wrong at once. The player needs to deal with time pressure, unexpected accidents, damaged equipment, and situations where fixing one problem might create another.

Eventually, I would like to explore more physical interactions, different types of damage, and a stylized 3D environment. I want the chaos to feel unpredictable and sometimes funny, but still give players enough control to make meaningful decisions.

### MVP Approach

For this first version, I want to focus on one part of that idea: managing multiple connected systems under time pressure.

Instead of building a full 3D environment with physical repairs, the game uses a simple 2D top-down laboratory with three repair stations.

The goal is to see whether the basic repair system and its chain reactions are already fun to play before adding more complex mechanics.