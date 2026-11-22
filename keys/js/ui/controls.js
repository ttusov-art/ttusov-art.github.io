// The top bar and the bottom strip: key, sound, volume, keys only, full screen, pedal, octave, chord, loop.
import { settings, set, live, NW } from '../state.js';
import { keyName, allKeys } from '../lib/music.js';
import { setVolume } from '../audio.js';
import * as play from '../play.js';
import * as loop from '../loop.js';
import { zoom, shiftOctave, fitTo } from './overview.js';
import { COLOURS, clearAll, rename, markedRange, hasMarks } from '../marks.js';

const $ = s => document.querySelector(s);

export function initControls() {
  // key menu
  const ks = $('#keySel');
  ks.innerHTML = '<option value="">No key</option>' +
    allKeys().map(k => '<option value="' + k.tonic + '-' + k.mode + '">' + keyName(k) + '</option>').join('');
  ks.addEventListener('change', () => {
    const [t, mode] = ks.value.split('-');
    set({ key: ks.value ? { tonic: +t, mode } : null });
  });

  $('#soundSel').addEventListener('change', e => set({ sound: e.target.value }));
  $('#vol').addEventListener('input', e => { setVolume(+e.target.value); set({ volume: +e.target.value }); });

  $('#zoomOut').addEventListener('click', () => zoom(-2));
  $('#zoomIn').addEventListener('click', () => zoom(2));
  $('#octDn').addEventListener('click', () => shiftOctave(-1));
  $('#octUp').addEventListener('click', () => shiftOctave(1));
  $('#chordBtn').addEventListener('click', toggleChord);
  $('#bareBtn').addEventListener('click', toggleBare);
  $('#showBars').addEventListener('click', toggleBare);
  $('#fsBtn').addEventListener('click', toggleFullscreen);

  $('#loopBtn').addEventListener('click', loop.tap);
  $('#lpMute').addEventListener('click', loop.togglePause);
  $('#lpUndo').addEventListener('click', loop.undoLayer);
  $('#lpClear').addEventListener('click', loop.clear);
  loop.hooks({ paint: paintLoop, bar: f => { $('#loopBar').style.width = (f * 100) + '%'; } });

  // pedal: a quick tap latches it on/off; held down, it is on while held
  const pb = $('#pedalBtn');
  let down = 0, was = false;
  pb.addEventListener('pointerdown', e => {
    e.preventDefault();
    pb.setPointerCapture(e.pointerId);
    down = performance.now();
    was = live.pedal;
    if (!was) play.setPedal(true);
  });
  const up = () => {
    if (!down) return;
    const quick = performance.now() - down < 300;
    down = 0;
    if (!quick || was) play.setPedal(false);
  };
  pb.addEventListener('pointerup', up);
  pb.addEventListener('pointercancel', up);
  pb.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('fullscreenchange', paintFullscreen);
  initMarkBar();
  paintAll();
}

// ----- Mark mode: colour keys to map out your voice -----
function initMarkBar() {
  $('#swatches').innerHTML = COLOURS.map((c, i) =>
    '<span class="sw" data-c="' + i + '"><button type="button" class="dot" data-c="' + i + '" style="background:' + c + '" aria-label="Paint with colour ' + (i + 1) + '"></button>' +
    '<input type="text" maxlength="24" data-c="' + i + '" aria-label="Name of colour ' + (i + 1) + '"></span>').join('');
  $('#swatches').querySelectorAll('.dot').forEach(b => b.addEventListener('click', () => pickColour(+b.dataset.c)));
  $('#swatches').querySelectorAll('input').forEach(inp => {
    inp.addEventListener('focus', () => pickColour(+inp.dataset.c));
    inp.addEventListener('change', () => rename(+inp.dataset.c, inp.value.trim()));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });
  $('#markBtn').addEventListener('click', () => toggleMarkMode());
  $('#mkDone').addEventListener('click', () => toggleMarkMode(false));
  $('#mkErase').addEventListener('click', () => pickColour(live.markColour < 0 ? 0 : -1));
  $('#mkFit').addEventListener('click', fitMarks);
  $('#mkClear').addEventListener('click', () => { if (confirm('Take all colours off the keys?')) clearAll(); });
}

