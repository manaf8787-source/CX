"""Step 3 — build the timeline and the audio.

Reads script.json, the voice clips + word timings (audio/), and the capture
manifest (captures/manifest.json). Writes:
  build/timeline.json  every scene, beat and line with absolute times
  build/voice.wav      narration placed on the timeline
  build/music.wav      a soft synthesized music bed (no stock audio)
  build/mix.wav        music ducked under the voice, normalised to -16 LUFS

    python 3-build.py
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
BUILD = HERE / "build"; BUILD.mkdir(exist_ok=True)
SR = 48000
FPS = 30
DIP = 0.32          # seconds of fade-out + fade-in through the background
LEAD = 0.5          # scene start → voice start
TAIL = 0.75         # voice end → scene end
FIRST_LEAD, LAST_TAIL = 0.9, 2.6

script = json.loads((HERE / "script.json").read_text(encoding="utf8"))
manifest = json.loads((HERE / "captures" / "manifest.json").read_text(encoding="utf8"))


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def spoken(text):
    for word, say in script["phonetic"].items():
        text = re.sub(rf"\b{re.escape(word)}\b", say, text)
    return text


class WordFinder:
    """Finds a cue phrase in the spoken words, in order, by matching the
    phrase against the words' letters with spaces/punctuation removed."""
    def __init__(self, words):
        self.words, self.stream, self.owner = words, "", []
        for i, w in enumerate(words):
            n = norm(w["text"]); self.stream += n; self.owner += [i] * len(n)
        self.pos = 0

    def find(self, phrase, scene_id):
        target = norm(spoken(phrase))
        at = self.stream.find(target, self.pos)
        if at < 0:
            sys.exit(f'cue "{phrase}" not found (in order) in scene {scene_id}')
        self.pos = at + 1
        return self.words[self.owner[at]]["start"]


def decode(mp3):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


# ---- timeline -------------------------------------------------------------
scenes, t = [], 0.0
clips = []
for i, sc in enumerate(script["scenes"]):
    meta = json.loads((HERE / "audio" / f'{sc["id"]}.json').read_text(encoding="utf8"))
    audio = decode(HERE / "audio" / f'{sc["id"]}.mp3')
    vlen = len(audio) / SR
    lead = FIRST_LEAD if i == 0 else LEAD
    tail = LAST_TAIL if i == len(script["scenes"]) - 1 else TAIL
    v0 = t + lead
    finder = WordFinder(meta["words"])
    out = {k: sc[k] for k in ("id", "type", "layout", "label", "shot") if k in sc}
    out.update(start=round(t, 3), voiceStart=round(v0, 3), end=round(v0 + vlen + tail, 3))
    if sc["type"] == "screen":
        if sc["shot"] not in manifest:
            sys.exit(f'scene {sc["id"]}: shot {sc["shot"]} not captured')
        out["beats"] = []
        for b in sc.get("beats", []):
            bt = round(v0 + finder.find(b["on"], sc["id"]), 3)
            out["beats"].append({**b, "t": bt})
            if "shot" in b and b["shot"] not in manifest:
                sys.exit(f'scene {sc["id"]}: shot {b["shot"]} not captured')
    else:
        out["lines"] = [{**ln, "t": round(v0 + finder.find(ln["on"], sc["id"]), 3)} for ln in sc.get("lines", [])]
    scenes.append(out)
    clips.append((v0, audio))
    t = out["end"]

duration = round(t, 3)
timeline = {"fps": FPS, "width": 1920, "height": 1080, "dip": DIP, "duration": duration,
            "scenes": scenes, "manifest": manifest}
(BUILD / "timeline.json").write_text(json.dumps(timeline, indent=1, ensure_ascii=False), encoding="utf8")
print(f"timeline: {len(scenes)} scenes, {duration:.2f}s")

# ---- voice track ------------------------------------------------------------
N = int(duration * SR) + SR
voice = np.zeros(N, dtype=np.float32)
for v0, a in clips:
    s = int(v0 * SR); voice[s:s + len(a)] += a


