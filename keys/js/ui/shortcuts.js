// All keyboard shortcuts in one place. Letters on the two piano rows play notes (see lib/laptop.js),
// so the other actions use keys outside those rows.
import { settings, live, WHITES } from '../state.js';
import { NOTE_CODES, US_LABELS, baseC } from '../lib/laptop.js';
import * as play from '../play.js';
import * as loop from '../loop.js';
import { zoom, shiftOctave } from './overview.js';
import { toggleChord, toggleBare, toggleFullscreen, toggleMarkMode, fitMarks } from './controls.js';
import { paintStart, paintEnd } from '../marks.js';
import { setLaptopLabels, place } from './keyboard.js';
import { toggleHelp, helpOpen } from './help.js';

// match: e.key (what the key types) or code (where the key is). up: also runs when the key is released.
export const SHORTCUTS = [
  { show: 'A S D F … (and W E T …)', what: 'Play notes, like a piano: home row white keys, row above black keys' },
  { show: 'Space (hold)', what: 'Sustain pedal while held', code: 'Space', down: () => play.setPedal(true), up: () => play.setPedal(false) },
  { show: '← →', what: 'One octave down / up', key: ['ArrowLeft', 'ArrowRight'], down: e => shiftOctave(e.key === 'ArrowRight' ? 1 : -1) },
  { show: '− +', what: 'Fewer, bigger keys / more keys on screen', key: ['-', '+', '='], down: e => zoom(e.key === '-' ? -2 : 2) },
  { show: '1', what: 'Chord mode on / off', key: ['1'], down: toggleChord },
  { show: '2', what: 'Loop: start, close, add a layer, finish the layer', key: ['2'], down: loop.tap },
  { show: '3', what: 'Pause / play the loop', key: ['3'], down: loop.togglePause },
  { show: '4', what: 'Undo the last loop layer', key: ['4'], down: loop.undoLayer },
  { show: 'Delete', what: 'Clear the loop', key: ['Delete', 'Backspace'], down: loop.clear },
  { show: 'M', what: 'Mark mode on / off: colour keys to map out your voice', code: 'KeyM', down: () => toggleMarkMode() },
  { show: 'N', what: 'Fit the screen to your marked keys', code: 'KeyN', down: fitMarks },
  { show: '0', what: 'Keys only (hide the bars) / show them again', key: ['0'], down: toggleBare },
  { show: 'Enter', what: 'Full screen on / off', key: ['Enter'], down: toggleFullscreen },
  { show: '?', what: 'Show this list', key: ['?'], down: toggleHelp },
  { show: 'Esc', what: 'Close this list, stop all notes', key: ['Escape'], down: () => { if (helpOpen()) toggleHelp(false); else play.allOff(); } },
];

function typing(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

function find(e) {
  return SHORTCUTS.find(s => (s.code && s.code === e.code) || (s.key && s.key.includes(e.key)));
}

export function initShortcuts() {
  setLaptopLabels(US_LABELS);
  // Chrome/Edge can tell us what is printed on each key (e.g. Ö Ä on a German keyboard)
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then(map => {
      const lab = {};
      for (const code of Object.keys(NOTE_CODES)) lab[code] = (map.get(code) || US_LABELS[code]).toUpperCase();
      setLaptopLabels(lab);
      place();
    }).catch(() => {});
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;           // leave browser shortcuts alone
    if (typing(e) && e.key !== 'Escape') return;              // e.g. the volume slider has focus: arrows move it
    if (helpOpen() && e.key !== 'Escape' && e.key !== '?') return;

    const off = NOTE_CODES[e.code];
    if (off !== undefined) {
      e.preventDefault();
      if (e.repeat) return;
      if (!live.usedKeyboard) { live.usedKeyboard = true; place(); }
      const m = baseC(WHITES, settings.w0) + off;
      if (live.markMode) { paintStart(m); paintEnd(); }   // Mark mode: laptop keys colour keys too
      play.press('k' + e.code, m);
      return;
    }
    const s = find(e);
    if (!s || !s.down) return;
    e.preventDefault();
    if (e.repeat) return;
    if (document.activeElement && document.activeElement.blur && e.key !== 'Enter') document.activeElement.blur();   // Space must not "click" the last button
    s.down(e);
  });

  document.addEventListener('keyup', e => {
    if (NOTE_CODES[e.code] !== undefined) { play.lift('k' + e.code); return; }
    const s = find(e);
    if (s && s.up) s.up(e);
  });

  // switching away from the window while holding keys: no notes left hanging
  window.addEventListener('blur', () => { play.allOff(); play.setPedal(false); });
}
