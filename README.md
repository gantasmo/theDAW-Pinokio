# theDAW (Pinokio launcher)

One-click launcher for [theDAW](https://github.com/gantasmo/theDAW), the all-in-one AI music studio by GANTASMO. theDAW combines Stable Audio 3 and Magenta RealTime 2 generation, the Chimera multi-track fusion engine, Demucs stem separation, MIDI and notation tooling, DJ and VJ performance rigs, DAW project import (Ableton Live, Reaper, FL Studio, Audition, Bitwig, Resolume), VST3 and .gan plugin hosting, and a RAG-backed in-app assistant.

## What the launcher does

- **Install** clones the repo into `app/`, pulls the Magenta sidecar submodule, installs FFmpeg through conda, resolves all Python dependencies with `uv sync --group dev`, and installs the frontend packages with `npm install`.
- **Start** launches the FastAPI backend on `http://localhost:8600`, then the Vite frontend on `http://localhost:5173`, and opens the app once the URL appears.
- **Update** pulls the launcher and the app repos, refreshes the submodule, and re-syncs Python and npm dependencies.
- **Reset** deletes `app/.venv` and `app/frontend/node_modules` so the next Install starts from clean dependencies.

Models are not downloaded at install time. theDAW runs in local-only mode by default and downloads a model the first time a generation needs it.

## Platform behavior

The Python dependency set self-selects per platform through `uv`:

| Platform | Torch build | Notes |
|---|---|---|
| Windows | CUDA 12.8 wheels + prebuilt flash-attention | Full feature set |
| Linux x86_64 | CUDA 12.6 wheels | Full feature set; Magenta sidecar supported |
| macOS | Standard PyPI torch (CPU / MPS) | Small model recommended; flash-attention, Azure Kinect, and the Magenta sidecar are skipped automatically |

The Small generation model runs on CPU, so machines without an NVIDIA GPU still generate audio.

## Ports

The app fixes its own ports: the frontend proxies `/api` to `localhost:8600` and Vite runs with `strictPort` on 5173. If Start fails immediately, close anything already using 5173 or 8600 (for example a copy launched through `theDAW.bat`). The VJ sidecar (port 5187) is spawned by the backend on first use and bootstraps its own npm packages.

The frontend's own dev script binds `0.0.0.0`, so the web UI (and LAN features that talk to it, like the phone camera source) is reachable from other devices on the network. The backend binds to localhost under this launcher; features that contact the backend directly from another device (Quest streaming, XR control) need the `theDAW.bat` launch path, which binds the backend to `0.0.0.0`.

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