def write_wav(path, data):
    data = np.atleast_2d(data)
    if data.shape[0] < data.shape[1]: data = data.T
    raw = np.clip(data, -1, 1).astype(np.float32).tobytes()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", str(data.shape[1]), "-i", "-",
                    "-c:a", "pcm_s16le", str(path)], input=raw, check=True)


write_wav(BUILD / "voice.wav", voice)

# ---- music bed (synthesized) -------------------------------------------------
rng = np.random.default_rng(7)
tt = np.arange(N) / SR
L = np.zeros(N, dtype=np.float64); R = np.zeros(N, dtype=np.float64)
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
# D major, gentle: Dmaj9 – Bm7 – Gmaj7 – A6sus  (MIDI notes)
chords = [[50, 57, 61, 64, 66], [47, 54, 57, 62, 66], [43, 50, 54, 59, 62], [45, 52, 57, 59, 64]]
bar = 60 / 84 * 4          # 84 bpm, 4/4
chord_len = bar * 2
# Pad: soft additive tones with slow swells, slight detune for width.
for ci in range(int(duration / chord_len) + 2):
    notes = chords[ci % 4]
    s0 = ci * chord_len
    a, b = int(max(0, s0 - 0.6) * SR), min(N, int((s0 + chord_len + 1.2) * SR))
    if a >= N: break
    seg = tt[a:b] - s0
    env = np.clip((seg + 0.6) / 1.4, 0, 1) * np.clip((chord_len + 1.2 - seg) / 1.6, 0, 1)
    env = env ** 1.5
    for k, m in enumerate(notes):
        f = mid(m + 12 if k else m)
        for det, pan in ((-0.0025, 0.75), (0.0025, 0.25)):
            ph = rng.uniform(0, 2 * np.pi)
            tone = (np.sin(2 * np.pi * f * (1 + det) * seg + ph) + 0.18 * np.sin(2 * np.pi * 2 * f * (1 + det) * seg + ph)) * env
            amp = 0.035 if k else 0.05
            L[a:b] += tone * amp * pan; R[a:b] += tone * amp * (1 - pan)
# Soft plucked arpeggio, eighth notes, quiet.
eighth = 60 / 84 / 2
for n in range(int(duration / eighth)):
    s0 = n * eighth
    notes = chords[int(s0 // chord_len) % 4]
    m = notes[[1, 2, 3, 4, 3, 2][n % 6]] + 12
    a = int(s0 * SR); b = min(N, a + int(1.4 * SR))
    seg = tt[a:b] - s0
    f = mid(m)
    tone = np.sin(2 * np.pi * f * seg) * np.exp(-seg * 4.5) * (1 - np.exp(-seg * 300))
    pan = 0.35 + 0.3 * ((n % 4) / 3)
    L[a:b] += tone * 0.018 * pan; R[a:b] += tone * 0.018 * (1 - pan)
fade = np.clip(tt / 2.5, 0, 1) * np.clip((duration - tt) / 3.0, 0, 1)
music = np.stack([L * fade, R * fade]).astype(np.float32)
music /= max(1e-6, np.abs(music).max()) / 0.5
write_wav(BUILD / "music.wav", music)

# ---- mix: duck music under voice, normalise to -16 LUFS ----------------------
graph = ("[0:a]aformat=channel_layouts=stereo,asplit=2[v][sc];"
         "[1:a]lowpass=f=2600,volume=-17dB[m];"
         "[m][sc]sidechaincompress=threshold=0.02:ratio=9:attack=25:release=450:makeup=1[md];"
         "[v][md]amix=inputs=2:duration=longest:normalize=0[mix]")
pre = BUILD / "premix.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(BUILD / "voice.wav"), "-i", str(BUILD / "music.wav"),
                "-filter_complex", graph, "-map", "[mix]", "-ar", str(SR), "-c:a", "pcm_s16le", str(pre)], check=True)
# two-pass loudnorm
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(pre), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
                    "-f", "null", "-"], capture_output=True, text=True)
m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(pre), "-af", ln, "-ar", str(SR), "-c:a", "pcm_s16le",
                str(BUILD / "mix.wav")], check=True)
print("mix.wav written (input was", m["input_i"], "LUFS)")
