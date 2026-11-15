import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIntegrityAfterOverload, getPlayerPosition, getRepairDangers } from '../js/game-rules.mjs';

const overloadConfig = {
  overloadDangerThreshold: 80,
  overloadIntegrityDamagePerSecondPerStation: 6,
};

test('one station at 80 Danger drains 6 Integrity in one second', () => {
  const stations = [{ danger: 80 }, { danger: 79 }];
  const integrity = getIntegrityAfterOverload(100, stations, 1, overloadConfig);

  assert.equal(integrity, 94);
});

const bounds = { left: 20, right: 940, top: 76, bottom: 620 };
const movementConfig = { playerSpeedPixelsPerSecond: 240 };
const player = { x: 480, y: 330, radius: 12 };

test('walking right for half a second moves exactly 120 pixels', () => {
  const position = getPlayerPosition(player, 1, 0, 0.5, bounds, movementConfig);

  assert.deepEqual(position, { x: 600, y: 330 });
});

test('diagonal movement covers the same distance as straight movement', () => {
  const position = getPlayerPosition(player, 1, -1, 0.5, bounds, movementConfig);
  const distance = Math.hypot(position.x - player.x, position.y - player.y);

  assert.ok(Math.abs(distance - 120) < 1e-9, `expected 120 pixels, got ${distance}`);
  assert.ok(position.x > player.x && position.y < player.y);
});

test('walking into the upper-left corner keeps the whole player inside', () => {
  const nearCorner = { x: 42, y: 98, radius: 12 };
  const position = getPlayerPosition(nearCorner, -1, -1, 0.5, bounds, movementConfig);

  assert.deepEqual(position, { x: 32, y: 88 });
});

const repairConfig = {
  minDanger: 0,
  maxDanger: 100,
  repairDangerReduction: 45,
  repairLinkedStationDangerIncrease: 15,
};

test('repair subtracts 45 from its station and adds 15 to the linked station', () => {
  const result = getRepairDangers({ danger: 60 }, { danger: 60 }, repairConfig);

  assert.deepEqual(result, { repairedDanger: 15, linkedDanger: 75 });
});

test('repair and stress transfer stay within the 0�C100 Danger range', () => {
  const result = getRepairDangers({ danger: 20 }, { danger: 95 }, repairConfig);

  assert.deepEqual(result, { repairedDanger: 0, linkedDanger: 100 });
});

test('repair still reduces local Danger if the linked station is missing', () => {
  const result = getRepairDangers({ danger: 65 }, undefined, repairConfig);

  assert.deepEqual(result, { repairedDanger: 20 });
});

test('Danger of 79 causes no Integrity loss', () => {
  const integrity = getIntegrityAfterOverload(100, [{ danger: 79 }], 1, overloadConfig);

  assert.equal(integrity, 100);
});

test('two overloaded stations cause 12 total damage in one second', () => {
  const stations = [{ danger: 90 }, { danger: 85 }, { danger: 20 }];
  const integrity = getIntegrityAfterOverload(100, stations, 1, overloadConfig);

  assert.equal(integrity, 88);
});

test('overload damage cannot reduce Integrity below zero', () => {
  const integrity = getIntegrityAfterOverload(4, [{ danger: 90 }], 1, overloadConfig);

  assert.equal(integrity, 0);
});

test('a half-second overload frame deals half a second of damage', () => {
  const integrity = getIntegrityAfterOverload(100, [{ danger: 90 }], 0.5, overloadConfig);

  assert.equal(integrity, 97);
});
