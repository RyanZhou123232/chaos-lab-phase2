// All drawing. Reads game state and never modifies it, so rendering can be
// changed or skipped without affecting the simulation.

function renderGame(context, state) {
  // Cleared every frame because screen shake moves the lab and would
  // otherwise leave the previous frame visible along the edges.
  context.fillStyle = CONFIG.colors.background;
  context.fillRect(0, 0, CONFIG.canvasWidthPixels, CONFIG.canvasHeightPixels);

  // Every animation is driven by the game clock (not wall-clock time) so it
  // freezes with the simulation on the end screen and restarts with R.
  const elapsedGameSeconds = getElapsedGameSeconds(state);

  // Only the lab shakes; the HUD and warnings stay still so they stay readable.
  const shakeOffset = getScreenShakeOffset(state);
  context.save();
  context.translate(shakeOffset.x, shakeOffset.y);

  drawLabFloorAndWalls(context, elapsedGameSeconds);
  // Vignette and transfer pulses go under the stations so they can never
  // cover a Danger number or the repair progress bar.
  if (isAnyStationOverloaded(state)) {
    drawOverloadVignette(context, elapsedGameSeconds);
  }
  for (const transfer of state.stressTransfers) {
    drawStressTransferPulse(context, state, transfer, elapsedGameSeconds);
  }
  for (const station of state.stations) {
    drawStation(context, station, station.id === state.stationInRepairRangeId, elapsedGameSeconds);
    drawOverloadPulse(context, station, elapsedGameSeconds);
    if (state.incidentFlash !== null && state.incidentFlash.stationId === station.id) {
      drawIncidentFlash(context, station);
    }
    drawStressTransferArrivalFlashes(context, state, station, elapsedGameSeconds);
    if (state.activeRepair !== null && state.activeRepair.stationId === station.id) {
      drawRepairProgressBar(context, station, getRepairProgressRatio(state));
    }
  }
  drawPlayer(context, state.player);
  for (const popup of state.dangerChangePopups) {
    drawDangerChangePopup(context, state, popup, elapsedGameSeconds);
  }

  context.restore();

  drawHud(context, state, elapsedGameSeconds);
  if (state.incidentWarning !== null) {
    drawIncidentWarning(context, state.incidentWarning.text);
  }

  // TODO (polish, later): particles, sound.

  if (state.phase !== GAME_PHASE.PLAYING) {
    drawEndOverlay(context, state);
  }
}

// --- Lab ----------------------------------------------------------------------

function drawLabFloorAndWalls(context, elapsedGameSeconds) {
  const colors = CONFIG.colors;
  const bounds = getWalkableBounds();

  // Wall color fills the whole lab area; the floor is then drawn inside,
  // leaving a wall-thickness border.
  context.fillStyle = colors.wall;
  context.fillRect(0, CONFIG.hudHeightPixels, CONFIG.canvasWidthPixels, CONFIG.canvasHeightPixels - CONFIG.hudHeightPixels);

  context.fillStyle = colors.floor;
  context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  drawTransitStripes(context, bounds, elapsedGameSeconds);

  // Faint floor tiles so movement is readable against a flat color.
  const tileSizePixels = 40;
  context.strokeStyle = colors.floorGridLine;
  context.lineWidth = 1;
  context.beginPath();
  for (let x = bounds.left + tileSizePixels; x < bounds.right; x += tileSizePixels) {
    context.moveTo(x + 0.5, bounds.top);
    context.lineTo(x + 0.5, bounds.bottom);
  }
  for (let y = bounds.top + tileSizePixels; y < bounds.bottom; y += tileSizePixels) {
    context.moveTo(bounds.left, y + 0.5);
    context.lineTo(bounds.right, y + 0.5);
  }
  context.stroke();
}

// Bands scrolling right-to-left under the grid, as if the road shows through
// floor panels while the lab drives forward. Clipped to the floor so they
// never touch the walls.
function drawTransitStripes(context, bounds, elapsedGameSeconds) {
  const spacing = CONFIG.transitStripeSpacingPixels;
  const scrollOffset = (elapsedGameSeconds * CONFIG.transitStripeSpeedPixelsPerSecond) % spacing;

  context.save();
  context.beginPath();
  context.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  context.clip();
  context.fillStyle = CONFIG.colors.transitStripe;
  for (let x = bounds.left - scrollOffset; x < bounds.right; x += spacing) {
    context.fillRect(x, bounds.top, CONFIG.transitStripeWidthPixels, bounds.bottom - bounds.top);
  }
  context.restore();
}

