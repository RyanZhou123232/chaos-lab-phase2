// Game state and every gameplay rule: movement, danger, repair, stress
// transfer, integrity, timer, win/lose. Nothing here draws; render.js reads
// the state produced here.

const GAME_PHASE = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

function createInitialGameState() {
  return {
    phase: GAME_PHASE.PLAYING,
    remainingSeconds: CONFIG.gameDurationSeconds,
    integrity: CONFIG.startingIntegrity,
    player: createPlayer(),
    stations: createStations(),
    // Recomputed every frame so render.js can show the "Press E" prompt
    // without duplicating the range rule. null when nothing is in range.
    stationInRepairRangeId: null,
    // The repair in progress, or null. Only one exists at a time, which is
    // what limits the player to repairing one station at once.
    activeRepair: null, // { stationId, elapsedSeconds }
    secondsUntilNextIncident: CONFIG.randomIncidentIntervalSeconds,
    // Short-lived feedback from the last incident; null / 0 once expired.
    incidentWarning: null, // { text, secondsRemaining }
    incidentFlash: null,   // { stationId, secondsRemaining }
    screenShakeSecondsRemaining: 0,
    // Visual-only event logs. game.js records WHEN things happened (in game
    // clock seconds, see getElapsedGameSeconds) and prunes them once their
    // effect has finished; render.js decides how they look.
    stressTransfers: [],    // { fromStationId, toStationId, startedAtSeconds }
    dangerChangePopups: [], // { stationId, amount, createdAtSeconds } (createdAt may be in the future)
  };
}

// Restart mutates in place so main.js keeps a single state reference.
function restartGame(state) {
  Object.assign(state, createInitialGameState());
}

function updateGame(state, input, deltaSeconds) {
  if (state.phase !== GAME_PHASE.PLAYING) {
    // Simulation is frozen on the end screen; R is only honored here so it
    // does nothing during play.
    if (input.wasJustPressed(KEY_BINDINGS.restart)) {
      restartGame(state);
    }
    return;
  }

  updatePlayerMovement(state.player, input, deltaSeconds);
  increaseDangerPassively(state.stations, deltaSeconds);
  updateIncidentFeedbackTimers(state, deltaSeconds);
  pruneExpiredVisualEvents(state);
  updateRandomIncidents(state, deltaSeconds);

  state.stationInRepairRangeId = findStationInRepairRangeId(state);
  updateRepair(state, input, deltaSeconds);

  applyOverloadDamageToIntegrity(state, deltaSeconds);
  state.remainingSeconds = Math.max(0, state.remainingSeconds - deltaSeconds);

  // Lose is checked first: if integrity hits 0 on the same frame the timer
  // runs out, the spec's win condition (integrity > 0) is not met.
  if (state.integrity <= 0) {
    state.phase = GAME_PHASE.LOST;
  } else if (state.remainingSeconds <= 0) {
    state.phase = GAME_PHASE.WON;
  }
}

// --- Movement ---------------------------------------------------------------

function updatePlayerMovement(player, input, deltaSeconds) {
  let directionX = 0;
  let directionY = 0;
  if (input.isAnyHeld(KEY_BINDINGS.moveLeft)) directionX -= 1;
  if (input.isAnyHeld(KEY_BINDINGS.moveRight)) directionX += 1;
  if (input.isAnyHeld(KEY_BINDINGS.moveUp)) directionY -= 1;
  if (input.isAnyHeld(KEY_BINDINGS.moveDown)) directionY += 1;

  // Normalize so diagonal movement isn't ~41% faster than straight movement.
  const length = Math.hypot(directionX, directionY);
  if (length > 0) {
    const distance = CONFIG.playerSpeedPixelsPerSecond * deltaSeconds;
    player.x += (directionX / length) * distance;
    player.y += (directionY / length) * distance;
  }

  // Stations are intentionally not solid in Phase 1 (no physics); only the
  // walls block the player.
  const bounds = getWalkableBounds();
  player.x = clamp(player.x, bounds.left + player.radius, bounds.right - player.radius);
  player.y = clamp(player.y, bounds.top + player.radius, bounds.bottom - player.radius);
}

