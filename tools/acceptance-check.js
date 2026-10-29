// Independent checks against SPEC.md's numbered criteria (not CONFIG-derived
// expectations). No dependencies; these exercise real input and game scripts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function game() {
  const listeners = {};
  const context = vm.createContext({
    window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
  });
  for (const name of ['config', 'input', 'entities', 'game']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'), context);
  }
  const run = code => vm.runInContext(code, context);
  run('var state = createInitialGameState();');
  return {
    run,
    press: code => listeners.keydown({ code, preventDefault() {} }),
    release: code => listeners.keyup({ code }),
    blur: () => listeners.blur(),
    step: seconds => run(`updateGame(state, Input, ${seconds}); Input.endFrame();`),
  };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
function test(name, body) { body(game()); console.log('ok  ' + name); }

test('1: WASD and arrow movement, normalized diagonals, all four walls', g => {
  for (const [key, axis, sign] of [
    ['KeyW', 'y', -1], ['KeyS', 'y', 1], ['KeyA', 'x', -1], ['KeyD', 'x', 1],
    ['ArrowUp', 'y', -1], ['ArrowDown', 'y', 1], ['ArrowLeft', 'x', -1], ['ArrowRight', 'x', 1],
  ]) {
    g.run('state = createInitialGameState();');
    const before = g.run(`state.player.${axis}`);
    g.press(key); g.step(0.1); g.release(key);
    assert.ok((g.run(`state.player.${axis}`) - before) * sign > 0);
  }
  g.run('state = createInitialGameState();');
  g.press('KeyD'); g.press('KeyS'); g.step(0.1); g.blur();
  near(g.run('Math.hypot(state.player.x - CONFIG.playerStartX, state.player.y - CONFIG.playerStartY)'), g.run('CONFIG.playerSpeedPixelsPerSecond * 0.1'));
  g.run('state.secondsUntilNextIncident = 1e9;'); // Isolate walls from random losses during this long walk.
  for (const [key, axis, boundary, offset] of [
    ['KeyA', 'x', 'left', 1], ['KeyD', 'x', 'right', -1],
    ['KeyW', 'y', 'top', 1], ['KeyS', 'y', 'bottom', -1],
  ]) {
    g.press(key);
    for (let frame = 0; frame < 60; frame++) g.step(0.1);
    g.release(key);
    near(g.run(`state.player.${axis}`), g.run(`getWalkableBounds().${boundary} + ${offset} * state.player.radius`));
  }
});

test('2: three stations start at 40, gain exactly 1.2/s, clamped to 0..100', g => {
  assert.strictEqual(g.run('state.stations.length'), 3);
  assert.ok(g.run('state.stations.every(s => s.danger === 40)'));
  g.step(0.1);
  assert.ok(g.run('state.stations.every(s => Math.abs(s.danger - 40.12) < 1e-8)'));
  g.run('changeStationDanger(state.stations[0], 1000); changeStationDanger(state.stations[1], -1000);');
  near(g.run('state.stations[0].danger'), 100);
  near(g.run('state.stations[1].danger'), 0);
});

test('3/4: exactly 1.5s hold completes each -45/+15 link, one repair per press', g => {
  for (const [source, target] of [['power', 'cooling'], ['cooling', 'stabilizer'], ['stabilizer', 'power']]) {
    g.run(`state = createInitialGameState(); state.stations.forEach(s => s.danger = 60);
      state.player.x = findStationById(state.stations, '${source}').x;
      state.player.y = findStationById(state.stations, '${source}').y;`);
    g.press('KeyE');
    for (let frame = 0; frame < 14; frame++) g.step(0.1);
    assert.ok(g.run('state.activeRepair !== null'));
    g.step(0.1);
    assert.strictEqual(g.run('state.activeRepair'), null);
    near(g.run(`findStationById(state.stations, '${source}').danger`), 60 + 1.8 - 45);
    near(g.run(`findStationById(state.stations, '${target}').danger`), 60 + 1.8 + 15);
    g.step(0.1);
    assert.strictEqual(g.run('state.activeRepair'), null);
    g.release('KeyE');
  }
});

