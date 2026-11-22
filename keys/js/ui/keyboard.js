// The keys on screen: drawn once per zoom level as one wide SVG; moving along the piano is only a shift.
import { settings, live, WHITES, NW } from '../state.js';
import { scaleSpelling, isBlack, octaveOf, pc } from '../lib/music.js';
import { NOTE_CODES, baseC } from '../lib/laptop.js';
import * as play from '../play.js';
import { paintStart, paint, paintEnd } from '../marks.js';

let box = null;
let labels = {};   // laptop key code → the letter printed on it

export function setLaptopLabels(map) { labels = map; }

export function initKeyboard(el) {
  box = el;
  box.addEventListener('pointerdown', onPointerDown);
  // no scrolling, text selection or long-press menu on the keys
  box.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  box.addEventListener('contextmenu', e => e.preventDefault());
}

export function render() {
  const W = box.clientWidth || 600, H = box.clientHeight || 200;
  const ww = W / settings.view, bw = ww * 0.6, bh = H * 0.62;
  const k = settings.key, sp = scaleSpelling(k);
  const fw = Math.max(10, Math.min(30, ww * 0.34));       // label size follows the key width (big screen: big letters)
  const fb = Math.max(9, Math.min(22, bw * 0.4));
  live.ww = ww;

  const svg = ['<svg width="' + (NW * ww) + '" height="' + H + '" id="kbSvg" style="--fw:' + fw + 'px;--fb:' + fb + 'px">'];
  const label = (p, x, y, cls) => sp[p] != null ? '<text x="' + x + '" y="' + y + '" class="' + cls + '">' + sp[p] + '</text>' : '';

  WHITES.forEach((m, i) => {
    const p = pc(m), home = k && p === k.tonic, inKey = k && sp[p] != null, x = i * ww;
    svg.push('<rect data-m="' + m + '" x="' + (x + 1) + '" y="0" width="' + (ww - 2) + '" height="' + (H - 1) + '" rx="' + Math.min(8, ww * 0.1) + '" class="w' + (home ? ' home' : inKey ? ' in' : '') + '"/>');
    svg.push(label(p, x + ww / 2, H - (p === 0 ? fw * 1.9 : fw * 0.8), 'tw' + (home ? ' home' : '')));
    if (p === 0) svg.push('<text x="' + (x + ww / 2) + '" y="' + (H - fw * 0.55) + '" class="oc">C' + octaveOf(m) + '</text>');
  });
  for (let i = 0; i < NW - 1; i++) {
    const m = WHITES[i] + 1;
    if (!isBlack(m)) continue;
    const p = pc(m), home = k && p === k.tonic, inKey = k && sp[p] != null, x = (i + 1) * ww - bw / 2;
    svg.push('<rect data-m="' + m + '" x="' + x + '" y="0" width="' + bw + '" height="' + bh + '" rx="' + Math.min(6, bw * 0.12) + '" class="b' + (home ? ' home' : inKey ? ' in' : '') + '"/>');
    if (k && ww > 34) svg.push(label(p, x + bw / 2, bh - fb * 0.8, 'tb' + (home ? ' home' : '')));
  }
  svg.push('<g id="kbLetters"></g></svg>');
  box.querySelectorAll('svg').forEach(s => s.remove());
  box.insertAdjacentHTML('beforeend', svg.join(''));
  place();
  marks();
  paintMarks();
}

// shift the keys to the current position
export function place() {
  const sv = box.querySelector('#kbSvg');
  if (sv) sv.style.transform = 'translateX(' + (-settings.w0 * live.ww) + 'px)';
  letters();
}

// laptop letters on the keys, once a laptop key has been used
function letters() {
  const g = box.querySelector('#kbLetters');
  if (!g) return;
  if (!live.usedKeyboard) { g.innerHTML = ''; return; }
  const c = baseC(WHITES, settings.w0), out = [];
  for (const [code, off] of Object.entries(NOTE_CODES)) {
    const r = box.querySelector('rect[data-m="' + (c + off) + '"]');
    if (!r) continue;
    const x = +r.getAttribute('x') + +r.getAttribute('width') / 2;
    const y = isBlack(c + off) ? 18 : +r.getAttribute('height') * 0.66 + 4;
    out.push('<text x="' + x + '" y="' + y + '" class="lk' + (isBlack(c + off) ? ' onb' : '') + '">' + (labels[code] || '') + '</text>');
  }
  g.innerHTML = out.join('');
}

// your voice map: each marked key gets its colour class (mk0 … mk3)
export function paintMarks() {
  if (!box) return;
  box.querySelectorAll('rect[data-m]').forEach(r => {
    const c = settings.marks[r.dataset.m];
    for (let i = 0; i < 4; i++) r.classList.toggle('mk' + i, c === i);
  });
}

export function marks() {
  if (!box) return;
  const on = play.soundingNotes();
  box.querySelectorAll('rect[data-m]').forEach(r => r.classList.toggle('on', on.has(+r.dataset.m)));
}

// fingers and the mouse: each pointer plays its own key; sliding over the keys plays each key you pass
function onPointerDown(e) {
  const r0 = e.target.closest && e.target.closest('rect[data-m]');
  if (!r0) return;
  e.preventDefault();
  const id = 'p' + e.pointerId;
  const marking = live.markMode;   // in Mark mode the keys still sound, so you hear which note you colour
  if (marking) paintStart(+r0.dataset.m);
  play.press(id, +r0.dataset.m);
  const move = ev => {
    if (ev.pointerId !== e.pointerId) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const r = el && el.closest && el.closest('#keys rect[data-m]');
    if (!r) return;
    if (marking) paint(+r.dataset.m);
    play.press(id, +r.dataset.m);
  };
  const up = ev => {
    if (ev.pointerId !== e.pointerId) return;
    if (marking) paintEnd();
    play.lift(id);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
