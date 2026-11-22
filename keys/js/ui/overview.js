// The overview strip: the whole piano in miniature; the highlighted window is what's on screen.
// Drag it to move along the piano, tap to jump; − and + show fewer/more keys.
import { settings, set, WHITES, NW } from '../state.js';
import { isBlack } from '../lib/music.js';

let el = null;

export function initOverview(svgEl) {
  el = svgEl;
  let drag = null;
  const at = e => {
    const r = el.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * NW;
  };
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    const x = at(e);
    const inside = x >= settings.w0 && x <= settings.w0 + settings.view;
    drag = { off: inside ? x - settings.w0 : settings.view / 2 };
    set({ w0: x - drag.off });
  });
  el.addEventListener('pointermove', e => { if (drag) set({ w0: at(e) - drag.off }); });
  ['pointerup', 'pointercancel'].forEach(t => el.addEventListener(t, () => { drag = null; }));
}

export function renderOverview() {
  const W = el.clientWidth || 300, H = el.clientHeight || 26, w = W / NW, o = [];
  WHITES.forEach((m, i) => o.push('<rect class="mw" x="' + (i * w) + '" y="0" width="' + w + '" height="' + H + '"/>'));
  WHITES.forEach((m, i) => {
    if (i < NW - 1 && isBlack(m + 1)) o.push('<rect class="mb" x="' + ((i + 1) * w - w * 0.3) + '" y="0" width="' + (w * 0.6) + '" height="' + (H * 0.6) + '"/>');
  });
  o.push('<rect class="mv" x="' + (settings.w0 * w) + '" y="1" width="' + (settings.view * w) + '" height="' + (H - 2) + '" rx="3"/>');
  el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  el.innerHTML = o.join('');
}

// zoom around the middle of what's on screen
export function zoom(d) {
  const c = settings.w0 + settings.view / 2;
  const view = Math.max(5, Math.min(NW, settings.view + d));
  set({ view, w0: c - view / 2 });
}

export function shiftOctave(dir) {
  set({ w0: settings.w0 + 7 * dir });
}
