// Sound: one Web Audio context, a limiter so many keys at once don't distort,
// and two piano sounds (the same engine as Part Coach).
import { m2f, LO, HI } from './lib/music.js';

// Salamander Grand Piano samples (CC BY 3.0, Alexander Holm), shared with Part Coach one folder up.
// Same cache name as Part Coach: notes it already downloaded are reused, no extra data.
const GRAND_URL = '../piano/';
const GRAND_CACHE = 'pc-grand-v1';
const GRAND_PC = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' };   // a sample every minor third
const GRAND_NOTES = [];
for (let m = LO; m <= HI; m++) if (GRAND_PC[m % 12] !== undefined) GRAND_NOTES.push(m);

const LEVEL = 0.36;   // level of one note before the master volume

let ctx = null;
let limiter = null;
let master = null;
let volume = 0.8;
const grand = {};     // m → Promise, m+'b' → AudioBuffer, m+'g' → loudness factor

export function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = volume * 1.3;
    limiter.connect(master).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function now() { return ensureCtx().currentTime; }

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v * 1.3;
}

// ----- recorded grand piano -----
function grandLoad(m) {
  if (grand[m]) return grand[m];
  const name = GRAND_PC[m % 12] + (Math.floor(m / 12) - 1) + '.mp3';
  const url = GRAND_URL + name;
  const get = async () => {
    let cache = null;
    try {
      cache = await caches.open(GRAND_CACHE);
      const hit = await cache.match(url);
      if (hit) return hit.arrayBuffer();
    } catch (e) { /* no cache storage: just download */ }
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (cache) { try { await cache.put(url, r.clone()); } catch (e) { /* ignore */ } }
    return r.arrayBuffer();
  };
  grand[m] = get()
    .then(b => ensureCtx().decodeAudioData(b))
    .then(buf => { grand[m + 'g'] = grandGain(buf); grand[m + 'b'] = buf; return buf; },
          e => { delete grand[m]; throw e; });
  return grand[m];
}

// loudness of a recorded note: the loudest 50 ms of its first second, so every sample strikes about equally loud
function grandGain(buf) {
  const x = buf.getChannelData(0), sr = buf.sampleRate, w = Math.round(sr * 0.05), end = Math.min(x.length, sr);
  let best = 1e-4;
  for (let i = 0; i + w <= end; i += Math.round(w / 2)) {
    let e = 0;
    for (let j = i; j < i + w; j++) e += x[j] * x[j];
    best = Math.max(best, Math.sqrt(e / w));
  }
  return Math.min(12, 0.2 / best);
}

function grandNearest(m) {
  let best = GRAND_NOTES[0];
  for (const n of GRAND_NOTES) if (Math.abs(n - m) < Math.abs(best - m)) best = n;
  return best;
}

// download the samples for a range of notes (the whole piano is about 3 MB); returns how many arrived
export async function prefetch(lo = LO, hi = HI) {
  const list = GRAND_NOTES.filter(m => m >= lo - 3 && m <= hi + 3);
  const res = await Promise.allSettled(list.map(grandLoad));
  return { ok: res.filter(r => r.status === 'fulfilled').length, total: list.length };
}

// ----- one sounding note -----
export function voiceOn(m, sound, when, levelMul = 1) {
  const c = ensureCtx();
  const t = Math.max(c.currentTime, when || 0);
  const out = c.createGain();
  out.gain.value = LEVEL * levelMul;
  out.connect(limiter);
  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.connect(out);
  const oscs = [];
  const gs = sound === 'grand' ? grandNearest(m) : null;
  const gbuf = gs != null ? grand[gs + 'b'] : null;
  if (gs != null && !gbuf) grandLoad(gs).catch(() => {});   // not here yet: the simple piano plays this time

  if (gbuf) {
    const src = c.createBufferSource();
    src.buffer = gbuf;
    src.playbackRate.value = Math.pow(2, (m - gs) / 12);
    src.connect(env);
    src.start(t);
    oscs.push(src);
    out.gain.value = LEVEL * levelMul * (grand[gs + 'g'] || 2.2 * 0.45) / 0.45;
    env.gain.setValueAtTime(1, t);
  } else {
    // simple piano: a few partials, quick attack, natural fade
    const f = m2f(m);
    [[1, 1], [2, 0.45], [3, 0.22], [4, 0.12], [5, 0.06]].forEach(([h, a]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * h * (1 + 0.0004 * h * h);
      g.gain.value = a;
      o.connect(g).connect(env);
      o.start(t);
      oscs.push(o);
    });
    env.gain.linearRampToValueAtTime(0.9, t + 0.006);
    env.gain.setTargetAtTime(0.35, t + 0.006, 0.25);
    env.gain.setTargetAtTime(0.0001, t + 1.2, 1.2);
  }
  return { env, out, oscs, m };
}

export function voiceOff(v, quick, when) {
  if (!v || !ctx) return;
  const t = Math.max(ctx.currentTime, when || 0);
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setValueAtTime(v.env.gain.value, t);
  v.env.gain.setTargetAtTime(0, t, quick ? 0.01 : 0.06);
  const ms = (quick ? 100 : 500) + Math.max(0, (t - ctx.currentTime) * 1000);
  setTimeout(() => {
    v.oscs.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } o.disconnect(); });
    v.env.disconnect();
    v.out.disconnect();
  }, ms);
}
