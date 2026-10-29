const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const screenshots = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(screenshots, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.testFrames = [];
      window.requestAnimationFrame = callback => { testFrames.push(callback); return testFrames.length; };
      window.testTime = 0;
      Math.random = () => 0.5;
    });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.evaluate(() => {
      const original = updateGame;
      window.updateGame = (state, input, dt) => { original(state, input, dt); window.observedState = state; };
      testFrames.shift()(0);
    });
    const advance = seconds => page.evaluate(seconds => {
      const count = Math.round(seconds / 0.01);
      for (let i = 0; i < count; i++) { testTime += 10; testFrames.shift()(testTime); }
    }, seconds);
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(observedState)));
    assert.strictEqual((await state()).remainingSeconds, 90);
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-start.png') });
    await page.keyboard.down('a'); await advance(1.25); await page.keyboard.up('a');
    await page.keyboard.down('w'); await advance(0.54); await page.keyboard.up('w');
    assert.strictEqual((await state()).stationInRepairRangeId, 'power');
    await page.keyboard.down('e'); await advance(0.75);
    assert.ok((await state()).activeRepair.elapsedSeconds > 0.7);
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-repair.png') });
    await page.keyboard.up('e'); await advance(0.01);
    assert.strictEqual((await state()).activeRepair, null);
    await page.keyboard.down('e'); await advance(1.51); await page.keyboard.up('e');
    assert.strictEqual((await state()).stressTransfers.length, 1);
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-transfer.png') });
    await advance(2);
    assert.strictEqual((await state()).incidentWarning.text, 'COOLING SURGE!');
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-incident.png') });
    await advance(45);
    assert.strictEqual((await state()).phase, 'lost');
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-loss.png') });
    await page.keyboard.press('r'); await advance(0.01);
    assert.strictEqual((await state()).phase, 'playing');
    assert.strictEqual((await state()).remainingSeconds, 90);
    // Exercise a complete playable journey with an automated repair strategy.
    // It uses the same movement, hold duration, hazards and frame loop as a player.
    let cycles = 0;
    while ((await state()).phase === 'playing' && cycles++ < 150) {
      const s = await state();
      const station = s.stations.slice().sort((a, b) => b.danger - a.danger)[0];
      await page.evaluate(id => {
        const target = findStationById(observedState.stations, id);
        const keys = ['KeyA', 'KeyD', 'KeyW', 'KeyS'];
        for (let frame = 0; frame < 500 && observedState.phase === 'playing'; frame++) {
          if (distanceFromPointToStationEdge(observedState.player.x, observedState.player.y, target) <= 46) break;
          const dx = target.x - observedState.player.x;
          const dy = target.y - observedState.player.y;
          const active = new Set([Math.abs(dx) > 2 ? (dx > 0 ? 'KeyD' : 'KeyA') : '', Math.abs(dy) > 2 ? (dy > 0 ? 'KeyS' : 'KeyW') : '']);
          for (const code of keys) window.dispatchEvent(new KeyboardEvent(active.has(code) ? 'keydown' : 'keyup', {code}));
          testTime += 10; testFrames.shift()(testTime);
        }
        for (const code of keys) window.dispatchEvent(new KeyboardEvent('keyup', {code}));
      }, station.id);
      await page.keyboard.down('e'); await advance(1.51); await page.keyboard.up('e'); await advance(0.01);
    }
    assert.strictEqual((await state()).phase, 'won');
    await page.screenshot({ path: path.join(screenshots, 'chaos-lab-win.png') });
    await page.keyboard.press('r'); await advance(0.01);
    assert.strictEqual((await state()).remainingSeconds, 90);
    assert.deepStrictEqual(errors, []);
    console.log('PASS: real Chrome file:// load, keyboard movement, repair progress/cancel/complete, transfer, incident, loss, restart, full 90-second win with automated repair strategy, win restart; no page errors.');
    console.log('Automated strategy cycles:', cycles);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
