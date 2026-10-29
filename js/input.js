// Keyboard state, split into "held" (for movement) and "just pressed this
// frame" (for one-shot actions like repair and restart). Keys are identified
// by KeyboardEvent.code (e.g. 'KeyW', 'ArrowUp') so they follow physical key
// position regardless of keyboard layout.

const Input = (function () {
  const heldKeyCodes = new Set();
  const justPressedKeyCodes = new Set();

  // Keys the browser would otherwise use to scroll the page.
  const keyCodesToSuppressDefault = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  ]);

  window.addEventListener('keydown', function (event) {
    if (keyCodesToSuppressDefault.has(event.code)) {
      event.preventDefault();
    }
    // OS auto-repeat fires keydown repeatedly while held; only the first one
    // counts as a fresh press, otherwise holding E would spam repairs.
    if (!heldKeyCodes.has(event.code)) {
      justPressedKeyCodes.add(event.code);
    }
    heldKeyCodes.add(event.code);
  });

  window.addEventListener('keyup', function (event) {
    heldKeyCodes.delete(event.code);
  });

  // keyup never arrives if the window loses focus mid-press, which would
  // leave the player walking forever.
  window.addEventListener('blur', function () {
    heldKeyCodes.clear();
    justPressedKeyCodes.clear();
  });

  return {
    isHeld: function (keyCode) {
      return heldKeyCodes.has(keyCode);
    },
    wasJustPressed: function (keyCode) {
      return justPressedKeyCodes.has(keyCode);
    },
    isAnyHeld: function (keyCodes) {
      return keyCodes.some(function (keyCode) { return heldKeyCodes.has(keyCode); });
    },
    // Must be called once at the END of every frame, after update() has read
    // input; that is what makes "just pressed" last exactly one frame.
    endFrame: function () {
      justPressedKeyCodes.clear();
    },
  };
})();

// Logical action -> physical keys. Rebinding happens here only.
const KEY_BINDINGS = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  repair: 'KeyE',
  restart: 'KeyR',
};
