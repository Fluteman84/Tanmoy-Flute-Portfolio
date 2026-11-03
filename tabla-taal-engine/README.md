# Tabla Taal Engine

A standalone, lightweight web application module providing **Visual Metronome-based Tabla Beat Counting** and rhythm accompaniment for Hindustani classical music practice.

> **Strict Audio Policy:** The engine is purely a **visual metronome**. It produces zero sound, zero metronome clicks, and plays no audio samples.

---

## Combined Development Phase (Parts 3, 4, 5)

This release completes the visual Tabla beat-counting engine, combining:
- **Part 3**: High-resolution, drift-resistant metronome timing engine.
- **Part 4**: Comprehensive playback state management (Manual Play, STOP NOW, STOP AFTER CYCLE, in-flight tempo changes).
- **Part 5**: Advanced classical Tabla practice features (Sam, Tali, Khali markers, Vibhag boundary separation, live cycle counter, and playback metrics bar).

---

## Directory Structure & Modular Architecture

```text
tabla-taal-engine/
├── index.html            # Standalone semantic markup with live info bar
├── css/
│   ├── style.css         # Design tokens, classical theme, markers, active states
│   └── responsive.css    # Fluid layout scaling (desktop, tablet, 430px, 390px, 360px)
├── js/
│   ├── taal-loader.js    # Asynchronous JSON fetcher and strict schema validator
│   ├── taal-renderer.js  # Dynamic dropdown, beat grid, Sam/Tali/Khali badges, live bar
│   ├── metronome-engine.js # Monotonic timing engine, state machine, background tab recovery
│   └── app.js            # Main application coordinator, event binding, and public API
├── data/
│   └── taals.json        # Single source of truth for all classical Taals
└── README.md             # Project documentation and guide
```

---

## Timing Architecture (Part 3)

1. **Monotonic Clock**:
   - Timing calculations are anchored to `performance.now()`, eliminating system wall-clock jitter.
   - Beat intervals are calculated strictly by:
     $$\text{Interval (ms)} = \frac{60{,}000}{\text{BPM}}$$
2. **Drift-Resistant Deadline Scheduling**:
   - Rather than relying on simple `setInterval()`, the engine maintains an absolute expected timestamp for each beat deadline:
     $$\text{ExpectedTime}_{k+1} = \text{TimelineStart} + (k + 1) \times \text{Interval}$$
   - Scheduled via adaptive `setTimeout()` deadlines with sub-millisecond precision.
3. **Decoupled Visual Rendering**:
   - State progression is computed on monotonic ticks, while DOM updates are dispatched cleanly through `requestAnimationFrame()`.
4. **Background Tab Synchronization**:
   - Listens to the `visibilitychange` event. When the user returns from a background tab, the engine calculates the exact logical beat position from elapsed monotonic time and updates the visual state once without bursting through missed callbacks.

---

## Playback State Management (Part 4)

The engine enforces three discrete playback states:
- `STOPPED`: Idle state. Beat position at Beat 1, cycle at 1. Play button is enabled; STOP NOW and STOP AFTER CYCLE buttons are inactive.
- `PLAYING`: Metronome actively progressing. Play button reflects active state without creating duplicate loops. Both stop buttons are fully active.
- `STOPPING_AFTER_CYCLE`: Triggered when the user requests a graceful stop. The engine continues until the final beat of the ongoing cycle, then terminates cleanly before Beat 1 of the next cycle can run.

### In-Flight Tempo Adjustments
- Changing the tempo via numeric input (20–300 BPM), `÷2`, or `×2` while playback is active **does not reset the current beat or cycle**, and **does not restart playback**.
- The new interval is applied seamlessly at the very next beat boundary by re-anchoring the monotonic timeline.

### Safe Taal Switching
- Selecting a different Taal while playback is active terminates the previous session immediately, invalidates all pending timers, resets the beat counter, loads the new Taal, and remains in the `STOPPED` state. The BPM setting is preserved.

---

## Advanced Practice Features (Part 5)

1. **Sam (`SAM (X)`)**:
   - Prominently marks the principal starting beat (`taal.sam`) with a royal burgundy and gold-trimmed badge.
2. **Tali (`TALI`)**:
   - Visual clap positions (`taal.tali`) are badged with warm amber markers.
3. **Khali (`KHALI (0)`)**:
   - Empty/wave beats (`taal.khali`) are clearly identified with cool slate-blue markers.
4. **Vibhag Boundaries**:
   - Subtly accents section boundaries (`.vibhag-boundary-end`) dynamically based on `taal.vibhags` without hardcoding.
5. **Cycle Counter & Live Playback Bar**:
   - Displays real-time metrics: Current Taal, Tempo BPM, Beat progress (`BEAT 07 / 16`), Vibhag (`VIBHAG 2 / 4`), Cycle number (`CYCLE 03`), and live status pill.
   - Cycle count resets to `01` when stopped.

---

## How to Run the Application

Because this application uses standard asynchronous `fetch()` to load [`data/taals.json`](data/taals.json), modern browsers enforce CORS security restrictions when opened directly via the `file://` protocol. 

Therefore, **serve the application through a local HTTP server**:

```bash
# Navigate to the project directory
cd tabla-taal-engine

# Start the local server
python -m http.server 8000
```
Then visit:
```text
http://localhost:8000
```

---

## Validation & JSON Editing

Taal metadata is stored exclusively in [`data/taals.json`](data/taals.json).

To add a new Taal, add an entry to the `taals` array:
```json
{
  "id": "rupak",
  "name": "Rupak",
  "beats": 7,
  "vibhags": [3, 2, 2],
  "sam": 4,
  "tali": [4, 6],
  "khali": [1],
  "notation": null
}
```
- If notation is not yet supplied, keep `"notation": null`. The engine will render the subdued placeholder `"Bol not supplied"`.
- If notation is provided, its length must **strictly match** the declared `beats`.
