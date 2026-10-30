# Part Coach

Practise your choir part on your phone: sing along with your part's voice and backing, see the target melody as a pitch line, and watch your own voice drawn on top of it in real time.

Part Coach is a single web page. There is nothing to install from an app store and no account to create. It runs in the browser (Chrome, Safari, Ecosia…), can be added to the home screen, and keeps working offline once the songs are on the phone.

---

## For choir members

1. **Open the link** for your part that the moderator shared. The app downloads that part's songs to your phone (you can choose which ones).
2. **Choose a song** and press **Play**. You hear the voice of your part and the backing, each with its own volume.
3. **Turn on the microphone** to see your own pitch as you sing. The readouts show the target note, how far off you are, and how much of the time you were on pitch and on time.

Useful things to try:

- **Loop** a difficult passage, slow it down with the **tempo** (BPM) button, and **bookmark** it to come back later.
- **Key** opens a playable piano keyboard (several fingers at once, with a sustain pedal).
- **Analyse** listens to a run-through and points out the places worth practising.
- **Warm-up**: a short session of scales, arpeggios and sirens in your part's range.
- **Lyrics** follow along, with a countdown before each entry after a long rest.

**Found a mistake?** Tap the pencil ✎. You can fix a wrong note (**Edit target line**) or the timing of a lyric line (**Time lyrics**) and send it as a suggestion. If you can hear that something is off but don't know what, tap **⚑ Sounds off** to mark the spot for someone else to check. Suggestions are anonymous, and editing and suggesting is very welcome: it makes the songs better for everyone.

Updates: when the moderator publishes new or corrected songs, tap **Update**. When a new version of the app itself is out, a banner offers to reload.

---

## For the moderator

The moderator prepares the songs and shares them. The admin tools are unlocked with the review key from the inbox script (see below).

**Adding a song.** Choose a part recording (for example an MP3). The app separates the voice from the backing on your device, finds the pitch line and keeps everything in the song library. A set-up guide then walks through the steps: lyrics (also from a PDF), smoothing the pitch line, aligning, tempo and beat 1, timing the lyrics and cleaning up.

**Sharing.** Make the share file for a part (a `.zip`), upload it to Dropbox and share the Dropbox link with the choir. Upload the new file under the same name to replace the old one, so the link stays the same. The app reminds you which songs have changes that are not published yet, and **your own edits** shows them change by change, with the option to put single changes back.

**Short links (optional).** **Make links.json** creates a `links.json` file. Upload it next to `index.html` and each part gets a short link like `…/?alto-1`. It also tells members' phones where the suggestions inbox is.

**Suggestions inbox.** Members' suggestions, "sounds off" reports, approver requests and the usage count go to a Google spreadsheet through a small Google Apps Script (`suggestions-inbox.gs`):

1. Create a Google spreadsheet, open **Extensions → Apps Script** and paste in `suggestions-inbox.gs`.
2. Change `REVIEW_KEY` to a long secret of your own. Optionally change `APPROVER_KEY` to a second secret to switch on approvers.
3. **Deploy → New deployment → Web app**, execute as *me*, access *anyone*. Copy the web app link into Part Coach (Admin).
4. After changing the script later, deploy it as a **new version of the same deployment**, so the link stays the same.

**Approvers** are trusted members who can check suggestions for their own part (never their own suggestions). Members can ask to become one from the app, and you say yes or no in Admin.

**Usage.** If members agree, the Admin panel shows how many phones used the app in the last days and weeks.

---

## Files in this repository

| File or folder | What it is |
|---|---|
| `index.html` | The whole app: page, styles and code in one file |
| `fonts/` | The fonts, served with the app (with their licences) |
| `piano/` | Piano recordings for the playable keyboard |
| `lib/` | Two helper libraries: MP3 encoding (lamejs) and PDF reading (PDF.js) |
| `voc_ft.part0–4.wasm` | The voice separation model, split into five parts (used by the moderator only) |
| `beats.js` | Beat detection code, a copy used for testing |
| `manifest.webmanifest`, icons | Lets the app be added to the home screen |
| `suggestions-inbox.gs` | The Google Apps Script for the suggestions inbox (not used by the page itself) |
| `links.json` | Optional short links per part, made by the app |

There is no build step: what is in the repository is exactly what GitHub Pages serves.

---

## Privacy

- Songs, recordings, singing scores and settings stay on each phone. The microphone is analysed only on the phone and is never sent anywhere.
- Sent to the moderator's Google spreadsheet:
  - suggestions and reports (the changes, the song and part, an optional comment and a random number for the phone, no name);
  - approver requests (the name and part typed in; the name is removed 30 days after the decision);
  - the usage count, only after the member says yes (a random number and the date; removed after 12 months).
- GitHub Pages (the app) and Dropbox (the songs) see visitors' internet addresses when files are downloaded, like any website. Fonts, piano sounds and libraries are served with the app, so no other sites are contacted.
- Only on the moderator's phone, when separating a new song, the separation engine (ONNX Runtime) is downloaded from a public code server.
- **Remove all Part Coach data** in Settings deletes everything from a phone.

The same information is in the app under **Settings → Privacy**.

---

## Credits

- Piano sounds: Salamander Grand Piano by Alexander Holm, CC BY 3.0
- Fonts: Bricolage Grotesque, IBM Plex Sans and Mono, Atkinson Hyperlegible, SIL Open Font License
- MP3 encoding: lamejs (LGPL); PDF reading: PDF.js by Mozilla (Apache 2.0)
- Voice separation: the UVR-MDX-NET Voc_FT model from the Ultimate Vocal Remover project, run with ONNX Runtime Web by Microsoft
