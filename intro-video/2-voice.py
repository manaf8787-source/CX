"""Step 2 — generate the narration with edge-tts, one clip per scene, with
word-boundary timings.  Re-runs only scenes whose text/voice changed.

    python 2-voice.py
"""
import asyncio, hashlib, json, re, sys
from pathlib import Path
import edge_tts

HERE = Path(__file__).parent
OUT = HERE / "audio"
OUT.mkdir(exist_ok=True)
script = json.loads((HERE / "script.json").read_text(encoding="utf8"))


def spoken(text: str) -> str:
    for word, say in script["phonetic"].items():
        text = re.sub(rf"\b{re.escape(word)}\b", say, text)
    return text


async def scene(sc):
    text = spoken(sc["say"])
    key = hashlib.sha1(f'{script["voice"]}|{script["rate"]}|{text}'.encode()).hexdigest()[:12]
    mp3, meta = OUT / f'{sc["id"]}.mp3', OUT / f'{sc["id"]}.json'
    if meta.exists() and json.loads(meta.read_text(encoding="utf8")).get("key") == key and mp3.exists():
        print("  cached", sc["id"]); return
    for attempt in range(8):  # the free endpoint sometimes returns no audio
        try:
            comm = edge_tts.Communicate(text, script["voice"], rate=script["rate"], boundary="WordBoundary")
            words, audio = [], bytearray()
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    audio += chunk["data"]
                elif chunk["type"] == "WordBoundary":
                    s = chunk["offset"] / 1e7
                    words.append({"text": chunk["text"], "start": round(s, 3), "end": round(s + chunk["duration"] / 1e7, 3)})
            break
        except edge_tts.exceptions.NoAudioReceived:
            print(f'  retry {sc["id"]} ({attempt + 1})'); await asyncio.sleep(1.5 * (attempt + 1))
    else:
        sys.exit(f'edge-tts failed for {sc["id"]}')
    mp3.write_bytes(audio)
    meta.write_text(json.dumps({"key": key, "spoken": text, "words": words}, indent=1), encoding="utf8")
    print(f'  voiced {sc["id"]}: {len(words)} words, ends {words[-1]["end"]:.2f}s')


async def main():
    for sc in script["scenes"]:
        await scene(sc)

asyncio.run(main())
