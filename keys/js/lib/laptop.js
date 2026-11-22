// Playing on the laptop keyboard, by physical key position (works the same on German QWERTZ and English QWERTY):
// the home row is white keys, the row above is black keys, like a piano.
//   W E   T Y U   O P        (on QWERTZ: W E  T Z U  O P)
//  A S D F G H J K L ; '     (on QWERTZ: … K L Ö Ä)
// A = the first C on screen, K = the C above, up to ' (F).
export const NOTE_CODES = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};

// English labels, used until the browser tells us the real layout
export const US_LABELS = {
  KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J',
  KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P', Semicolon: ';', Quote: "'",
};

// the C the laptop keys start from: the first C whose white key is fully on screen
export function baseC(whites, w0) {
  for (let i = Math.ceil(w0 - 0.01); i < whites.length; i++) {
    if (whites[i] % 12 === 0) return whites[i];
  }
  return 96;
}
