// Unit tests for the pure helpers. Run: node tests/unit.mjs
import assert from 'node:assert/strict';
import { whiteKeys, chordOf, scaleSpelling, isBlack, octaveOf } from '../js/lib/music.js';
import { baseC } from '../js/lib/laptop.js';
import { newer } from '../js/ui/update.js';

const W = whiteKeys();
assert.equal(W.length, 52, 'a grand piano has 52 white keys');
assert.equal(W[0], 21); assert.equal(W.at(-1), 108);
assert.equal(isBlack(61), true); assert.equal(isBlack(64), false);
assert.equal(octaveOf(60), 4);

const C = { tonic: 0, mode: 'major' };
assert.deepEqual(chordOf(60, C), [60, 64, 67], 'C → C E G');
assert.deepEqual(chordOf(62, C), [62, 65, 69], 'D → D F A');
assert.deepEqual(chordOf(71, C), [71, 74, 77], 'B → B D F');
assert.deepEqual(chordOf(61, C), [61, 65, 68], 'outside the key: major');
assert.deepEqual(chordOf(57, { tonic: 9, mode: 'minor' }), [57, 60, 64], 'A minor → A C E');
assert.deepEqual(chordOf(60, null), [60, 64, 67], 'no key: major');

assert.equal(scaleSpelling({ tonic: 6, mode: 'major' })[5], 'E♯', 'F♯ major has E♯');
assert.equal(scaleSpelling({ tonic: 5, mode: 'major' })[10], 'B♭');
assert.equal(scaleSpelling(null)[0], 'C');

assert.equal(baseC(W, W.indexOf(48)), 48, 'view starts on C3 → laptop A = C3');
assert.equal(baseC(W, W.indexOf(50)), 60, 'view starts on D3 → next C');
assert.equal(baseC(W, W.indexOf(48) + 0.4), 60, 'C3 half off screen → C4');

assert.equal(newer('1.0.10', '1.0.9'), true);
assert.equal(newer('1.0.0', '1.0.0'), false);
assert.equal(newer('0.9.9', '1.0.0'), false);
console.log('unit tests: all passed');
