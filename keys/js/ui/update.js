// "New version available": compares the version in the deployed main.js with the running one.
export async function checkUpdate(current) {
  try {
    const r = await fetch('js/main.js?v=' + Date.now(), { cache: 'no-store' });
    const txt = await r.text();
    const m = txt.match(/APP_VERSION = '([\d.]+)'/);
    if (!m || !newer(m[1], current)) return;
    const el = document.querySelector('#newVer');
    el.querySelector('span').textContent = 'A new version of Keys is ready (' + m[1] + ').';
    el.hidden = false;
    el.querySelector('#newVerGo').onclick = () => location.reload();
    el.querySelector('#newVerX').onclick = () => { el.hidden = true; };
  } catch (e) { /* offline: try next time */ }
}

// "1.2.10" is newer than "1.2.9"
export function newer(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
