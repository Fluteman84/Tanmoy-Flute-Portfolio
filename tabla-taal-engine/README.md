# Tabla Taal Engine

A standalone, lightweight web application module providing **Visual & Audio Metronome-based Tabla Beat Counting** and rhythm accompaniment for Hindustani classical music practice.

---

## Architecture & Modular Design

```text
tabla-taal-engine/
├── index.html            # Standalone semantic markup with live info bar
├── css/
│   ├── style.css         # Design tokens, classical theme, markers, active states
│   └── responsive.css    # Fluid layout scaling (desktop, tablet, 430px, 390px, 360px)
├── js/
│   ├── audio-engine.js   # Web Audio API engine, sample decoding, buffer scheduling
│   ├── taal-loader.js    # Asynchronous JSON fetcher and strict schema validator
│   ├── taal-renderer.js  # Dynamic dropdown, beat grid, Sam/Tali/Khali badges, live bar
│   ├── metronome-engine.js # Monotonic timing engine, state machine, audio sync
│   └── app.js            # Main application coordinator, event binding, and public API
├── data/
│   └── taals.json        # Single source of truth for all classical Taals
└── README.md             # Project documentation and guide
```

---

## Audio Engine & Sound Playback

The engine features a dedicated, decoupled Web Audio API engine (`js/audio-engine.js`) utilizing two authentic, external sound recordings stored in the `Sounds/` directory:

| Sound Category | Audio File | Format & Specs | Applied To |
|:---|:---|:---|:---|
| **Sound1** | `Sounds/Sound1.wav` | 16-bit PCM WAV, 44.1 kHz, mono (~0.21s) | **Sam**, **Tali**, and **Khali** beats |
| **Sound2** | `Sounds/Sound2.wav` | 32-bit Float WAV, 44.1 kHz, mono (~0.23s) | **Ordinary / Normal** beats |

### Dynamic Sound Mapping Rules

All audio mapping is evaluated dynamically from the selected Taal's JSON metadata without hardcoded beat indices:
- **Sound1**: Triggered whenever the current beat represents `Sam` (`taal.sam === beatNumber`), `Tali` (`taal.tali.includes(beatNumber)`), or `Khali` (`taal.khali.includes(beatNumber)`).
- **Sound2**: Triggered for all other ordinary beats.
- **Multiple Markers**: If a beat possesses multiple special markers simultaneously (e.g., Beat 1 in Tintaal is both Sam and Tali), Sound1 is triggered **strictly once**. Both sounds are never played simultaneously on the same beat.
- **Missing Metadata Fallback**: If a Taal has incomplete or omitted metadata (e.g. `sam: null`, empty `tali`/`khali`, or `notation: null`), the engine safely defaults to Sound2 for all beats without error.

### Audio Scheduling & Metronome Synchronization

1. **Shared Beat Scheduler**:
   - `MetronomeEngine` and `AudioEngine` share the identical absolute timeline.
   - Audio events are scheduled at the exact hardware audio boundary (`AudioContext.currentTime`) synchronously within the scheduler tick.
   - Audio is **never delayed** behind visual `requestAnimationFrame()` paint callbacks.
2. **Web Audio Precision**:
   - Audio is preloaded and decoded into reusable `AudioBuffer`s.
   - Playback is triggered using `AudioBufferSourceNode` with `playbackRate = 1.0` to preserve original acoustic pitch.
   - Master volume is calibrated to **75%** (`GainNode = 0.75`).
3. **In-Flight Tempo Changes**:
   - Changing BPM during active playback applies the new interval at the next scheduled beat deadline without resetting the beat count, cycle count, or audio session.
4. **Immediate Stop (`STOP NOW`)**:
   - Immediately stops the metronome loop and calls `AudioEngine.stopAll()`, which iterates through all actively playing and queued `AudioBufferSourceNode` instances, calling `.stop(0)` and `.disconnect()` to produce instantaneous silence.
5. **Deferred Stop (`STOP AFTER CYCLE`)**:
   - Completes the ongoing Taal cycle, allowing the final beat's sample to ring out naturally, and terminates cleanly before Beat 1 of the subsequent cycle can be scheduled.
6. **Autoplay Restrictions & Resilience**:
   - AudioContext is activated / resumed strictly upon user interaction (Play button).
   - If audio assets fail to load or are unavailable, an informative notice is displayed in the diagnostic strip and playback does not falsely simulate active audio.

---

## How to Run the Application

Because the application uses modern asynchronous `fetch()` to load [`data/taals.json`](data/taals.json) and external audio files (`Sounds/Sound1.wav`, `Sounds/Sound2.wav`), serve the repository through a local HTTP server:

```bash
# Navigate to the workspace root
cd Tanmoy-Flute-Portfolio

# Start a local HTTP server
python -m http.server 8000
```

Then open in your browser:
- Main Website Module: `http://localhost:8000/tabla.html`
- Standalone Engine: `http://localhost:8000/tabla-taal-engine/index.html`

---

## Automated Verification Suite

Run the complete verification test suite in Node.js:

```bash
# Run audio engine & metronome unit checks (Test A through Test J)
node scratch/verify-audio-engine.js

# Run full DOM integration checks
node scratch/verify-integration.js
```
