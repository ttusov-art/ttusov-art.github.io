# Keys

A clean full-screen piano, split out of Part Coach's "Bigger keys" piano. Open it and play: no songs, no setup.

**Address:** https://ttusov-art.github.io/keys/

## Using it
- Tap or click the keys; several fingers at once work, and sliding plays each key you pass.
- **Pedal**: hold it while you play, or tap it to latch it on and off.
- **◀ Oct / Oct ▶** and the overview strip (drag the window, or tap to jump) move along the full piano (A0 to C8). **− +** show fewer/more keys.
- **Key**: names the notes of the key on the keys (the tonic in bold green) and sets the chords for **Chord** mode (each key plays its triad in that key; with "No key", a major triad).
- **Loop**: press, play (recording starts with your first note), press again to close the loop. It repeats while you play on top. Press again to record a layer on top; ❚❚ pause, ↶ undo the last layer, ✕ clear.
- **Mark** maps out your voice: pick a colour (Comfortable, Stretch, Passaggio, Top: tap a name to rename it), then tap or drag over keys. Tapping a key in the same colour takes it off; Eraser and Clear all too. The keys still sound while you mark. **Fit to marks** zooms to exactly your marked keys. The colours show on the keys, in the overview strip and in a legend next to the Mark button.
- **Keys only** hides the bars; the small ☰ button in the corner brings them back. **Full screen** for a big screen.
- Settings (zoom, position, key, sound, volume, chord, keys only, your marks) are remembered on the device.
- Phone: "Add to home screen" opens it full screen, sideways, with its own icon.

## Keyboard shortcuts
| Key | Action |
|---|---|
| A S D F G H J K L Ö Ä (home row) | White keys, from the first C on screen |
| W E T Z U O P (row above) | Black keys |
| Space (hold) | Sustain pedal |
| ← → | One octave down / up |
| − + | Fewer, bigger keys / more keys |
| 1 | Chord mode on / off |
| 2 | Loop: start, close, add a layer, finish the layer |
| 3 | Pause / play the loop |
| 4 | Undo the last loop layer |
| Delete | Clear the loop |
| M | Mark mode on / off (laptop note keys colour keys too) |
| N | Fit the screen to your marked keys |
| 0 | Keys only / show the bars |
| Enter | Full screen on / off |
| ? | Shortcut list |
| Esc | Close the list, stop all notes |

The note keys go by position, so they are the same on a German (QWERTZ) and an English keyboard. The letters appear on the keys after the first laptop key you play.

## Files
| File | Job |
|---|---|
| `index.html` | Page structure only |
| `css/style.css` | The look, light and dark, phone / laptop / big screen |
| `js/main.js` | Starts the tool, wires the modules, `APP_VERSION` |
| `js/state.js` | Settings and live state; the only place settings change (`set()`) |
| `js/storage.js` | Saves settings in localStorage |
| `js/audio.js` | Web Audio, limiter, grand piano samples, simple piano |
| `js/play.js` | Fingers and laptop keys → notes, chords, sustain pedal |
| `js/loop.js` | Loop pedal |
| `js/marks.js` | Your voice map: coloured marks, names, painting |
| `js/lib/music.js` | Pure helpers: notes, keys, spelling, chords |
| `js/lib/laptop.js` | Laptop key → note mapping |
| `js/ui/keyboard.js` | Draws the keys, pointer playing, lit keys |
| `js/ui/overview.js` | Overview strip, zoom, octave moves |
| `js/ui/controls.js` | Top bar and bottom strip |
| `js/ui/shortcuts.js` | All keyboard shortcuts in one table |
| `js/ui/help.js` | The ? list |
| `js/ui/update.js` | "New version" banner |
| `tests/unit.mjs` | `node keys/tests/unit.mjs` |
| `tests/marks_test.py` | Playwright test of Mark mode |
| `tests/ui_test.py` | Playwright; serve the repo root on port 8765 first |

Shared with Part Coach (one folder up): `../piano/` samples and `../fonts/`.

## Privacy
Nothing is sent anywhere. Settings stay in this browser. The piano samples come from this same site and are cached in the browser (the same cache as Part Coach, so they download only once).

## Credits
Piano sounds: Salamander Grand Piano by Alexander Holm (CC BY 3.0). Fonts: IBM Plex, Bricolage Grotesque (SIL Open Font License).
