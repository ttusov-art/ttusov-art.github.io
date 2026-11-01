// Part Coach – suggestions inbox (Google Apps Script)
// Choir members' suggestions land in the sheet "Suggestions" of this spreadsheet.
// Suggestions are anonymous: no names or other personal details are sent or stored.
// Members can only ADD suggestions and ask for the status of their own ones (by a random id).
// Reading the inbox and marking suggestions accepted / not used needs the review key below.
// Approvers (trusted choir members) can decide on suggestions for their part with the approver key;
// the moderator then puts their decisions into the songs with one tap.
// Usage: only phones whose owner said yes send, once a day, a random tag and the date (sheet "Usage"), so the moderator can see how many phones use the app.
// Old data is removed automatically: usage rows after 12 months, names in decided approver requests after 30 days.
// "Not your own": each phone sends a random tag with its suggestions; a decision from the same phone is refused.

// 1) Change this to a long secret of your own (only you type it into Part Coach):
const REVIEW_KEY = 'change-me-to-a-long-secret';
// 2) Approvers: a different secret that you give to the members who may approve (leave as is to switch approving off):
const APPROVER_KEY = 'change-me-to-another-secret';

const SHEET = 'Suggestions';
const COLS = ['id', 'received', 'status', 'part', 'songUid', 'songName', 'baseUpdated', 'notes', 'lyrics', 'payload', 'reviewed', 'dev', 'decisions', 'approver', 'approved'];
const MAX_PAYLOAD = 45000;
// members can ask to become approvers (name and part, kept only in this sheet); the moderator says yes or no in the app,
// and on yes the asking phone receives the approver key (only that phone knows its request id)
const REQ_SHEET = 'Approver requests';
const REQ_COLS = ['id', 'received', 'status', 'name', 'part', 'dev', 'decided'];   // characters (a Google Sheets cell holds 50 000)

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(COLS); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < COLS.length) sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);   // older sheet: add the new column names
  return sh;
}
function reqSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(REQ_SHEET);
  if (!sh) { sh = ss.insertSheet(REQ_SHEET); sh.appendRow(REQ_COLS); sh.setFrozenRows(1); }
  return sh;
}
function reqRows_() {
  const sh = reqSheet_(), v = sh.getDataRange().getValues(), out = [];
  for (let r = 1; r < v.length; r++) { const o = { row: r + 1 }; REQ_COLS.forEach((c, i) => o[c] = v[r][i]); out.push(o); }
  return out;
}
// "something sounds off here": a member marks a spot without knowing what is wrong; approvers can fix it (as a suggestion)
// or pass it on, and the moderator sees every report at once
const REP_SHEET = 'Reports';
const REP_COLS = ['id', 'received', 'status', 'part', 'songUid', 'songName', 'a', 'b', 'kind', 'dev', 'handled', 'by', 'note'];
function repSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(REP_SHEET);
  if (!sh) { sh = ss.insertSheet(REP_SHEET); sh.appendRow(REP_COLS); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < REP_COLS.length) sh.getRange(1, 1, 1, REP_COLS.length).setValues([REP_COLS]);   // older sheet: add the new column names
  return sh;
}
function repRows_() {
  const sh = repSheet_(), v = sh.getDataRange().getValues(), out = [];
  for (let r = 1; r < v.length; r++) { const o = { row: r + 1 }; REP_COLS.forEach((c, i) => o[c] = v[r][i]); out.push(o); }
  return out;
}
const repItem_ = r => ({ id: r.id, received: r.received instanceof Date ? r.received.getTime() : r.received, status: r.status, part: r.part,
  songUid: r.songUid, songName: r.songName, a: Number(r.a) || 0, b: Number(r.b) || 0, kind: r.kind, by: r.by, note: r.note || '' });
