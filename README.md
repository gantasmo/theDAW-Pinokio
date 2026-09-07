# theDAW (Pinokio launcher)

One-click launcher for [theDAW](https://github.com/gantasmo/theDAW), the all-in-one AI music studio by GANTASMO. theDAW combines Stable Audio 3 and Magenta RealTime 2 generation, the Chimera v2 multi-track fusion engine, Demucs stem separation, MIDI and notation tooling with SCORE play-along and drum transcription, the NodeF.I. node editor, DJ, VJ and Sway Perform rigs, DAW project import (Ableton Live, Reaper, FL Studio, Audition, Bitwig, Resolume), VST3 and .gan plugin hosting, the Underfit LoRA trainer, the LOOM colony (a living graph of loops cut from your own library that grows, divides and withers on the beat clock), and a RAG-backed in-app assistant.

## What the launcher does

- **Install** clones the repo into `app/`, pulls the Magenta sidecar submodule, installs FFmpeg through conda, resolves all Python dependencies with `uv sync --group dev`, builds the optional Underfit trainer environment, installs the frontend and VST Foundry packages with `npm install`, clones the VJ-9000 app, and pre-fetches the default generation model from the public mirror (Medium on Windows and Linux, Small on macOS) so the first CREATE does not wait on a download.
- **Start** launches the FastAPI backend through its restart supervisor on `http://localhost:8600`, then the Vite frontend on `http://localhost:5173`, and opens the app once the URL appears. Settings -> Restart Server works under the launcher: the backend comes back inside the same Pinokio terminal.
- **Update** pulls the launcher and the app repos, refreshes the submodule, re-syncs the Python, Underfit and npm dependencies, and re-provisions the VJ app if it is missing.
- **Reset** deletes the dependency trees only: `app/.venv`, `app/underfit/.venv`, and the `node_modules` folders of the frontend, VST Foundry and VJ app. Your library, settings and generated audio under `app/data` stay put. The next Install rebuilds the dependencies from clean.

The other Stable Audio 3 checkpoints are one click away under **Download Models** (Small ARC, Small RF, Medium ARC, Medium RF), and theDAW also downloads any model the first time a generation needs it. The launcher points `HF_HOME` at the standard user Hugging Face cache (`~/.cache/huggingface`) rather than an isolated per-app cache, so checkpoints and the Hugging Face auth token already on the machine are reused. The official Stable Audio 3 and t5gemma repos are gated; the app falls back to a public mirror of the same weights automatically, and a Hugging Face token (the in-app sign-in, or `hf auth login`) unlocks the official repos.

## Platform behavior

The Python dependency set self-selects per platform through `uv`:

| Platform | Torch build | Notes |
|---|---|---|
| Windows | CUDA 12.8 wheels + prebuilt flash-attention | Full feature set. Flash-attention is enabled only on Ampere or newer GPUs; Turing cards (RTX 20xx, GTX 16xx) fall back to standard attention automatically. |
| Linux x86_64 | CUDA 12.6 wheels | Full feature set; Magenta sidecar supported. On glibc older than 2.38 the Azure Kinect backend (`pyk4a-bundle`) is skipped and only the Kinect point-cloud source is lost. |
| macOS | Standard PyPI torch (CPU / MPS) | Small model recommended; flash-attention, Azure Kinect, and the Magenta sidecar are skipped automatically |

The Small generation model runs on CPU, so machines without an NVIDIA GPU still generate audio.

## Ports

The app fixes its own ports: the frontend proxies `/api` to `localhost:8600` and Vite runs with `strictPort` on 5173. If Start fails immediately, close anything already using 5173 or 8600 (for example a copy launched through `theDAW.bat`). The VJ sidecar (port 5187) is spawned by the backend on first use and bootstraps its own npm packages.

Both servers bind `0.0.0.0`, so the web UI, the phone companion, Quest streaming and XR control are reachable from other devices on the same network, exactly as under `theDAW.bat` and `theDAW.sh`.

## Using the app

1. Click **Install** and wait for the dependency sync to finish.
2. Click **Start**. The backend comes up first, then the web UI; the **Open App** tab appears when the URL is ready.
3. Generate in MAKE, edit in EDIT, mix in MIX, perform in DJ / VJ / PERFORM. The in-app assistant and docs cover the rest.

## API

The backend serves a full HTTP API on `http://localhost:8600`, with interactive documentation at `http://localhost:8600/docs`.

### Generate audio

curl:

```bash
curl -X POST http://localhost:8600/api/generate \
  -F "prompt=warm analog synth arpeggio, 120 bpm" \
  -F "duration=30" \
  -F "steps=8"
```

Python:

```python
import requests

r = requests.post(
    "http://localhost:8600/api/generate",
    data={"prompt": "warm analog synth arpeggio, 120 bpm", "duration": 30, "steps": 8},
    timeout=600,
)
r.raise_for_status()
print(r.json())
```

JavaScript:

```javascript
const form = new FormData();
form.append("prompt", "warm analog synth arpeggio, 120 bpm");
form.append("duration", "30");
form.append("steps", "8");
const res = await fetch("http://localhost:8600/api/generate", { method: "POST", body: form });
console.log(await res.json());
```

### Import audio into the library

curl:

```bash
curl -X POST http://localhost:8600/api/library/import \
  -F "file=@track.wav" \
  -F 'metadata={"title": "My Track", "source": "import"}'
```

Python:

```python
import json
import requests

with open("track.wav", "rb") as f:
    r = requests.post(
        "http://localhost:8600/api/library/import",
        files={"file": f},
        data={"metadata": json.dumps({"title": "My Track", "source": "import"})},
    )
r.raise_for_status()
print(r.json()["id"])
```

JavaScript:

```javascript
const form = new FormData();
form.append("file", fileBlob, "track.wav");
form.append("metadata", JSON.stringify({ title: "My Track", source: "import" }));
const res = await fetch("http://localhost:8600/api/library/import", { method: "POST", body: form });
console.log(await res.json());
```

The rest of the surface (stems, MIDI conversion, notation, DJ, VJ, project import, plugins) is browsable at `/docs` while the backend is running.
