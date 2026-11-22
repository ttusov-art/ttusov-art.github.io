// Playing notes: every finger (or laptop key) has its own note or chord; sliding moves it;
// the sustain pedal keeps released notes ringing until it comes up.
import { settings, live } from './state.js';
import { voiceOn, voiceOff } from './audio.js';
import { chordOf, LO, HI } from './lib/music.js';
import * as loop from './loop.js';

let onMarks = () => {};
let onPedal = () => {};
export function hooks(h) {
  onMarks = h.marks || onMarks;
  onPedal = h.pedal || onPedal;
}

function start(m) {
  cutSustained(m);   // the same key struck again: the old ringing note stops
  const v = voiceOn(m, settings.sound);
  v.rec = loop.noteOn(m);
  return v;
}

function end(v) {
  voiceOff(v);
  loop.noteOff(v.rec);
}

function release(v) {
  if (live.pedal) {
    live.sus.push(v);
    if (live.sus.length > 48) end(live.sus.shift());   // keep the number of ringing notes sane
  } else {
    end(v);
  }
}

function cutSustained(m) {
  live.sus = live.sus.filter(v => {
    if (v.m !== m) return true;
    voiceOff(v, true);
    loop.noteOff(v.rec);
    return false;
  });
}

// id: a pointer id (finger/mouse) or a laptop key code
export function press(id, m) {
  let f = live.fingers.get(id);
  if (!f) { f = { m: null, ms: [], vs: [] }; live.fingers.set(id, f); }
  if (m === f.m) return;
  f.vs.forEach(release);
  f.m = m;
  f.ms = settings.chord ? chordOf(m, settings.key) : [m];
  f.vs = f.ms.filter(x => x >= LO && x <= HI).map(start);
  onMarks();
}

export function lift(id) {
  const f = live.fingers.get(id);
  if (!f) return;
  f.vs.forEach(release);
  live.fingers.delete(id);
  onMarks();
}

export function setPedal(on) {
  live.pedal = on;
  if (!on) { live.sus.forEach(end); live.sus = []; }
  onPedal(on);
}

export function allOff() {
  live.fingers.forEach(f => f.vs.forEach(v => { voiceOff(v, true); loop.noteOff(v.rec); }));
  live.fingers.clear();
  live.sus.forEach(v => { voiceOff(v, true); loop.noteOff(v.rec); });
  live.sus = [];
  onMarks();
}

// the notes to light up: what you hold plus what the loop plays
export function soundingNotes() {
  const on = new Set();
  live.fingers.forEach(f => f.ms.forEach(m => on.add(m)));
  loop.LP.sounding.forEach(m => on.add(m));
  return on;
}