// Inner edge of the walls. Shared with render.js so walls are drawn exactly
// where collision happens.
function getWalkableBounds() {
  const wall = CONFIG.wallThicknessPixels;
  return {
    left: wall,
    right: CONFIG.canvasWidthPixels - wall,
    top: CONFIG.hudHeightPixels + wall,
    bottom: CONFIG.canvasHeightPixels - wall,
  };
}

// --- Danger -----------------------------------------------------------------

function increaseDangerPassively(stations, deltaSeconds) {
  for (const station of stations) {
    changeStationDanger(station, CONFIG.passiveDangerIncreasePerSecond * deltaSeconds);
  }
}

// Single entry point for every Danger change so the [0, 100] clamp can't be
// forgotten by a new rule (repairs, incidents, ...).
function changeStationDanger(station, amount) {
  station.danger = clamp(station.danger + amount, CONFIG.minDanger, CONFIG.maxDanger);
}

function isStationOverloaded(station) {
  return station.danger >= CONFIG.overloadDangerThreshold;
}

function isStationInWarning(station) {
  return station.danger >= CONFIG.warningDangerThreshold;
}

function findStationById(stations, stationId) {
  return stations.find(function (station) { return station.id === stationId; });
}

// --- Repair -----------------------------------------------------------------

// Returns the id of the closest station within repair range, or null.
// Choosing only the closest one enforces "one station at a time" even if
// stations are ever placed close together.
function findStationInRepairRangeId(state) {
  let closestStationId = null;
  let closestDistance = Infinity;
  for (const station of state.stations) {
    const distance = distanceFromPointToStationEdge(state.player.x, state.player.y, station);
    if (distance <= CONFIG.repairRangePixels && distance < closestDistance) {
      closestDistance = distance;
      closestStationId = station.id;
    }
  }
  return closestStationId;
}

// Measured to the station's edge rather than its center so the range feels
// the same no matter how big stations are drawn.
function distanceFromPointToStationEdge(pointX, pointY, station) {
  const half = station.size / 2;
  const nearestX = clamp(pointX, station.x - half, station.x + half);
  const nearestY = clamp(pointY, station.y - half, station.y + half);
  return Math.hypot(pointX - nearestX, pointY - nearestY);
}

// Hold-to-repair. A repair only STARTS on a fresh E press (not while E is
// merely held), which is what forces a release + re-press after a completed
// or cancelled repair.
function updateRepair(state, input, deltaSeconds) {
  const repair = state.activeRepair;

  if (repair === null) {
    if (state.stationInRepairRangeId !== null && input.wasJustPressed(KEY_BINDINGS.repair)) {
      state.activeRepair = { stationId: state.stationInRepairRangeId, elapsedSeconds: 0 };
    }
    return;
  }

  // Comparing ids (not just "anything in range") also cancels if a
  // different station became the nearest one mid-repair.
  const isStillHoldingRepairKey = input.isHeld(KEY_BINDINGS.repair);
  const isSameStationInRange = state.stationInRepairRangeId === repair.stationId;
  if (!isStillHoldingRepairKey || !isSameStationInRange) {
    state.activeRepair = null; // Cancel: progress is discarded, not paused.
    return;
  }

  repair.elapsedSeconds += deltaSeconds;
  if (repair.elapsedSeconds >= CONFIG.repairHoldDurationSeconds) {
    completeRepair(state, findStationById(state.stations, repair.stationId));
    state.activeRepair = null;
  }
}

// 0..1 progress of the active repair, for render.js. 0 when none.
function getRepairProgressRatio(state) {
  if (state.activeRepair === null) return 0;
  return Math.min(1, state.activeRepair.elapsedSeconds / CONFIG.repairHoldDurationSeconds);
}

