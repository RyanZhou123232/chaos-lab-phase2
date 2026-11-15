// Gameplay calculations shared by the browser loop and Node checks.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getPlayerPosition(player, directionX, directionY, deltaSeconds, bounds, config) {
  let { x, y, radius } = player;
  // Normalize so diagonal movement has the same speed as straight movement.
  const length = Math.hypot(directionX, directionY);
  if (length > 0) {
    const distance = config.playerSpeedPixelsPerSecond * deltaSeconds;
    x += (directionX / length) * distance;
    y += (directionY / length) * distance;
  }

  return {
    x: clamp(x, bounds.left + radius, bounds.right - radius),
    y: clamp(y, bounds.top + radius, bounds.bottom - radius),
  };
}

export function getRepairDangers(repairedStation, linkedStation, config) {
  const repairedDanger = clamp(
    repairedStation.danger - config.repairDangerReduction,
    config.minDanger,
    config.maxDanger
  );
  if (!linkedStation) return { repairedDanger };

  const linkedDangerBeforeTransfer = linkedStation === repairedStation
    ? repairedDanger
    : linkedStation.danger;
  const linkedDanger = clamp(
    linkedDangerBeforeTransfer + config.repairLinkedStationDangerIncrease,
    config.minDanger,
    config.maxDanger
  );
  return { repairedDanger, linkedDanger };
}

export function isStationOverloaded(station, config) {
  return station.danger > config.overloadDangerThreshold;
}

export function getIntegrityAfterOverload(integrity, stations, deltaSeconds, config) {
  const overloadedStationCount = stations.filter(station => isStationOverloaded(station, config)).length;
  const damage = overloadedStationCount * config.overloadIntegrityDamagePerSecondPerStation * deltaSeconds;
  return Math.max(0, integrity - damage);
}