// usage count: once a day each phone sends its random tag and the date (nothing else), so the moderator sees how many phones use the app
const USE_SHEET = 'Usage';
const USE_COLS = ['day', 'dev'];
function useSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(USE_SHEET);
  if (!sh) { sh = ss.insertSheet(USE_SHEET); sh.appendRow(USE_COLS); sh.setFrozenRows(1); }
  return sh;
}
const pad2_ = n => (n < 10 ? '0' : '') + n;
const dayOf_ = v => v instanceof Date ? v.getFullYear() + '-' + pad2_(v.getMonth() + 1) + '-' + pad2_(v.getDate()) : String(v).replace(/^'/, '');
function useRows_() { return useSheet_().getDataRange().getValues().slice(1).map(r => ({ day: dayOf_(r[0]), dev: String(r[1]) })); }
// keep data only as long as needed: usage rows for 12 months, names in decided approver requests for 30 days
const KEEP_USAGE_DAYS = 365, KEEP_REQ_NAME_DAYS = 30;
function cleanup_(today) {
  const sh = useSheet_(), v = sh.getDataRange().getValues(), cut = dayShift_(today, -KEEP_USAGE_DAYS); let n = 0;
  while (n + 1 < v.length && dayOf_(v[n + 1][0]) < cut) n++;
  if (n) sh.deleteRows(2, n);
  const rs = reqSheet_(), old = Date.now() - KEEP_REQ_NAME_DAYS * 864e5, ni = REQ_COLS.indexOf('name') + 1;
  reqRows_().forEach(r => { const dd = r.decided instanceof Date ? r.decided.getTime() : Number(r.decided) || 0; if (r.status !== 'new' && r.name && dd && dd < old) rs.getRange(r.row, ni).setValue(''); });
}
function dayShift_(day, n) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const approversOn_ = () => APPROVER_KEY !== 'change-me-to-another-secret';
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function rows_() {
  const sh = sheet_(), v = sh.getDataRange().getValues(), out = [];
  for (let r = 1; r < v.length; r++) { const o = { row: r + 1 }; COLS.forEach((c, i) => o[c] = v[r][i]); out.push(o); }
  return out;
}
const clean_ = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
const approverOk_ = k => approversOn_() && k === APPROVER_KEY;
const samePart_ = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
function item_(r) {
  let pl = {}; try { pl = JSON.parse(r.payload); } catch (err) {}
  let dec = null; try { dec = r.decisions ? JSON.parse(r.decisions) : null; } catch (err) {}
  return { id: r.id, received: r.received instanceof Date ? r.received.getTime() : r.received, part: r.part, status: r.status,
    songUid: r.songUid, songName: r.songName, baseUpdated: r.baseUpdated, notes: pl.notes || [], lyrics: pl.lyrics || [],
    decisions: dec, approved: r.approved instanceof Date ? r.approved.getTime() : (r.approved || null) };
}

// members send suggestions; the reviewer marks them (both as text/plain JSON, so browsers need no extra CORS step)
function doPost(e) {
  let d; try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  if (d.action === 'hello') {   // usage count: one row per phone per day
    const day = String(d.day || ''), dev = String(d.dev || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[a-z0-9]{6,40}$/.test(dev)) return json_({ ok: false, error: 'bad hello' });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { if (!useRows_().some(r => r.day === day && r.dev === dev)) { useSheet_().appendRow(["'" + day, dev]); cleanup_(day); } } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  if (d.action === 'suggest') {
    if (!/^[a-z0-9]{8,32}$/i.test(String(d.id || ''))) return json_({ ok: false, error: 'bad id' });
    const notes = Array.isArray(d.notes) ? d.notes : [], lyrics = Array.isArray(d.lyrics) ? d.lyrics : [];
    if (!notes.length && !lyrics.length) return json_({ ok: false, error: 'empty' });
    const payload = JSON.stringify({ notes: notes, lyrics: lyrics });
    if (payload.length > MAX_PAYLOAD) return json_({ ok: false, error: 'too big' });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      if (rows_().some(r => r.id === d.id)) return json_({ ok: true, dup: true });   // sent twice (retry): keep one
      sheet_().appendRow([d.id, new Date(), 'new', clean_(d.part, 60), clean_(d.songUid, 60),
        clean_(d.songName, 120), Number(d.baseUpdated) || 0, notes.length, lyrics.length, payload, '', clean_(d.dev, 40), '', '', '']);
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  if (d.action === 'review') {
    if (d.key !== REVIEW_KEY || REVIEW_KEY === 'change-me-to-a-long-secret') return json_({ ok: false, error: 'wrong review key' });
    const st = ['accepted', 'partly', 'rejected', 'new'].indexOf(d.status) >= 0 ? d.status : null; if (!st) return json_({ ok: false, error: 'bad status' });
    const r = rows_().find(x => x.id === d.id); if (!r) return json_({ ok: false, error: 'not found' });
    const sh = sheet_(); sh.getRange(r.row, COLS.indexOf('status') + 1).setValue(st); sh.getRange(r.row, COLS.indexOf('reviewed') + 1).setValue(new Date());
    return json_({ ok: true });
  }
  if (d.action === 'request') {   // a member asks to become an approver
    if (!approversOn_()) return json_({ ok: false, error: 'approvers off' });
    if (!/^[a-z0-9]{8,32}$/i.test(String(d.id || ''))) return json_({ ok: false, error: 'bad id' });
    const name = clean_(d.name, 60).trim(); if (!name) return json_({ ok: false, error: 'no name' });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const rows = reqRows_();
      if (rows.some(r => r.id === d.id)) return json_({ ok: true, dup: true });
      if (rows.filter(r => r.status === 'new').length >= 50) return json_({ ok: false, error: 'too many requests' });
      reqSheet_().appendRow([d.id, new Date(), 'new', name, clean_(d.part, 60), clean_(d.dev, 40), '']);
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  if (d.action === 'report') {
    if (!/^[a-z0-9]{8,32}$/i.test(String(d.id || ''))) return json_({ ok: false, error: 'bad id' });
    const a = Number(d.a), b = Number(d.b); if (!(a >= 0 && b > a && b - a <= 120)) return json_({ ok: false, error: 'bad spot' });
    const kind = ['notes', 'lyrics', 'timing', ''].indexOf(String(d.kind || '')) >= 0 ? String(d.kind || '') : '';
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const rows = repRows_(); if (rows.some(r => r.id === d.id)) return json_({ ok: true, dup: true });
      if (rows.filter(r => r.status === 'new' || r.status === 'forwarded').length >= 300) return json_({ ok: false, error: 'too many reports' });
      repSheet_().appendRow([d.id, new Date(), 'new', clean_(d.part, 60), clean_(d.songUid, 60), clean_(d.songName, 120), a, b, kind, clean_(d.dev, 40), '', '', clean_(d.note, 300)]);
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  if (d.action === 'rhandle') {   // a report: forwarded / fixed (approver) or closed / fixed (moderator)
    const mod = d.key === REVIEW_KEY && REVIEW_KEY !== 'change-me-to-a-long-secret', appr = approverOk_(d.key);
    if (!mod && !appr) return json_({ ok: false, error: 'wrong key' });
    const ok = mod ? ['closed', 'fixed'] : ['forwarded', 'fixed']; if (ok.indexOf(d.status) < 0) return json_({ ok: false, error: 'bad status' });
    const r = repRows_().find(x => x.id === d.id); if (!r) return json_({ ok: false, error: 'not found' });
    if (!mod && r.status !== 'new') return json_({ ok: false, error: 'already handled' });
    if (!mod && r.dev && String(d.dev || '') === String(r.dev)) return json_({ ok: false, error: 'own report' });
    const sh = repSheet_(), col = c => REP_COLS.indexOf(c) + 1;
    sh.getRange(r.row, col('status')).setValue(d.status); sh.getRange(r.row, col('handled')).setValue(new Date()); sh.getRange(r.row, col('by')).setValue(mod ? 'moderator' : 'approver');
    return json_({ ok: true });
  }
  if (d.action === 'rdecide') {   // the moderator: yes or no to a request
    if (d.key !== REVIEW_KEY || REVIEW_KEY === 'change-me-to-a-long-secret') return json_({ ok: false, error: 'wrong review key' });
    const st = ['granted', 'declined'].indexOf(d.status) >= 0 ? d.status : null; if (!st) return json_({ ok: false, error: 'bad status' });
    const r = reqRows_().find(x => x.id === d.id); if (!r) return json_({ ok: false, error: 'not found' });
    const sh = reqSheet_(); sh.getRange(r.row, REQ_COLS.indexOf('status') + 1).setValue(st); sh.getRange(r.row, REQ_COLS.indexOf('decided') + 1).setValue(new Date());
    return json_({ ok: true });
  }
  if (d.action === 'approve') {   // an approver's decisions: one per change ('acc' or 'rej')
    if (!approverOk_(d.key)) return json_({ ok: false, error: 'wrong approver key' });
    const dec = d.decisions || {}, ok = a => Array.isArray(a) && a.every(x => x === 'acc' || x === 'rej');
    if (!ok(dec.notes || []) || !ok(dec.lyrics || [])) return json_({ ok: false, error: 'bad decisions' });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const r = rows_().find(x => x.id === d.id); if (!r) return json_({ ok: false, error: 'not found' });
      if (r.status !== 'new') return json_({ ok: false, error: 'already decided' });
      if (r.dev && String(d.dev || '') === String(r.dev)) return json_({ ok: false, error: 'own suggestion' });
      const sh = sheet_(), col = c => COLS.indexOf(c) + 1;
      sh.getRange(r.row, col('status')).setValue('approved');
      sh.getRange(r.row, col('decisions')).setValue(JSON.stringify({ notes: dec.notes || [], lyrics: dec.lyrics || [] }));
      sh.getRange(r.row, col('approver')).setValue(clean_(d.dev, 40));
      sh.getRange(r.row, col('approved')).setValue(new Date());
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  return json_({ ok: false, error: 'unknown action' });
}

// ?action=status&ids=a,b,c                → status of those suggestions (anyone: ids are random)
// ?action=list&key=…                       → the suggestions waiting for review, and the approved ones (review key)
// ?action=alist&key=…&parts=a,b&dev=…      → suggestions for those parts that an approver may decide on (approver key; never the phone's own)
// (list and alist also return "reports": spots members marked as "something sounds off")
// ?action=rstatus&id=…                     → a member's approver request: new / granted (with the key) / declined
// ?action=rlist&key=…                      → open approver requests (review key)
function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'status') {
    const ids = String(p.ids || '').split(',').filter(Boolean).slice(0, 200), st = {};
    rows_().forEach(r => { if (ids.indexOf(r.id) >= 0) st[r.id] = r.status === 'approved' ? 'checked' : r.status; });
    return json_({ ok: true, status: st });
  }
  if (p.action === 'list') {
    if (p.key !== REVIEW_KEY || REVIEW_KEY === 'change-me-to-a-long-secret') return json_({ ok: false, error: 'wrong review key' });
    const list = rows_().filter(r => r.status === 'new' || r.status === 'approved').map(item_);
    const reports = repRows_().filter(r => r.status === 'new' || r.status === 'forwarded').map(repItem_);
    return json_({ ok: true, list: list, reports: reports, approvers: APPROVER_KEY !== 'change-me-to-another-secret' });
  }
  if (p.action === 'usage') {   // the moderator: phones per day for the last 30 days, and different phones in the last 7 / 30 days / ever
    if (p.key !== REVIEW_KEY || REVIEW_KEY === 'change-me-to-a-long-secret') return json_({ ok: false, error: 'wrong review key' });
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(p.today || '')) ? String(p.today) : dayOf_(new Date());
    const rows = useRows_(), from7 = dayShift_(today, -6), from30 = dayShift_(today, -29), days = {}, s7 = {}, s30 = {}, all = {};
    rows.forEach(r => { all[r.dev] = 1; if (r.day >= from30 && r.day <= today) { s30[r.dev] = 1; (days[r.day] = days[r.day] || {})[r.dev] = 1; if (r.day >= from7) s7[r.dev] = 1; } });
    const perDay = {}; Object.keys(days).forEach(k => perDay[k] = Object.keys(days[k]).length);
    return json_({ ok: true, today: today, days: perDay, phones7: Object.keys(s7).length, phones30: Object.keys(s30).length, phonesAll: Object.keys(all).length });
  }
  if (p.action === 'rstatus') {
    const r = reqRows_().find(x => x.id === String(p.id || '')); if (!r) return json_({ ok: true, status: 'unknown' });
    return json_({ ok: true, status: r.status, key: r.status === 'granted' && approversOn_() ? APPROVER_KEY : undefined });
  }
  if (p.action === 'rlist') {
    if (p.key !== REVIEW_KEY || REVIEW_KEY === 'change-me-to-a-long-secret') return json_({ ok: false, error: 'wrong review key' });
    const list = reqRows_().filter(r => r.status === 'new').map(r => ({ id: r.id, received: r.received instanceof Date ? r.received.getTime() : r.received, name: r.name, part: r.part }));
    return json_({ ok: true, list: list, approvers: approversOn_() });
  }
  if (p.action === 'alist') {
    if (!approverOk_(p.key)) return json_({ ok: false, error: 'wrong approver key' });
    const parts = String(p.parts || '').split(',').filter(Boolean), dev = String(p.dev || '');
    const list = rows_().filter(r => r.status === 'new' && parts.some(x => samePart_(x, r.part)) && !(r.dev && dev && String(r.dev) === dev)).map(item_);
    const reports = repRows_().filter(r => r.status === 'new' && parts.some(x => samePart_(x, r.part)) && !(r.dev && dev && String(r.dev) === dev)).map(repItem_);
    return json_({ ok: true, list: list, reports: reports });
  }
  return json_({ ok: true, app: 'part-coach-suggestions' });
}