// Red glow around the lab edges, under the stations. Opacity pulses so it
// reads as an ongoing alarm rather than a static tint.
function drawOverloadVignette(context, elapsedGameSeconds) {
  const top = CONFIG.hudHeightPixels;
  const width = CONFIG.canvasWidthPixels;
  const height = CONFIG.canvasHeightPixels - top;
  const centerX = width / 2;
  const centerY = top + height / 2;
  const outerRadius = Math.hypot(width, height) / 2;
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * CONFIG.overloadVignettePulsesPerSecond * elapsedGameSeconds);
  const opacity = CONFIG.overloadVignetteMaxOpacity * (0.4 + 0.6 * wave); // Never fully off while overloaded.

  const gradient = context.createRadialGradient(centerX, centerY, outerRadius * 0.55, centerX, centerY, outerRadius);
  gradient.addColorStop(0, 'rgba(' + CONFIG.colors.overloadVignette + ', 0)');
  gradient.addColorStop(1, 'rgba(' + CONFIG.colors.overloadVignette + ', ' + opacity + ')');
  context.fillStyle = gradient;
  context.fillRect(0, top, width, height);
}

// --- Stations -----------------------------------------------------------------

function getDangerColor(station) {
  if (isStationOverloaded(station)) return CONFIG.colors.dangerOverload;
  if (isStationInWarning(station)) return CONFIG.colors.dangerWarning;
  return CONFIG.colors.dangerNormal;
}

function drawStation(context, station, isInRepairRange, elapsedGameSeconds) {
  const half = station.size / 2;
  const left = station.x - half;
  const top = station.y - half;

  // Body in the station's identity color.
  context.fillStyle = station.color;
  context.fillRect(left, top, station.size, station.size);

  // Outline switches to warning/overload color so trouble is visible even
  // without reading the bar. Normal state keeps a neutral dark outline.
  const isTroubled = isStationInWarning(station);
  context.strokeStyle = isTroubled ? getDangerColor(station) : '#000000';
  context.lineWidth = isTroubled ? 5 : 2;
  context.strokeRect(left, top, station.size, station.size);

  // Icon in the upper part, name below it.
  drawStationIcon(context, station, elapsedGameSeconds);
  context.fillStyle = '#111111';
  context.font = 'bold 12px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(station.displayName, station.x, station.y + 24);

  drawStationDangerBar(context, station, left, top);

  if (isInRepairRange) {
    context.fillStyle = CONFIG.colors.hudText;
    context.font = 'bold 14px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText('Hold E to repair', station.x, top + station.size + 8);
  }
}

function drawStationDangerBar(context, station, stationLeft, stationTop) {
  const barWidth = station.size;
  const barHeight = 10;
  const barTop = stationTop - barHeight - 18;
  const fillRatio = station.danger / CONFIG.maxDanger;

  context.fillStyle = CONFIG.colors.dangerBarBackground;
  context.fillRect(stationLeft, barTop, barWidth, barHeight);
  context.fillStyle = getDangerColor(station);
  context.fillRect(stationLeft, barTop, barWidth * fillRatio, barHeight);
  context.strokeStyle = '#000000';
  context.lineWidth = 1;
  context.strokeRect(stationLeft, barTop, barWidth, barHeight);

  // Numeric value above the bar.
  context.fillStyle = getDangerColor(station);
  context.font = 'bold 14px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.fillText('Danger ' + Math.floor(station.danger), station.x, barTop - 2);
}

// Icons are keyed by station id; a station without an entry just shows no icon.
const STATION_ICON_DRAWERS = {
  power: drawLightningIcon,
  cooling: drawSnowflakeIcon,
  stabilizer: drawRotatingRingIcon,
};

