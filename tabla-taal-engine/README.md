# Tabla Taal Engine

A standalone, lightweight web application module providing **Metronome-based Tabla Beat Counting** and rhythm accompaniment for Hindustani classical music practice.

---

## Part 2 — Taal Data Management & Dynamic Notation Engine

In **Part 2**, the application transitions from a static prototype to a **data-driven dynamic notation system**:
- **Single Source of Truth**: All Taal metadata, beat counts, vibhags, and bol sequences reside entirely in [`data/taals.json`](data/taals.json).
- **Dynamic Dropdown Selection**: The Taal dropdown selector is populated dynamically on load with the format `Name (N Beats)`.
- **Dynamic Beat Grid**: Beat cells (`01`, `02`, ...) are dynamically constructed based on the selected Taal's beat count.
- **Subdued Missing-Bol Placeholder**: For Taals where notation has not yet been supplied, the system renders the subdued placeholder `"Bol not supplied"`. No fabricated bols are ever displayed.
- **Strict Data Validation & Fault Isolation**: Enforces schema rules (unique IDs, non-empty names, positive beat counts, and strict invariant `notation.length === beats`). Malformed Taals are safely isolated with diagnostic logging without crashing the application.
- **Extensible Architecture**: Adding a new Taal to `data/taals.json` requires zero modifications to JavaScript or HTML.
- **Prepared Vibhag & Sam/Tali/Khali Metadata**: Every beat cell receives machine-readable data attributes (`data-vibhag`, `data-vibhag-start`, `data-vibhag-end`, `data-is-sam`, `data-is-tali`, `data-is-khali`) ready for future styling.
- **Strictly Non-Autonomous Playback**: Changing the Taal selection never triggers playback or metronome loops.

---

## Directory Structure

```text
tabla-taal-engine/
├── index.html            # Standalone semantic markup (no hardcoded options or beats)
├── css/
│   ├── style.css         # Design tokens, classical theme, dynamic cell & status styles
│   └── responsive.css    # Responsive grid and mobile layout adaptations
├── js/
│   ├── taal-loader.js    # Asynchronous JSON fetcher and schema validator
│   ├── taal-renderer.js  # Dynamic dropdown, beat cell, and notice renderer
│   └── app.js            # Main application controller and event coordinator
├── data/
│   └── taals.json        # Single source of truth for all classical Taals
└── README.md             # Project documentation and guide
```

---

## How to Run the Application

Because this application uses standard asynchronous `fetch()` to load [`data/taals.json`](data/taals.json), modern browsers enforce CORS security restrictions when opened directly via the `file://` protocol. 

Therefore, **the application should be served through a local HTTP server**:

### Option 1: Python HTTP Server (Recommended)
```bash
# Navigate to the project directory
cd tabla-taal-engine

# Start the local server
python -m http.server 8000
```
Then open your browser at:
```text
http://localhost:8000
```

### Option 2: Node.js (npx serve / http-server)
```bash
cd tabla-taal-engine
npx serve .
```

### Option 3: VS Code Live Server Extension
Right-click on `tabla-taal-engine/index.html` in VS Code and click **"Open with Live Server"**.

*(If opened via `file://`, the application will display a clear diagnostic notice advising you to start a local HTTP server rather than failing silently).*

---

## How to Edit and Add Taals

All Taal information is managed exclusively in [`data/taals.json`](data/taals.json).

### JSON Schema
```json
{
  "version": 1,
  "taals": [
    {
      "id": "tintaal",
      "name": "Tintaal",
      "beats": 16,
      "vibhags": [4, 4, 4, 4],
      "sam": 1,
      "tali": [1, 5, 13],
      "khali": [9],
      "notation": [
        "Dha", "Dhin", "Dhin", "Dha",
        "Dha", "Dhin", "Dhin", "Dha",
        "Na",  "Tin",  "Tin",  "Ta",
        "Tete", "Dhin", "Dhin", "Dha"
      ]
    }
  ]
}
```

### Adding a New Taal
To add a new Taal (e.g. *Chautaal — 12 Beats*), simply append an entry to the `taals` array:
```json
{
  "id": "chautaal",
  "name": "Chautaal",
  "beats": 12,
  "vibhags": [2, 2, 2, 2, 2, 2],
  "sam": 1,
  "tali": [1, 5, 9, 11],
  "khali": [3, 7],
  "notation": [
    "Dha", "Dha", "Dhin", "Ta", "Kit", "Dha", "Dhin", "Ta", "Tite", "Kata", "Gadi", "Gana"
  ]
}
```
If the notation is not yet finalized, set `"notation": null`:
```json
{
  "id": "chautaal",
  "name": "Chautaal",
  "beats": 12,
  "vibhags": null,
  "sam": null,
  "tali": [],
  "khali": [],
  "notation": null
}
```
Reload the browser, and the new Taal will automatically appear in the selector and render its beat cells with the subdued `"Bol not supplied"` placeholder.

---

## Validation Rules

1. **`id`**: Unique string across all Taals (e.g. `"tintaal"`).
2. **`name`**: Non-empty display string.
3. **`beats`**: Positive integer greater than zero.
4. **`notation`**: 
   - May be `null` (renders `"Bol not supplied"`).
   - If provided as an array, its length **must exactly equal** the declared `beats`. Mismatches trigger a validation error and isolation of the invalid entry.
5. **`vibhags`** *(Optional)*: Array of positive integers whose sum should match `beats`.
6. **`sam` / `tali` / `khali`** *(Optional)*: Valid beat numbers between `1` and `beats`.

---

## Roadmap

- **Part 1**: Static UI & Classical Aesthetics *(Completed)*
- **Part 2**: Taal Data Management & Dynamic Notation Engine *(Completed)*
- **Part 3**: Metronome Engine, Web Audio API synthesis / sample playback, precise BPM timing, and visual beat cursor progression
- **Part 4**: Playback state machine, immediate stop, and graceful completion at cycle boundaries (`STOP AFTER CYCLE`)
- **Part 5**: Advanced practice features (speed trainer, layakaari, tehai calculator)
