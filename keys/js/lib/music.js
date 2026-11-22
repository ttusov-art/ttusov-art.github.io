// Pure music helpers: note numbers (MIDI), key names, spelling, chords.
// No DOM and no audio here, so everything can be tested in Node.

export const LO = 21;   // A0, the lowest key of a grand piano
export const HI = 108;  // C8, the highest

const BLACK_PCS = [1, 3, 6, 8, 10];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = 'CDEFGAB';

export const KEY_MAJ_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const KEY_MIN_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
export const SCALE_STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

export const pc = m => ((m % 12) + 12) % 12;          // pitch class: 0 = C … 11 = B
export const isBlack = m => BLACK_PCS.includes(pc(m));
export const octaveOf = m => Math.floor(m / 12) - 1;  // MIDI 60 = C4
export const m2f = m => 440 * Math.pow(2, (m - 69) / 12);

// all white keys from lo to hi, in order (52 on a full piano)
export function whiteKeys(lo = LO, hi = HI) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) out.push(m);
  return out;
}

export function keyName(k) {
  if (!k) return 'No key';
  return (k.mode === 'major' ? KEY_MAJ_NAMES : KEY_MIN_NAMES)[k.tonic] + ' ' + k.mode;
}

// pitch class → spelled name for the 7 notes of the key (F♯ major has E♯, not F).
// Without a key: the white keys get their plain letters.
export function scaleSpelling(k) {
  const out = {};
  if (!k) {
    NATURAL_PCS.forEach((p, i) => { out[p] = LETTERS[i]; });
    return out;
  }
  const tonicName = (k.mode === 'major' ? KEY_MAJ_NAMES : KEY_MIN_NAMES)[k.tonic];
  const li = LETTERS.indexOf(tonicName[0]);
  const acc = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  SCALE_STEPS[k.mode].forEach((st, i) => {
    const p = (k.tonic + st) % 12;
    const l = (li + i) % 7;
    const d = ((p - NATURAL_PCS[l]) % 12 + 18) % 12 - 6;
    out[p] = LETTERS[l] + acc[d];
  });
  return out;
}

// Chord mode: the triad of the key built on the note you play
// (C major: C → C E G, D → D F A, B → B D F). Outside the key, or with no key: a major triad.
export function chordOf(m, k) {
  if (!k) return [m, m + 4, m + 7];
  const st = SCALE_STEPS[k.mode];
  const p = pc(m - k.tonic);
  const i = st.indexOf(p);
  if (i < 0) return [m, m + 4, m + 7];
  const up = j => { const q = i + j; return st[q % 7] + 12 * Math.floor(q / 7) - p; };
  return [m, m + up(2), m + up(4)];
}

// the 24 keys for the key menu, value like "0-major"
export function allKeys() {
  const list = [];
  for (const mode of ['major', 'minor']) for (let t = 0; t < 12; t++) list.push({ tonic: t, mode });
  return list;
}