function drawStationIcon(context, station, elapsedGameSeconds) {
  const drawIcon = STATION_ICON_DRAWERS[station.id];
  if (!drawIcon) return;
  context.save();
  context.translate(station.x, station.y - 8);
  context.fillStyle = CONFIG.colors.stationIcon;
  context.strokeStyle = CONFIG.colors.stationIcon;
  context.lineCap = 'round';
  drawIcon(context, CONFIG.stationIconSizePixels, elapsedGameSeconds);
  context.restore();
}

// Icon drawers work in a coordinate space centered on the icon.
function drawLightningIcon(context, size) {
  const points = [[0.12, -0.5], [-0.3, 0.06], [-0.02, 0.06], [-0.12, 0.5], [0.3, -0.08], [0.02, -0.08]];
  context.beginPath();
  points.forEach(function (point, index) {
    const x = point[0] * size;
    const y = point[1] * size;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
}

function drawSnowflakeIcon(context, size) {
  const armLength = size / 2;
  const branchLength = size * 0.15;
  context.lineWidth = 3;
  context.beginPath();
  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm * Math.PI) / 3;
    const tipX = Math.cos(angle) * armLength;
    const tipY = Math.sin(angle) * armLength;
    context.moveTo(0, 0);
    context.lineTo(tipX, tipY);
    // Small V near the tip of each arm.
    const branchBaseX = tipX * 0.6;
    const branchBaseY = tipY * 0.6;
    for (const side of [-1, 1]) {
      const branchAngle = angle + side * (Math.PI / 4);
      context.moveTo(branchBaseX, branchBaseY);
      context.lineTo(branchBaseX + Math.cos(branchAngle) * branchLength, branchBaseY + Math.sin(branchAngle) * branchLength);
    }
  }
  context.stroke();
}

// An open ring that keeps turning: the stabilizer is "spinning up" the core.
function drawRotatingRingIcon(context, size, elapsedGameSeconds) {
  const rotation = elapsedGameSeconds * CONFIG.stabilizerRingRotationsPerSecond * 2 * Math.PI;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, size * 0.4, rotation, rotation + Math.PI * 1.6);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  context.fill();
}

// Red overlay whose opacity rises and falls, so overloaded stations read as
// an alarm even in peripheral vision.
function drawOverloadPulse(context, station, elapsedGameSeconds) {
  if (!isStationOverloaded(station)) return;
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * CONFIG.overloadPulsesPerSecond * elapsedGameSeconds);
  const half = station.size / 2;
  context.save();
  context.globalAlpha = CONFIG.overloadPulseMaxOpacity * wave;
  context.fillStyle = CONFIG.colors.dangerOverload;
  context.fillRect(station.x - half, station.y - half, station.size, station.size);
  context.restore();
}

function drawIncidentFlash(context, station) {
  const half = station.size / 2;
  context.fillStyle = CONFIG.colors.incidentFlash;
  context.fillRect(station.x - half, station.y - half, station.size, station.size);
}

// --- Stress transfer & floating numbers ---------------------------------------

