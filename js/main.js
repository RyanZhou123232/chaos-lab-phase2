// Entry point: wires the canvas, state, update, and render into a
// requestAnimationFrame loop. Contains no game rules.

(function startGame() {
  const canvas = document.getElementById('game-canvas');
  // CONFIG is the single source of truth for size; the HTML attributes are
  // just a fallback so the page doesn't flash a default 300x150 canvas.
  canvas.width = CONFIG.canvasWidthPixels;
  canvas.height = CONFIG.canvasHeightPixels;
  const context = canvas.getContext('2d');

  const gameState = createInitialGameState();
  let previousTimestampMilliseconds = null;

  function runFrame(timestampMilliseconds) {
    if (previousTimestampMilliseconds === null) {
      previousTimestampMilliseconds = timestampMilliseconds;
    }
    // Clamped so returning to a backgrounded tab (where rAF pauses) doesn't
    // apply seconds of danger/damage in a single step.
    const deltaSeconds = Math.min(
      (timestampMilliseconds - previousTimestampMilliseconds) / 1000,
      CONFIG.maxFrameDeltaSeconds
    );
    previousTimestampMilliseconds = timestampMilliseconds;

    updateGame(gameState, Input, deltaSeconds);
    renderGame(context, gameState);
    // After update has consumed this frame's key presses.
    Input.endFrame();

    requestAnimationFrame(runFrame);
  }

  requestAnimationFrame(runFrame);
})();