function completeRepair(state, repairedStation) {
  changeStationDanger(repairedStation, -CONFIG.repairDangerReduction);

  // Stress transfer follows the data-driven link, not hard-coded station names.
  const linkedStation = findStationById(state.stations, repairedStation.linkedStationId);
  if (linkedStation) {
    changeStationDanger(linkedStation, CONFIG.repairLinkedStationDangerIncrease);
  }

  const now = getElapsedGameSeconds(state);
  state.dangerChangePopups.push({
    stationId: repairedStation.id, amount: -CONFIG.repairDangerReduction, createdAtSeconds: now,
  });
  if (linkedStation) {
    state.stressTransfers.push({
      fromStationId: repairedStation.id, toStationId: linkedStation.id, startedAtSeconds: now,
    });
    // Danger itself changes immediately (rules are untouched); only the
    // popup waits for the pulse to land so the cause -> effect reads in order.
    state.dangerChangePopups.push({
      stationId: linkedStation.id,
      amount: CONFIG.repairLinkedStationDangerIncrease,
      createdAtSeconds: now + CONFIG.stressTransferTravelSeconds,
    });
  }
}

// --- Random incidents -------------------------------------------------------

function updateRandomIncidents(state, deltaSeconds) {
  state.secondsUntilNextIncident -= deltaSeconds;
  if (state.secondsUntilNextIncident > 0) return;
  // Add (not reset) the interval so frame timing doesn't make incidents drift.
  state.secondsUntilNextIncident += CONFIG.randomIncidentIntervalSeconds;

  const stationIndex = Math.floor(Math.random() * state.stations.length);
  triggerIncident(state, state.stations[stationIndex]);
}

function triggerIncident(state, station) {
  changeStationDanger(station, CONFIG.randomIncidentDangerIncrease);
  state.incidentWarning = {
    text: station.displayName + ' SURGE!',
    secondsRemaining: CONFIG.incidentWarningDurationSeconds,
  };
  state.incidentFlash = {
    stationId: station.id,
    secondsRemaining: CONFIG.incidentStationFlashDurationSeconds,
  };
  state.screenShakeSecondsRemaining = CONFIG.screenShakeDurationSeconds;
  state.dangerChangePopups.push({
    stationId: station.id,
    amount: CONFIG.randomIncidentDangerIncrease,
    createdAtSeconds: getElapsedGameSeconds(state),
  });
}

// Runs before updateRandomIncidents so a newly triggered incident keeps its
// full duration for this frame.
function updateIncidentFeedbackTimers(state, deltaSeconds) {
  if (state.incidentWarning !== null) {
    state.incidentWarning.secondsRemaining -= deltaSeconds;
    if (state.incidentWarning.secondsRemaining <= 0) state.incidentWarning = null;
  }
  if (state.incidentFlash !== null) {
    state.incidentFlash.secondsRemaining -= deltaSeconds;
    if (state.incidentFlash.secondsRemaining <= 0) state.incidentFlash = null;
  }
  state.screenShakeSecondsRemaining = Math.max(0, state.screenShakeSecondsRemaining - deltaSeconds);
}

// --- Visual event bookkeeping ------------------------------------------------

// Game-clock time. Animations use this instead of wall-clock time so they
// freeze on the end screen and restart from 0 with the game.
function getElapsedGameSeconds(state) {
  return CONFIG.gameDurationSeconds - state.remainingSeconds;
}

// Keeps the event lists from growing forever. Lifetimes come from CONFIG so
// this stays in sync with how long render.js animates each event.
function pruneExpiredVisualEvents(state) {
  const now = getElapsedGameSeconds(state);
  const transferLifetime = CONFIG.stressTransferTravelSeconds + CONFIG.stressTransferArrivalFlashSeconds;
  state.stressTransfers = state.stressTransfers.filter(function (transfer) {
    return now - transfer.startedAtSeconds < transferLifetime;
  });
  state.dangerChangePopups = state.dangerChangePopups.filter(function (popup) {
    return now - popup.createdAtSeconds < CONFIG.floatingNumberDurationSeconds;
  });
}

function isAnyStationOverloaded(state) {
  return state.stations.some(isStationOverloaded);
}

// --- Integrity --------------------------------------------------------------

function applyOverloadDamageToIntegrity(state, deltaSeconds) {
  const overloadedStationCount = state.stations.filter(isStationOverloaded).length;
  const damage = overloadedStationCount * CONFIG.overloadIntegrityDamagePerSecondPerStation * deltaSeconds;
  state.integrity = Math.max(0, state.integrity - damage);
}

// --- Helpers ----------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