test('3: release, leaving range and focus loss cancel; quick taps do not start repairs', g => {
  const position = () => g.run('state = createInitialGameState(); state.player.x = state.stations[0].x; state.player.y = state.stations[0].y;');
  for (const cancel of [() => g.release('KeyE'), () => g.run('state.player.x = 480; state.player.y = 330;'), () => g.blur()]) {
    position(); g.press('KeyE'); g.step(0.5); cancel(); g.step(0.1);
    assert.strictEqual(g.run('state.activeRepair'), null);
    assert.strictEqual(g.run('state.stressTransfers.length'), 0);
    g.blur();
  }
  position(); g.press('KeyE'); g.release('KeyE'); g.step(0.1);
  assert.strictEqual(g.run('state.activeRepair'), null);
});

test('5: warning at 60, overload at 80, 6 Integrity/s per overloaded system', g => {
  g.run('state.stations[0].danger = 59.99;');
  assert.strictEqual(g.run('isStationInWarning(state.stations[0])'), false);
  g.run('state.stations[0].danger = 60;');
  assert.strictEqual(g.run('isStationInWarning(state.stations[0])'), true);
  g.run('state.stations[0].danger = 79.99;');
  assert.strictEqual(g.run('isStationOverloaded(state.stations[0])'), false);
  for (let count = 0; count <= 3; count++) {
    g.run(`state.integrity = 100; state.stations.forEach((s, i) => s.danger = i < ${count} ? 80 : 0); applyOverloadDamageToIntegrity(state, 1);`);
    near(g.run('state.integrity'), 100 - count * 6);
  }
});

test('6: 90-second win, zero-Integrity loss, loss wins simultaneous tie', g => {
  near(g.run('state.remainingSeconds'), 90);
  // Repairs/hazards have separate checks; keep systems safe to isolate the clock.
  for (let frame = 0; frame < 900; frame++) {
    g.run('state.stations.forEach(s => s.danger = 0);'); g.step(0.1);
  }
  // Subtracting 0.1 repeatedly can leave a sub-picosecond remainder.
  assert.ok(g.run('state.remainingSeconds < 1e-8'));
  g.step(0.000001);
  assert.strictEqual(g.run('state.phase'), 'won');
  assert.ok(g.run('state.integrity > 0'));
  g.run('state = createInitialGameState(); state.integrity = 0.3; state.remainingSeconds = 0.05; state.stations[0].danger = 80;');
  g.step(0.1);
  assert.strictEqual(g.run('state.phase'), 'lost');
});

test('6: final frame cannot apply damage after the 90-second destination', g => {
  g.run('state.remainingSeconds = 0.05; state.integrity = 0.4; state.stations[0].danger = 80;');
  g.step(0.1);
  assert.strictEqual(g.run('state.phase'), 'won');
  near(g.run('state.integrity'), 0.1);
});

test('7: R restarts both outcomes and resets state; R does nothing during play', g => {
  g.press('KeyR'); g.step(0.1); g.release('KeyR');
  near(g.run('state.remainingSeconds'), 89.9);
  for (const phase of ['won', 'lost']) {
    g.run(`state.phase = '${phase}'; state.integrity = 0; state.remainingSeconds = 0;`);
    g.press('KeyR'); g.step(0.1); g.release('KeyR');
    assert.strictEqual(g.run('state.phase'), 'playing');
    near(g.run('state.remainingSeconds'), 90);
    near(g.run('state.integrity'), 100);
    assert.ok(g.run('state.stations.every(s => s.danger === 40)'));
    assert.strictEqual(g.run('state.activeRepair'), null);
    assert.strictEqual(g.run('state.stressTransfers.length'), 0);
  }
});

test('8: repeated 6-second incidents add 30 Danger and name their target', g => {
  g.run('Math.random = () => 0.5;');
  for (let cycle = 0; cycle < 2; cycle++) {
    const prior = g.run('state.stations[1].danger');
    const timeBefore = g.run('state.remainingSeconds');
    for (let frame = 0; frame < 59; frame++) g.step(0.1);
    assert.strictEqual(g.run('state.incidentWarning'), null);
    g.step(0.1);
    // Floating point may move the event to the next frame by <0.1s.
    if (g.run('state.incidentWarning === null')) g.step(0.000001);
    const seconds = timeBefore - g.run('state.remainingSeconds');
    near(g.run('state.stations[1].danger'), Math.min(100, prior + seconds * 1.2 + 30));
    assert.strictEqual(g.run('state.incidentWarning.text'), 'COOLING SURGE!');
  }
});

console.log('All numbered gameplay acceptance checks passed. UI and effects require a browser visual check.');
