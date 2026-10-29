// Headless check of the game rules in js/game.js. Developer tool only: the
// game itself never loads this file and needs no Node.
//
// Run from anywhere:   node tools/rules-check.js
//
// It loads the real game scripts in index.html order into a sandbox with a
// fake window/canvas, drives updateGame() with simulated key events, and
// asserts on the resulting state. Exits non-zero on the first failure.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const keyListeners = {};
// Every method call returns the context itself, so chained objects like
// createRadialGradient(...).addColorStop(...) don't hit undefined.
const noOpCanvasContext = new Proxy({}, { get: () => () => noOpCanvasContext, set: () => true });
const sandbox = {
  console,
  window: { addEventListener: (eventName, handler) => { keyListeners[eventName] = handler; } },
  document: { getElementById: () => ({ getContext: () => noOpCanvasContext }) },
  requestAnimationFrame: () => {}, // Loop is not driven; tests call updateGame directly.
};
vm.createContext(sandbox);
for (const name of ['config', 'input', 'entities', 'game', 'render', 'main']) {
  const file = path.join(__dirname, '..', 'js', name + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
const run = (code) => vm.runInContext(code, sandbox);
sandbox.noOpCanvasContext = noOpCanvasContext;

const pressKey = (code) => keyListeners.keydown({ code, preventDefault() {} });
const releaseKey = (code) => keyListeners.keyup({ code });
// One frame exactly as main.js does it: update, then clear just-pressed.
const step = (seconds) => run(`updateGame(state, Input, ${seconds}); Input.endFrame();`);
const danger = (id) => run(`findStationById(state.stations, '${id}').danger`);
const config = run('CONFIG');
// Danger every station has after `seconds` of passive increase alone.
const passiveDangerAfter = (seconds) => config.startingDanger + seconds * config.passiveDangerIncreasePerSecond;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

function freshStateNextToPower() {
  // Incidents pushed far out so they don't interfere with repair tests.
  run(`var state = createInitialGameState();
       state.secondsUntilNextIncident = 1e9;
       state.player.x = 180; state.player.y = 200 + 36 + 20;`);
}

function test(name, body) {
  body();
  console.log('ok  ' + name);
}

test('completed hold repair: Power loses repairDangerReduction, Cooling gains repairLinkedStationDangerIncrease', () => {
  freshStateNextToPower();
  pressKey('KeyE');
  step(0); // Press frame starts the repair.
  assert.strictEqual(run('state.activeRepair.stationId'), 'power');
  const framesToComplete = Math.round(config.repairHoldDurationSeconds / 0.1);
  for (let i = 0; i < framesToComplete - 1; i++) step(0.1); // One frame short: not done yet.
  near(danger('power'), passiveDangerAfter((framesToComplete - 1) * 0.1));
  step(0.1); // Reaches repairHoldDurationSeconds: completes.
  assert.strictEqual(run('state.activeRepair'), null);
  const secondsElapsed = framesToComplete * 0.1;
  near(danger('power'), Math.max(config.minDanger, passiveDangerAfter(secondsElapsed) - config.repairDangerReduction));
  near(danger('cooling'), Math.min(config.maxDanger, passiveDangerAfter(secondsElapsed) + config.repairLinkedStationDangerIncrease));
  releaseKey('KeyE');
});

test('holding E after completion does not start another repair', () => {
  freshStateNextToPower();
  pressKey('KeyE');
  for (let i = 0; i < 16; i++) step(0.1);
  for (let i = 0; i < 20; i++) step(0.1); // Still holding.
  assert.strictEqual(run('state.activeRepair'), null);
  releaseKey('KeyE'); step(0.1);
  pressKey('KeyE'); step(0.1);
  assert.strictEqual(run('state.activeRepair.stationId'), 'power');
  releaseKey('KeyE');
});

test('releasing E cancels and resets progress', () => {
  freshStateNextToPower();
  pressKey('KeyE');
  for (let i = 0; i < 10; i++) step(0.1);
  releaseKey('KeyE'); step(0.1);
  assert.strictEqual(run('state.activeRepair'), null);
  pressKey('KeyE'); step(0.1);
  near(run('state.activeRepair.elapsedSeconds'), 0); // Starts over, not from 1.0.
  releaseKey('KeyE');
});

test('walking out of range cancels; no effects applied', () => {
  freshStateNextToPower();
  pressKey('KeyE');
  for (let i = 0; i < 10; i++) step(0.1);
  run('state.player.x = 480; state.player.y = 330;');
  step(0.1);
  assert.strictEqual(run('state.activeRepair'), null);
  near(danger('cooling'), passiveDangerAfter(1.1)); // No stress transfer applied.
  releaseKey('KeyE');
});

test('incident adds randomIncidentDangerIncrease to a random station every interval and sets feedback', () => {
  run('var state = createInitialGameState(); Math.random = () => 0.5;'); // index 1 = cooling
  const framesToIncident = Math.round(config.randomIncidentIntervalSeconds / 0.1);
  for (let i = 0; i < framesToIncident - 1; i++) step(0.1);
  assert.strictEqual(run('state.incidentWarning'), null);
  // Summing 0.1 repeatedly lands a hair under/over the interval in floating
  // point, so allow the incident to fire on the expected frame or the next.
  let frames = framesToIncident - 1;
  while (run('state.incidentWarning') === null && frames < framesToIncident + 1) { step(0.1); frames++; }
  const dangerFromTime = passiveDangerAfter(run('CONFIG.gameDurationSeconds - state.remainingSeconds'));
  near(danger('cooling'), Math.min(config.maxDanger, dangerFromTime + config.randomIncidentDangerIncrease));
  near(danger('power'), dangerFromTime);
  assert.strictEqual(run('state.incidentWarning.text'), 'COOLING SURGE!');
  assert.strictEqual(run('state.incidentFlash.stationId'), 'cooling');
  assert.ok(run('state.screenShakeSecondsRemaining') > 0);
  const feedbackSeconds = Math.max(config.incidentWarningDurationSeconds,
    config.incidentStationFlashDurationSeconds, config.screenShakeDurationSeconds);
  for (let i = 0; i < Math.round(feedbackSeconds / 0.1); i++) step(0.1);
  assert.strictEqual(run('state.incidentWarning'), null);
  assert.strictEqual(run('state.incidentFlash'), null);
  assert.strictEqual(run('state.screenShakeSecondsRemaining'), 0);
});

test('restart clears repair/incident state; render does not throw', () => {
  run('var state = createInitialGameState(); while (state.phase === "playing") updateGame(state, Input, 0.1);');
  run('renderGame(noOpCanvasContext, state);');
  pressKey('KeyR'); step(0.016); releaseKey('KeyR');
  assert.strictEqual(run('state.phase'), 'playing');
  assert.strictEqual(run('state.activeRepair'), null);
  assert.strictEqual(run('state.secondsUntilNextIncident'), config.randomIncidentIntervalSeconds);
  assert.strictEqual(run('state.stressTransfers.length'), 0);
  assert.strictEqual(run('state.dangerChangePopups.length'), 0);
});

test('completed repair records the stress-transfer effect and popups; they expire', () => {
  freshStateNextToPower();
  pressKey('KeyE');
  step(0); // Press frame starts the repair.
  const framesToComplete = Math.round(config.repairHoldDurationSeconds / 0.1);
  for (let i = 0; i < framesToComplete; i++) step(0.1);
  releaseKey('KeyE');
  const completedAt = run('getElapsedGameSeconds(state)');
  assert.strictEqual(run('state.stressTransfers.length'), 1);
  assert.strictEqual(run('state.stressTransfers[0].fromStationId'), 'power');
  assert.strictEqual(run('state.stressTransfers[0].toStationId'), 'cooling');
  // Stamped with the game clock before this frame's timer tick, so it may
  // trail the post-step clock by up to one frame.
  const startedAt = run('state.stressTransfers[0].startedAtSeconds');
  assert.ok(completedAt - startedAt >= 0 && completedAt - startedAt <= 0.1 + 1e-9);
  const popups = run('JSON.stringify(state.dangerChangePopups)');
  assert.deepStrictEqual(JSON.parse(popups).map((p) => [p.stationId, p.amount]), [
    ['power', -config.repairDangerReduction],
    ['cooling', config.repairLinkedStationDangerIncrease],
  ]);
  // The linked popup waits for the pulse to arrive.
  near(JSON.parse(popups)[0].createdAtSeconds, startedAt);
  near(JSON.parse(popups)[1].createdAtSeconds, startedAt + config.stressTransferTravelSeconds);

  // Mid-animation render must not throw.
  step(config.stressTransferTravelSeconds / 2);
  run('renderGame(noOpCanvasContext, state);');

  const lifetime = config.stressTransferTravelSeconds + config.floatingNumberDurationSeconds + 0.2;
  for (let i = 0; i < Math.ceil(lifetime / 0.1); i++) step(0.1);
  assert.strictEqual(run('state.stressTransfers.length'), 0);
  assert.strictEqual(run('state.dangerChangePopups.length'), 0);
});

test('incident records a popup for the hit station', () => {
  run('var state = createInitialGameState(); state.secondsUntilNextIncident = 0.05; Math.random = () => 0;'); // index 0 = power
  step(0.1);
  assert.strictEqual(run('state.dangerChangePopups.length'), 1);
  assert.strictEqual(run('state.dangerChangePopups[0].stationId'), 'power');
  assert.strictEqual(run('state.dangerChangePopups[0].amount'), config.randomIncidentDangerIncrease);
});

test('effects freeze on the end screen', () => {
  run('var state = createInitialGameState(); state.screenShakeSecondsRemaining = 0.2; state.integrity = 0.01;');
  run('state.stations[0].danger = 100;');
  step(0.1); // Overload damage ends the game this frame.
  assert.strictEqual(run('state.phase'), 'lost');
  const frozenAt = run('getElapsedGameSeconds(state)');
  for (let i = 0; i < 5; i++) step(0.1);
  near(run('getElapsedGameSeconds(state)'), frozenAt);
  assert.deepStrictEqual(JSON.parse(run('JSON.stringify(getScreenShakeOffset(state))')), { x: 0, y: 0 });
});

console.log('All rules checks passed.');
