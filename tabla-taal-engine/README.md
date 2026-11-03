# Tabla Taal Engine

A standalone, lightweight web application module providing **Metronome-based Tabla Beat Counting** and rhythm accompaniment for Hindustani classical music practice.

---

## Part 1 — Static User Interface

This repository houses **Part 1** of the Tabla Taal Engine. It implements the complete static visual interface, layout, typography, responsive hierarchy, and design tokens inspired by classical Indian acoustic instruments.

### Key Features (Part 1)
- **Classical Instrument Design**: Burgundy header banner, rich gold trims, vector Tabla illustration (Dayan & Bayan on velvet bira rings), and delicate mandala motifs.
- **Taal Selection Interface**: Expandable dropdown selector initially populated with 7 classical Taals:
  1. Tintaal (16 Beats)
  2. Dadra (6 Beats)
  3. Ektaal (12 Beats)
  4. Keharwa (8 Beats)
  5. Rupak (7 Beats)
  6. Jhaptaal (10 Beats)
  7. Deepchandi (14 Beats)
- **Tempo Control Interface**: Numeric input defaulting to 80 BPM, BPM unit badge, up/down stepper arrows, and `÷2` & `×2` tempo multiplier buttons.
- **Main Beat Grid**: 16-beat display grid (4×4 arrangement on desktop) featuring the exact Tintaal bols:
  `Dha, Dhin, Dhin, Dha, Dha, Dhin, Dhin, Dha, Na, Tin, Tin, Ta, Tete, Dhin, Dhin, Dha`.
- **Active Beat Highlighting**: Beat 1 (`01 Dha`) is visually accentuated with a warm golden highlight, amber accent border, and high contrast.
- **Playback Controls**:
  - Green `Play` action button in the control header.
  - Red `STOP NOW` button (immediate playback termination).
  - Slate Blue `STOP AFTER CYCLE` button (completion of the ongoing Taal cycle).
- **Responsive Architecture**: Fluid layout scaling across desktop, tablet, and mobile screens (360px, 390px, 430px) without horizontal scrolling.
- **Zero External Dependencies**: Pure HTML5, CSS3, and Vanilla JavaScript. Absolutely no frameworks or external library dependencies.

---

## Directory Structure

```text
tabla-taal-engine/
├── index.html            # Main standalone markup
├── css/
│   ├── style.css         # Design tokens, typography, component styles
│   └── responsive.css    # Responsive breakpoints (tablet, mobile, small screens)
├── js/
│   └── app.js            # Vanilla JS static UI controller & DOM references
├── data/
│   └── taals.json        # Structured JSON dataset for classical Taals
└── README.md             # Project documentation and run guide
```

---

## How to Run the Project Independently

The module is completely self-contained and requires no build tools or package managers.

### Option 1: Direct Browser Launch
Simply open `tabla-taal-engine/index.html` in any modern web browser (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge).

### Option 2: Local HTTP Server (Python)
If you prefer running via a local server:

```bash
# Navigate to the project directory
cd tabla-taal-engine

# Start a local static file server
python -m http.server 8000
```

Then visit in your browser:
```text
http://localhost:8000
```

---

## Upcoming Development Phases

The codebase is strictly structured for future modular expansion:
- **Part 2**: External JSON-based dynamic Taal loading, vibhag rendering, Sam (`X`), Tali (`2`, `3`), and Khali (`0`) metadata badges.
- **Part 3**: Metronome audio engine, Web Audio API synthesis / sample playback, precise BPM timing, and visual beat cursor progression.
- **Part 4**: Playback state machine, immediate stop, and graceful completion at cycle boundaries (`STOP AFTER CYCLE`).
- **Part 5**: Advanced practice features (speed trainer, layakaari, tehai calculator).