// Glowing dot traveling center-to-center in the repaired station's color,
// with a faint trail back to its origin so the direction is unambiguous.
function drawStressTransferPulse(context, state, transfer, elapsedGameSeconds) {
  const progress = (elapsedGameSeconds - transfer.startedAtSeconds) / CONFIG.stressTransferTravelSeconds;
  if (progress < 0 || progress > 1) return;
  const fromStation = findStationById(state.stations, transfer.fromStationId);
  const toStation = findStationById(state.stations, transfer.toStationId);
  const pulseX = fromStation.x + (toStation.x - fromStation.x) * progress;
  const pulseY = fromStation.y + (toStation.y - fromStation.y) * progress;

  context.save();
  context.strokeStyle = fromStation.color;
  context.globalAlpha = 0.35;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(fromStation.x, fromStation.y);
  context.lineTo(pulseX, pulseY);
  context.stroke();

  context.globalAlpha = 1;
  context.shadowColor = fromStation.color;
  context.shadowBlur = CONFIG.stressTransferGlowBlurPixels;
  context.fillStyle = fromStation.color;
  context.beginPath();
  context.arc(pulseX, pulseY, CONFIG.stressTransferPulseRadiusPixels, 0, Math.PI * 2);
  context.fill();
  // White core makes the pulse pop even against a same-colored station.
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(pulseX, pulseY, CONFIG.stressTransferPulseRadiusPixels * 0.45, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// Linked station flashes in the SENDER's color after the pulse lands, so
// players can see which repair caused the hit.
function drawStressTransferArrivalFlashes(context, state, station, elapsedGameSeconds) {
  for (const transfer of state.stressTransfers) {
    if (transfer.toStationId !== station.id) continue;
    const secondsSinceArrival = elapsedGameSeconds - transfer.startedAtSeconds - CONFIG.stressTransferTravelSeconds;
    if (secondsSinceArrival < 0 || secondsSinceArrival > CONFIG.stressTransferArrivalFlashSeconds) continue;

    const fromStation = findStationById(state.stations, transfer.fromStationId);
    const half = station.size / 2;
    context.save();
    context.globalAlpha = 0.85 * (1 - secondsSinceArrival / CONFIG.stressTransferArrivalFlashSeconds);
    context.fillStyle = '#ffffff';
    context.fillRect(station.x - half, station.y - half, station.size, station.size);
    context.strokeStyle = fromStation.color;
    context.lineWidth = 8;
    context.strokeRect(station.x - half - 4, station.y - half - 4, station.size + 8, station.size + 8);
    context.restore();
  }
}

// Floats up along the station's RIGHT side: above the station is reserved
// for the Danger number and repair progress bar.
function drawDangerChangePopup(context, state, popup, elapsedGameSeconds) {
  const age = elapsedGameSeconds - popup.createdAtSeconds;
  if (age < 0 || age > CONFIG.floatingNumberDurationSeconds) return; // Not started yet / finished.
  const station = findStationById(state.stations, popup.stationId);
  const lifeRatio = age / CONFIG.floatingNumberDurationSeconds;
  const text = (popup.amount > 0 ? '+' : '') + popup.amount;

  context.save();
  context.globalAlpha = 1 - lifeRatio;
  context.font = 'bold 22px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  const x = station.x + station.size / 2 + 10;
  const y = station.y - lifeRatio * CONFIG.floatingNumberRisePixels;
  context.lineWidth = 4;
  context.strokeStyle = '#000000';
  context.strokeText(text, x, y);
  context.fillStyle = popup.amount > 0 ? CONFIG.colors.floatingNumberIncrease : CONFIG.colors.floatingNumberDecrease;
  context.fillText(text, x, y);
  context.restore();
}

// Sits above the Danger label (see drawStationDangerBar) so the two bars
// never overlap.
function drawRepairProgressBar(context, station, progressRatio) {
  const barWidth = station.size;
  const barHeight = 8;
  const left = station.x - station.size / 2;
  const top = station.y - station.size / 2 - 64;

  context.fillStyle = CONFIG.colors.dangerBarBackground;
  context.fillRect(left, top, barWidth, barHeight);
  context.fillStyle = CONFIG.colors.repairProgress;
  context.fillRect(left, top, barWidth * progressRatio, barHeight);
  context.strokeStyle = '#000000';
  context.lineWidth = 1;
  context.strokeRect(left, top, barWidth, barHeight);
}

// --- Player -------------------------------------------------------------------

function drawPlayer(context, player) {
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.fillStyle = CONFIG.colors.player;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = CONFIG.colors.playerOutline;
  context.stroke();
}

// --- HUD ----------------------------------------------------------------------

function drawHud(context, state, elapsedGameSeconds) {
  const colors = CONFIG.colors;
  const hudHeight = CONFIG.hudHeightPixels;

  context.fillStyle = colors.hudBackground;
  context.fillRect(0, 0, CONFIG.canvasWidthPixels, hudHeight);

  // Timer (left). Ceil so the display shows 1 until the very end, not 0
  // while time still remains.
  // In the final seconds it turns red and its size pulses.
  const isTimerUrgent = state.remainingSeconds <= CONFIG.timerUrgencyThresholdSeconds;
  let timerFontSize = 22;
  if (isTimerUrgent) {
    const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * CONFIG.timerUrgencyPulsesPerSecond * elapsedGameSeconds);
    timerFontSize += Math.round(6 * wave);
  }
  context.fillStyle = isTimerUrgent ? colors.timerUrgent : colors.hudText;
  context.font = 'bold ' + timerFontSize + 'px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('TIME ' + Math.ceil(state.remainingSeconds) + 's', 20, hudHeight / 2);
  context.fillStyle = colors.hudText;

  // Integrity (right): label + bar + number.
  const barWidth = 260;
  const barHeight = 18;
  const barLeft = CONFIG.canvasWidthPixels - barWidth - 70;
  const barTop = (hudHeight - barHeight) / 2;
  const integrityRatio = state.integrity / CONFIG.startingIntegrity;

  context.font = 'bold 16px sans-serif';
  context.textAlign = 'right';
  context.fillText('INTEGRITY', barLeft - 10, hudHeight / 2);

  context.fillStyle = CONFIG.colors.dangerBarBackground;
  context.fillRect(barLeft, barTop, barWidth, barHeight);
  // Turn red at the same fraction the stations treat as warning, so "low"
  // has one consistent meaning across the UI.
  const isIntegrityLow = integrityRatio <= 1 - CONFIG.warningDangerThreshold / CONFIG.maxDanger;
  context.fillStyle = isIntegrityLow ? colors.integrityBarLow : colors.integrityBar;
  context.fillRect(barLeft, barTop, barWidth * integrityRatio, barHeight);
  // Flash the filled part while overloads are draining it, so the cause
  // (overloaded station) and effect (Integrity loss) are visibly linked.
  if (isAnyStationOverloaded(state)) {
    const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * CONFIG.integrityDamageFlashesPerSecond * elapsedGameSeconds);
    context.save();
    context.globalAlpha = 0.6 * wave;
    context.fillStyle = colors.integrityDamageFlash;
    context.fillRect(barLeft, barTop, barWidth * integrityRatio, barHeight);
    context.restore();
  }
  context.strokeStyle = '#000000';
  context.lineWidth = 1;
  context.strokeRect(barLeft, barTop, barWidth, barHeight);

  context.fillStyle = colors.hudText;
  context.textAlign = 'left';
  context.fillText(String(Math.ceil(state.integrity)), barLeft + barWidth + 10, hudHeight / 2);
}

