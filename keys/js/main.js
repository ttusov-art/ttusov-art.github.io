// Keys: a clean full-screen piano, split out of Part Coach. Starts the tool and wires the modules together.
import { settings, onChange } from './state.js';
import { ensureCtx, setVolume, prefetch } from './audio.js';
import * as play from './play.js';
import * as loop from './loop.js';
import { initKeyboard, render, place, marks } from './ui/keyboard.js';
import { initOverview, renderOverview } from './ui/overview.js';
import { initControls, paintAll, paintPedal } from './ui/controls.js';
import { initShortcuts, SHORTCUTS } from './ui/shortcuts.js';
import { initHelp, setHelpRows } from './ui/help.js';
import { checkUpdate } from './ui/update.js';

export const APP_VERSION = '1.0.0';

const $ = s => document.querySelector(s);

function status(text, ms) {
  const el = $('#status');
  el.textContent = text;
  el.hidden = !text;
  clearTimeout(status.t);
  if (ms) status.t = setTimeout(() => { el.hidden = true; }, ms);
}

// redraw only what a change needs: zoom/key/layout → new keys; moving → just a shift
function layout() {
  render();
  renderOverview();
}

onChange(patch => {
  if ('view' in patch || 'key' in patch || 'bare' in patch) {
    if ('bare' in patch) paintAll();   // the keys area changes size first
    layout();
  } else if ('w0' in patch) {
    place();
    renderOverview();
  }
  if ('sound' in patch && settings.sound === 'grand') loadGrand();
  paintAll();
});

async function loadGrand() {
  status('Loading the piano sound…');
  const r = await prefetch();
  status(r.ok === r.total ? '' : 'Some piano notes could not be downloaded; a simple piano sound fills in.', 5000);
}

// keep the screen on while the piano is open (big screen, phone on a stand)
let wake = null;
async function keepAwake() {
  try { if (!wake && navigator.wakeLock && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* not allowed: fine */ }
}

function start() {
  $('#ver').textContent = 'v' + APP_VERSION;
  setVolume(settings.volume);
  play.hooks({ marks, pedal: paintPedal });
  loop.hooks({ sounding: marks });
  initKeyboard($('#keys'));
  initOverview($('#mini'));
  initControls();
  initHelp();
  setHelpRows(SHORTCUTS);
  initShortcuts();
  layout();

  addEventListener('resize', () => layout());
  document.addEventListener('fullscreenchange', () => setTimeout(layout, 150));

  // the browser only allows sound after the first touch or key; that same touch already plays a note
  const first = () => { ensureCtx(); keepAwake(); };
  document.addEventListener('pointerdown', first);
  document.addEventListener('keydown', first);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); else { play.allOff(); play.setPedal(false); } });

  if (settings.sound === 'grand') loadGrand();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  setTimeout(() => checkUpdate(APP_VERSION), 3000);
}

start();
