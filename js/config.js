// All tunable numbers live here so balancing never requires touching rule
// or drawing code. Units are in the names: seconds, pixels, or "points" on
// the 0-100 Danger / Integrity scales.

const CONFIG = {
  // --- Canvas & layout -----------------------------------------------------
  canvasWidthPixels: 960,
  canvasHeightPixels: 640,
  hudHeightPixels: 56,           // Top strip reserved for timer/integrity, kept outside the lab so the player never walks under the HUD.
  wallThicknessPixels: 20,       // Visual wall width; also the inset of the walkable area.

  // --- Match ---------------------------------------------------------------
  gameDurationSeconds: 60,       // Survive this long to win.
  maxFrameDeltaSeconds: 0.1,     // Clamp so a background tab returning doesn't simulate a huge jump at once.

  // --- Danger --------------------------------------------------------------
  startingDanger: 40,
  passiveDangerIncreasePerSecond: 1.2,  // Applied to every station, every second.
  warningDangerThreshold: 60,    // >= this: warning visuals.
  overloadDangerThreshold: 80,   // >= this: station damages Integrity.
  minDanger: 0,
  maxDanger: 100,

  // --- Repair --------------------------------------------------------------
  repairDangerReduction: 45,             // Removed from the repaired station.
  repairLinkedStationDangerIncrease: 15, // Added to the station it is linked to (stress transfer).
  repairRangePixels: 48,                 // Max distance from player center to the nearest edge of a station.
  repairHoldDurationSeconds: 1.5,        // E must be held this long, in range, for a repair to complete.

  // --- Laboratory Integrity -------------------------------------------------
  startingIntegrity: 100,
  overloadIntegrityDamagePerSecondPerStation: 6, // Stacks: two overloaded stations = 12/s.

  // --- Random incidents ----------------------------------------------------
  randomIncidentIntervalSeconds: 6,      // Fixed cadence (not random) so players can learn the rhythm; only the target station is random.
  randomIncidentDangerIncrease: 30,
  incidentWarningDurationSeconds: 1.5,   // How long the "<STATION> SURGE!" text stays on screen.
  incidentStationFlashDurationSeconds: 0.5, // How long the hit station flashes white.

  // --- Danger feedback ------------------------------------------------------
  overloadPulsesPerSecond: 2,            // Red pulse speed on overloaded stations; fast enough to read as an alarm.
  overloadPulseMaxOpacity: 0.55,         // Peak opacity of the red pulse; below 1 so the station color still identifies it.
  screenShakeDurationSeconds: 0.25,      // Kept short: a jolt, not a distraction.
  screenShakeMagnitudePixels: 6,         // Max offset in each axis.
  overloadVignetteMaxOpacity: 0.35,      // Red screen-edge glow while any station is overloaded; drawn under stations so labels stay clean.
  overloadVignettePulsesPerSecond: 1.5,  // Slower than the station pulse so the two don't read as one flicker.
  integrityDamageFlashesPerSecond: 4,    // Integrity bar flash speed while it is taking overload damage.
  timerUrgencyThresholdSeconds: 10,      // At or below this many seconds left, the timer turns red and pulses.
  timerUrgencyPulsesPerSecond: 2,

  // --- Stress-transfer & floating numbers (visual only) ----------------------
  stressTransferTravelSeconds: 0.4,      // Time for the glowing pulse to travel from repaired to linked station.
  stressTransferArrivalFlashSeconds: 0.3, // Linked station flash after the pulse lands.
  stressTransferPulseRadiusPixels: 10,
  stressTransferGlowBlurPixels: 24,      // Canvas shadowBlur that makes the pulse glow.
  floatingNumberDurationSeconds: 0.8,    // "-45" / "+15" / "+30" rise and fade over this long.
  floatingNumberRisePixels: 32,

  // --- Station icons & transit floor (visual only) ---------------------------
  stationIconSizePixels: 30,
  stabilizerRingRotationsPerSecond: 0.5,
  transitStripeSpeedPixelsPerSecond: 40, // Slow on purpose: a sense of motion, not a distraction.
  transitStripeSpacingPixels: 80,
  transitStripeWidthPixels: 28,

  // --- Player --------------------------------------------------------------
  playerSpeedPixelsPerSecond: 240,  // Crossing the lab (~600 px) takes ~2.5 s: long enough that walking is a real cost.
  playerSizePixels: 28,             // Diameter of the player circle; also used for wall collision.
  playerStartX: 480,
  playerStartY: 330,

  // --- Stations ------------------------------------------------------------
  stationSizePixels: 72,  // Stations are squares of this side length.

  // Order here is also the HUD/draw order. linkedStationId encodes the stress
  // chain Power -> Cooling -> Stabilizer -> Power; change the chain here, not in code.
  // x/y are station centers, spread out so the player must walk between them.
  stationDefinitions: [
    { id: 'power',      displayName: 'POWER',      color: '#ffa726', x: 180, y: 200, linkedStationId: 'cooling' },
    { id: 'cooling',    displayName: 'COOLING',    color: '#29b6f6', x: 780, y: 200, linkedStationId: 'stabilizer' },
    { id: 'stabilizer', displayName: 'STABILIZER', color: '#ab47bc', x: 480, y: 530, linkedStationId: 'power' },
  ],

  // --- Colors --------------------------------------------------------------
  colors: {
    background: '#1b1c1f',
    floor: '#2e3035',
    floorGridLine: '#34363c',
    transitStripe: '#313338',  // Barely lighter than the floor so the scrolling never competes with stations.
    wall: '#4a4d55',
    hudBackground: '#151619',
    hudText: '#e8e8e8',
    player: '#f5f5f5',
    playerOutline: '#111111',
    dangerBarBackground: '#111214',
    dangerNormal: '#66bb6a',   // Bar color below warning.
    dangerWarning: '#ffd54f',  // Bar/outline color at >= warning threshold.
    dangerOverload: '#ef5350', // Bar/outline color at >= overload threshold (spec: red = damage).
    repairProgress: '#4fc3f7',
    incidentWarningText: '#ef5350',
    incidentFlash: 'rgba(255, 255, 255, 0.8)',
    stationIcon: 'rgba(17, 17, 17, 0.75)',
    floatingNumberDecrease: '#81c784', // Danger going down = good.
    floatingNumberIncrease: '#ff7043', // Danger going up = bad.
    overloadVignette: '239, 83, 80',   // RGB only; opacity is animated.
    integrityDamageFlash: '#ffffff',
    timerUrgent: '#ef5350',
    integrityBar: '#66bb6a',
    integrityBarLow: '#ef5350',
    overlayBackdrop: 'rgba(0, 0, 0, 0.7)',
    winText: '#66bb6a',
    loseText: '#ef5350',
  },
};
