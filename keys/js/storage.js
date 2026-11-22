// Remembers the settings on this device (localStorage). Nothing leaves the device.
const KEY = 'keys-settings-v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    // private mode or full storage: the tool still works, it just forgets
  }
}
