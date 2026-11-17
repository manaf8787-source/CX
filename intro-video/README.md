# PSI CX Portal — explainer video

Built locally from the real app screens (frontend/, signed in as the **CX team (level 1)** demo role). No AI video generators.

Pipeline: Playwright + headless Chrome (capture and frames) · edge-tts `en-US-AndrewNeural` +4% (voice, with word timings) · numpy (synthesized music bed) · ffmpeg (mix and encode).

## Rebuild

| Step | Command | When to re-run |
|---|---|---|
| 1. Capture screens | `node 1-capture.mjs` | The app UI changed (starts Vite on :5179 if needed) |
| 2. Generate voice | `python 2-voice.py` | Narration text in `script.json` changed (only changed scenes are re-voiced) |
| 3. Timeline + audio | `python 3-build.py` | After 1 or 2, or after changing beats/cues |
| 4. Render | `node 4-render.mjs --sheet` then `node 4-render.mjs` | Always last |

If you change only `render/index.html` (look and animation), just re-run step 4.

## Files

- `script.json` — narration per scene, phonetic spellings (PSI → "P S I"), and the beats: `on` = the spoken word that triggers a camera move (`cam`), a highlight ring (`ring`), a click (`click`) or a screen-state change (`shot`).
- `lib/demo-seed.mjs` — replaces every person's name, email and phone in the sample data with clearly invented ones at capture time. The app source is untouched.
- `captures/` — 2x screenshots + `manifest.json` with the on-screen box of every highlighted element.
- `audio/` — voice clips + word timings. `build/` — `timeline.json`, `voice.wav`, `music.wav`, `mix.wav` (-16 LUFS).
- `render/index.html` — draws any frame from time t (`window.render(t)`), with no CSS transitions.
- `out/` — `contact-sheet-*.jpg` (sample frames, with timestamps) and `psi-cx-portal-explainer.mp4`.

Output: 1920×1080, 30 fps, H.264 yuv420p bt709, AAC 192k, +faststart.
