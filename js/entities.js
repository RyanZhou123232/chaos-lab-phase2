// Plain-data constructors for the things in the lab. These hold state only;
// all behavior (movement, danger, repair) lives in game.js.

function createPlayer() {
  return {
    x: CONFIG.playerStartX, // Center of the player circle.
    y: CONFIG.playerStartY,
    radius: CONFIG.playerSizePixels / 2,
  };
}

function createStation(definition) {
  return {
    id: definition.id,
    displayName: definition.displayName,
    color: definition.color,
    x: definition.x, // Center of the station square.
    y: definition.y,
    size: CONFIG.stationSizePixels,
    // Which station receives stress when THIS one is repaired.
    linkedStationId: definition.linkedStationId,
    danger: CONFIG.startingDanger,
  };
}

function createStations() {
  return CONFIG.stationDefinitions.map(createStation);
}
