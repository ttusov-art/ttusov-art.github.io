// The "?" overlay: the shortcut list, built from the one table in shortcuts.js.
const $ = s => document.querySelector(s);

let rows = [];
export function setHelpRows(list) { rows = list; }

export function helpOpen() { return $('#help').open; }

export function toggleHelp(on) {
  const d = $('#help');
  if (on === undefined) on = !d.open;
  if (on && !d.open) {
    $('#helpList').innerHTML = rows.map(s => '<tr><th><kbd>' + s.show + '</kbd></th><td>' + s.what + '</td></tr>').join('');
    d.showModal();
  } else if (!on && d.open) {
    d.close();
  }
}

export function initHelp() {
  $('#helpBtn').addEventListener('click', () => toggleHelp(true));
  $('#helpClose').addEventListener('click', () => toggleHelp(false));
  $('#help').addEventListener('click', e => { if (e.target === $('#help')) toggleHelp(false); });   // tap outside closes
}
