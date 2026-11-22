// Loop pedal (free length), the same as in Part Coach:
// press Loop, play: recording starts with your first note; press again to close the loop and it repeats.
// Press again to add a layer on top (press to finish it). Undo takes the last layer away, Pause, Clear.
import { now, voiceOn, voiceOff } from './audio.js';
import { settings } from './state.js';

export const LP = {
  state: 'empty',   // empty → arm → rec → play ⇄ dub
  ev: [],           // recorded notes {m, s (start in the loop), d (length), layer}
  len: 0, t0: 0, next: 0, layer: 0, muted: false,
  timer: null, live: [], sounding: new Set(),
};

let onPaint = () => {};
let onSounding = () => {};
let onBar = () => {};
export function hooks(h) {
  onPaint = h.paint || onPaint;
  onSounding = h.sounding || onSounding;
  onBar = h.bar || onBar;
}

// called by the keyboard for every note you play; returns the recorded note (or null)
export function noteOn(m) {
  if (LP.state === 'arm') { LP.state = 'rec'; LP.t0 = now(); LP.layer = 1; onPaint(); }
  if (LP.state !== 'rec' && LP.state !== 'dub') return null;
  const t = now();
  const s = LP.state === 'rec' ? t - LP.t0 : ((t - LP.t0) % LP.len + LP.len) % LP.len;
  const e = { m, s, d: null, layer: LP.layer, abs: t };
  LP.ev.push(e);
  return e;
}

export function noteOff(e) {
  if (!e || e.d != null) return;
  const d = now() - e.abs;
  e.d = LP.len ? Math.min(LP.len, d) : d;
}

function closeOpenNotes() {
  const t = now();
  LP.ev.forEach(e => { if (e.d == null) e.d = Math.min(LP.len, t - e.abs); });
}

// the Loop button
export function tap() {
  if (LP.state === 'empty') { LP.ev = []; LP.state = 'arm'; }
  else if (LP.state === 'arm') { LP.state = 'empty'; }
  else if (LP.state === 'rec') {
    LP.len = now() - LP.t0;
    if (LP.len < 0.4) { clear(); return; }   // a double tap by mistake
    closeOpenNotes();
    LP.state = 'play';
    LP.muted = false;
    LP.next = LP.t0 + LP.len;
    run();
  }
  else if (LP.state === 'play') { LP.state = 'dub'; LP.layer++; }
  else if (LP.state === 'dub') { closeOpenNotes(); LP.state = 'play'; }
  onPaint();
}

// the scheduler: every 25 ms, the notes of the coming 120 ms are started at their exact time on the audio clock
function run() {
  clearInterval(LP.timer);
  LP.timer = setInterval(() => {
    if (!LP.len) return;
    const t = now(), ahead = t + 0.12;
    while (LP.next < ahead) {
      const c0 = LP.next;
      if (!LP.muted) LP.ev.forEach(e => {
        if (e.d == null && LP.state === 'dub' && e.layer === LP.layer) return;   // being recorded right now
        const a = c0 + e.s, b = a + Math.max(0.05, e.d || 0.3);
        const v = voiceOn(e.m, settings.sound, a, 0.8);
        voiceOff(v, false, b);
        LP.live.push({ v, m: e.m, a, b });
      });
      LP.next += LP.len;
    }
    LP.live = LP.live.filter(x => x.b > t - 0.6);
    const snd = new Set(LP.live.filter(x => x.a <= t && x.b > t).map(x => x.m));
    if (snd.size !== LP.sounding.size || [...snd].some(m => !LP.sounding.has(m))) {
      LP.sounding = snd;
      onSounding();
    }
    onBar((((t - LP.t0) % LP.len) + LP.len) % LP.len / LP.len);
  }, 25);
}

export function togglePause() {
  if (!LP.len) return;
  LP.muted = !LP.muted;
  if (LP.muted) { LP.live.forEach(x => voiceOff(x.v, true)); LP.live = []; }
  onPaint();
}

export function undoLayer() {
  const top = Math.max(0, ...LP.ev.map(e => e.layer));
  if (top <= 1) return;
  LP.ev = LP.ev.filter(e => e.layer !== top);
  LP.layer = top - 1;
  if (LP.state === 'dub') LP.state = 'play';
  onPaint();
}

export function clear() {
  clearInterval(LP.timer);
  LP.timer = null;
  LP.live.forEach(x => voiceOff(x.v, true));
  LP.live = [];
  LP.sounding = new Set();
  LP.state = 'empty'; LP.ev = []; LP.len = 0; LP.layer = 0; LP.muted = false;
  onBar(0);
  onPaint();
  onSounding();
}
