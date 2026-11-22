// Coloured marks on keys, to map out your voice (comfortable range, passaggio, top notes…).
// Marks are settings, so they are saved on the device like the rest.
import { settings, set, live } from './state.js';

// four colours, none of them orange (orange is "this key is sounding")
export const COLOURS = ['#2e9b5f', '#3b7dd8', '#8b5cf6', '#d6457a'];
export const DEFAULT_NAMES = ['Comfortable', 'Stretch', 'Passaggio', 'Top'];

export const markOf = m => settings.marks[m];   // colour index, or undefined
export const hasMarks = () => Object.keys(settings.marks).length > 0;

// painting: the first key decides — tapping a key that already has this colour clears it,
// otherwise it gets the colour; dragging on applies the same to every key you pass
let stroke = null;   // 'set' or 'clear' while a finger is down

export function paintStart(m) {
  const c = live.markColour;   // -1 = eraser
  stroke = c < 0 || settings.marks[m] === c ? 'clear' : 'set';
  paint(m);
}

export function paint(m) {
  const marks = { ...settings.marks };
  if (stroke === 'clear') delete marks[m];
  else marks[m] = live.markColour;
  if (marks[m] === settings.marks[m]) return;   // no change: no redraw
  set({ marks });
}

export function paintEnd() { stroke = null; }

export function clearAll() { set({ marks: {} }); }

export function rename(i, name) {
  const names = [...settings.markNames];
  names[i] = name;
  set({ markNames: names });
}

// first and last key with any mark, to jump there
export function markedRange() {
  const ms = Object.keys(settings.marks).map(Number);
  return ms.length ? [Math.min(...ms), Math.max(...ms)] : null;
}
