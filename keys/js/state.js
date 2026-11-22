// The tool's data: saved settings plus what is happening right now.
// Settings change only through set(), which saves them and tells the screen to update.
import { loadSettings, saveSettings } from './storage.js';
import { whiteKeys } from './lib/music.js';

export const WHITES = whiteKeys();          // A0 … C8
export const NW = WHITES.length;            // 52 white keys
export const MIN_VIEW = 5;                  // never fewer than 5 white keys on screen

const DEFAULTS = {
  view: 15,                // white keys on screen
  w0: WHITES.indexOf(48),  // leftmost white key on screen (index), C3
  key: null,               // {tonic, mode} or null for plain note names
  sound: 'grand',          // 'grand' (recorded) or 'piano' (simple, no download)
  volume: 0.8,
  chord: false,
  bare: false,             // "keys only": hide the bars
};

const saved = loadSettings();
export const settings = { ...DEFAULTS, ...saved };
// first visit on a phone held upright: one octave of wider keys (C4 to C5) instead of two
if (saved.view === undefined && window.innerWidth < 600) {
  settings.view = 8;
  settings.w0 = WHITES.indexOf(60);
}

// live state (not saved)
export const live = {
  pedal: false,
  fingers: new Map(),   // pointer id or keyboard code → {m, ms, vs}
  sus: [],              // voices kept ringing by the pedal
  ww: 60,               // width of one white key in px
  usedKeyboard: false,  // a laptop key was pressed: show the letters on the keys
};

const listeners = [];
export function onChange(fn) { listeners.push(fn); }

export function set(patch) {
  Object.assign(settings, patch);
  clampView();
  saveSettings(settings);
  listeners.forEach(fn => fn(patch));
}

export function clampView() {
  settings.view = Math.max(MIN_VIEW, Math.min(NW, settings.view));
  settings.w0 = Math.max(0, Math.min(NW - settings.view, settings.w0));
}
clampView();