function pickColour(i) {
  live.markColour = i;
  paintMarkBar();
}

export function fitMarks() {
  const r = markedRange();
  if (r) fitTo(r[0], r[1]);
}

export function toggleMarkMode(on) {
  live.markMode = on === undefined ? !live.markMode : on;
  document.body.classList.toggle('marking', live.markMode);
  $('#markbar').hidden = !live.markMode;
  $('#markBtn').setAttribute('aria-pressed', String(live.markMode));
  if (live.markMode && settings.bare) set({ bare: false });   // the bar needs to be visible
  paintMarkBar();
  window.dispatchEvent(new Event('resize'));   // the keys area changed height
}

function paintMarkBar() {
  $('#swatches').querySelectorAll('.sw').forEach(el => el.classList.toggle('sel', +el.dataset.c === live.markColour));
  $('#swatches').querySelectorAll('input').forEach(inp => { if (document.activeElement !== inp) inp.value = settings.markNames[+inp.dataset.c] || ''; });
  $('#mkErase').setAttribute('aria-pressed', String(live.markColour < 0));
  $('#mkFit').disabled = !hasMarks();
  $('#mkClear').disabled = !hasMarks();
}

// the legend next to the Mark button: only the colours you used
function paintLegend() {
  const used = new Set(Object.values(settings.marks));
  $('#legend').innerHTML = COLOURS.map((c, i) => used.has(i) ? '<span><i style="background:' + c + '"></i>' + (settings.markNames[i] || '') + '</span>' : '').join('');
}

export function toggleChord() { set({ chord: !settings.chord }); }
export function toggleBare() { set({ bare: !settings.bare }); }

export async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      // phones: turn sideways for more keys (ignored where not allowed)
      try { if (matchMedia('(pointer:coarse)').matches && screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* not allowed here */ }
    }
  } catch (e) { /* full screen not available (e.g. iPhone): the page still fills the screen */ }
}

export function paintPedal(on) {
  const b = $('#pedalBtn');
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', String(on));
}

function paintFullscreen() {
  const on = !!document.fullscreenElement;
  $('#fsLabel').textContent = on ? 'Exit full screen' : 'Full screen';
  $('#fsBtn').setAttribute('aria-pressed', String(on));
}

export function paintLoop() {
  const LP = loop.LP, st = LP.state, b = $('#loopBtn');
  b.className = st === 'empty' || st === 'play' ? '' : st;
  $('#loopT').textContent = { empty: '● Loop', arm: 'Play to start…', rec: '■ Close loop', play: '● Add layer', dub: '■ Finish layer' }[st];
  $('#lpx').hidden = !LP.len;
  $('#lpMute').textContent = LP.muted ? '▶' : '❚❚';
  $('#lpMute').setAttribute('aria-label', LP.muted ? 'Play the loop' : 'Pause the loop');
  $('#lpUndo').disabled = !LP.ev.some(e => e.layer > 1);
  paintInfo();
}

function paintInfo() {
  const LP = loop.LP, parts = [];
  if (settings.chord) parts.push('Chords in ' + (settings.key ? keyName(settings.key) : 'major'));
  if (LP.len) parts.push('Loop ' + LP.len.toFixed(1) + ' s' + (LP.muted ? ' (paused)' : ''));
  $('#info').textContent = parts.join(' · ');
}

// bring every control in line with the settings
export function paintAll() {
  $('#keySel').value = settings.key ? settings.key.tonic + '-' + settings.key.mode : '';
  $('#soundSel').value = settings.sound;
  $('#vol').value = settings.volume;
  $('#chordBtn').classList.toggle('on', settings.chord);
  $('#chordBtn').setAttribute('aria-pressed', String(settings.chord));
  document.body.classList.toggle('bare', settings.bare);
  $('#showBars').hidden = !settings.bare;
  $('#bareBtn').setAttribute('aria-pressed', String(settings.bare));
  $('#octDn').disabled = settings.w0 <= 0.01;
  $('#octUp').disabled = settings.w0 >= NW - settings.view - 0.01;
  $('#zoomOut').disabled = settings.view <= 5;
  $('#zoomIn').disabled = settings.view >= NW;
  paintFullscreen();
  paintInfo();
  paintLegend();
  paintMarkBar();
}