// --- Incidents & shake --------------------------------------------------------

function drawIncidentWarning(context, text) {
  context.fillStyle = CONFIG.colors.incidentWarningText;
  context.font = 'bold 32px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // Centered between the top stations, clear of every station label.
  context.fillText(text, CONFIG.canvasWidthPixels / 2, CONFIG.hudHeightPixels + 60);
}

// Random each frame: render may pick randomness as long as it never writes
// to state. Strength fades out as the shake timer runs down.
function getScreenShakeOffset(state) {
  // Phase check: a game that ends mid-shake would otherwise jitter forever
  // behind the end overlay, since the shake timer is frozen too.
  if (state.phase !== GAME_PHASE.PLAYING || state.screenShakeSecondsRemaining <= 0) return { x: 0, y: 0 };
  const strength = CONFIG.screenShakeMagnitudePixels *
    (state.screenShakeSecondsRemaining / CONFIG.screenShakeDurationSeconds);
  return {
    x: (Math.random() * 2 - 1) * strength,
    y: (Math.random() * 2 - 1) * strength,
  };
}

// --- End screen ---------------------------------------------------------------

function drawEndOverlay(context, state) {
  const colors = CONFIG.colors;
  const centerX = CONFIG.canvasWidthPixels / 2;
  const centerY = CONFIG.canvasHeightPixels / 2;
  const didWin = state.phase === GAME_PHASE.WON;

  context.fillStyle = colors.overlayBackdrop;
  context.fillRect(0, 0, CONFIG.canvasWidthPixels, CONFIG.canvasHeightPixels);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = didWin ? colors.winText : colors.loseText;
  context.font = 'bold 72px sans-serif';
  context.fillText(didWin ? 'WIN' : 'LOSE', centerX, centerY - 40);

  context.fillStyle = colors.hudText;
  context.font = '20px sans-serif';
  context.fillText(
    didWin ? 'The lab made it to its destination.' : 'Laboratory Integrity reached zero.',
    centerX, centerY + 20
  );
  context.fillText('Press R to restart', centerX, centerY + 60);
}
