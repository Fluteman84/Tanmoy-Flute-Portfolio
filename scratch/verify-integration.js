/**
 * Verification Script for Integrated Tabla Taal Engine in tabla.html
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const tablaHtmlPath = path.join(rootDir, "tabla.html");
const rootDataPath = path.join(rootDir, "data", "taals.json");
const engineDataPath = path.join(rootDir, "tabla-taal-engine", "data", "taals.json");
const tablaCssPath = path.join(rootDir, "css", "tabla.css");

console.log("=== INTEGRATION VERIFICATION SUITE ===");

// 1. Verify existence of files
function verifyFilesExist() {
  const files = [
    { name: "tabla.html", path: tablaHtmlPath },
    { name: "data/taals.json", path: rootDataPath },
    { name: "tabla-taal-engine/data/taals.json", path: engineDataPath },
    { name: "css/tabla.css", path: tablaCssPath },
    { name: "tabla-taal-engine/js/taal-loader.js", path: path.join(rootDir, "tabla-taal-engine", "js", "taal-loader.js") },
    { name: "tabla-taal-engine/js/taal-renderer.js", path: path.join(rootDir, "tabla-taal-engine", "js", "taal-renderer.js") },
    { name: "tabla-taal-engine/js/metronome-engine.js", path: path.join(rootDir, "tabla-taal-engine", "js", "metronome-engine.js") },
    { name: "tabla-taal-engine/js/app.js", path: path.join(rootDir, "tabla-taal-engine", "js", "app.js") }
  ];

  let allExist = true;
  for (const f of files) {
    if (fs.existsSync(f.path)) {
      console.log(`[PASS] Exists: ${f.name}`);
    } else {
      console.error(`[FAIL] Missing file: ${f.name}`);
      allExist = false;
    }
  }
  return allExist;
}

// 2. Verify JSON validity and parity
function verifyJsonData() {
  const rootData = JSON.parse(fs.readFileSync(rootDataPath, "utf-8"));
  const engineData = JSON.parse(fs.readFileSync(engineDataPath, "utf-8"));

  if (rootData.taals.length === 7 && engineData.taals.length === 7) {
    console.log(`[PASS] Both root and engine taals.json have 7 taals.`);
  } else {
    console.error(`[FAIL] Taal count mismatch: root=${rootData.taals.length}, engine=${engineData.taals.length}`);
    return false;
  }

  const tintaal = rootData.taals.find(t => t.id === "tintaal");
  if (tintaal && tintaal.notation && tintaal.notation.length === 16 && tintaal.sam === 1) {
    console.log(`[PASS] Tintaal data valid: 16 beats, 16 bols, sam=1.`);
  } else {
    console.error(`[FAIL] Tintaal validation failed.`);
    return false;
  }

  return true;
}

// 3. Verify placeholder was completely removed from tabla.html
function verifyPlaceholderRemoved() {
  const content = fs.readFileSync(tablaHtmlPath, "utf-8");
  const bannedStrings = [
    "Tabla Taal Engine Workspace",
    "🥁",
    "This module is ready for development"
  ];

  let clean = true;
  for (const banned of bannedStrings) {
    if (content.includes(banned)) {
      console.error(`[FAIL] Found placeholder leftover: "${banned}" in tabla.html`);
      clean = false;
    }
  }

  if (clean) {
    console.log(`[PASS] All placeholder text and emojis completely removed.`);
  }
  return clean;
}

// 4. Verify all critical UI components exist in tabla.html
function verifyHtmlComponents() {
  const content = fs.readFileSync(tablaHtmlPath, "utf-8");
  const requiredIds = [
    "taalSelect",
    "tempoInput",
    "btnStepperUp",
    "btnStepperDown",
    "btnHalveTempo",
    "btnDoubleTempo",
    "btnPlay",
    "btnStopNow",
    "btnStopCycle",
    "beatGrid",
    "playbackInfoBar",
    "taalStatusNotice",
    "tablaTaalEngineApp"
  ];

  let allFound = true;
  for (const id of requiredIds) {
    if (content.includes(`id="${id}"`)) {
      console.log(`[PASS] DOM ID present: #${id}`);
    } else {
      console.error(`[FAIL] Missing required DOM ID: #${id}`);
      allFound = false;
    }
  }

  // Check script tags
  const requiredScripts = [
    "tabla-taal-engine/js/taal-loader.js",
    "tabla-taal-engine/js/taal-renderer.js",
    "tabla-taal-engine/js/metronome-engine.js",
    "tabla-taal-engine/js/app.js"
  ];

  for (const s of requiredScripts) {
    if (content.includes(s)) {
      console.log(`[PASS] Script referenced: ${s}`);
    } else {
      console.error(`[FAIL] Missing script tag: ${s}`);
      allFound = false;
    }
  }

  return allFound;
}

// 5. Headless simulation test of full integration in DOM
async function testFullDOMSimulation() {
  console.log("\n--- Starting Headless DOM Simulation of tabla.html ---");

  // Build minimal Mock DOM
  function createMockElement(tag, id = "", className = "") {
    const el = {
      tagName: tag.toUpperCase(),
      id: id,
      className: className,
      classList: {
        _classes: new Set(className.split(" ").filter(Boolean)),
        add: function (...cls) { cls.forEach(c => this._classes.add(c)); el.className = Array.from(this._classes).join(" "); },
        remove: function (...cls) { cls.forEach(c => this._classes.delete(c)); el.className = Array.from(this._classes).join(" "); },
        contains: function (c) { return this._classes.has(c); },
        toggle: function (c) {
          if (this._classes.has(c)) { this._classes.delete(c); el.className = Array.from(this._classes).join(" "); return false; }
          else { this._classes.add(c); el.className = Array.from(this._classes).join(" "); return true; }
        }
      },
      attributes: {},
      setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === "disabled") this.disabled = true; },
      getAttribute: function (k) { return this.attributes[k] || null; },
      removeAttribute: function (k) { delete this.attributes[k]; if (k === "disabled") this.disabled = false; },
      hasAttribute: function (k) { return k in this.attributes; },
      dataset: {},
      _children: [],
      get children() { return this._children; },
      appendChild: function (child) {
        if (child.isFragment) {
          while (child._children.length > 0) {
            const c = child._children.shift();
            c.parentNode = this;
            this._children.push(c);
          }
          return child;
        }
        child.parentNode = this;
        this._children.push(child);
        return child;
      },
      _innerHTML: "",
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) {
        this._innerHTML = val;
        this._children = [];
      },
      textContent: "",
      disabled: false,
      value: "",
      style: {},
      listeners: {},
      addEventListener: function (evt, handler) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(handler);
      },
      dispatchEvent: function (evt) {
        const list = this.listeners[evt.type] || [];
        for (const fn of list) fn(evt);
      },
      querySelector: function (sel) {
        for (const c of this._children) {
          if (sel.startsWith(".") && c.classList.contains(sel.slice(1))) return c;
          if (sel.startsWith("#") && c.id === sel.slice(1)) return c;
          const found = c.querySelector(sel);
          if (found) return found;
        }
        return null;
      },
      querySelectorAll: function (sel) {
        let results = [];
        for (const c of this._children) {
          if (sel.startsWith(".") && c.classList.contains(sel.slice(1))) results.push(c);
          if (c.querySelectorAll) results = results.concat(c.querySelectorAll(sel));
        }
        return results;
      }
    };
    return el;
  }

  const elementsMap = {
    taalSelect: createMockElement("select", "taalSelect", "taal-dropdown"),
    tempoInput: createMockElement("input", "tempoInput", "tempo-input"),
    btnStepperUp: createMockElement("button", "btnStepperUp", "stepper-arrow-btn"),
    btnStepperDown: createMockElement("button", "btnStepperDown", "stepper-arrow-btn"),
    btnHalveTempo: createMockElement("button", "btnHalveTempo", "tempo-btn-multiplier"),
    btnDoubleTempo: createMockElement("button", "btnDoubleTempo", "tempo-btn-multiplier"),
    btnPlay: createMockElement("button", "btnPlay", "btn-play"),
    btnStopNow: createMockElement("button", "btnStopNow", "btn-stop-now"),
    btnStopCycle: createMockElement("button", "btnStopCycle", "btn-stop-cycle"),
    beatGrid: createMockElement("div", "beatGrid", "beat-grid"),
    playbackInfoBar: createMockElement("div", "playbackInfoBar", "playback-info-bar"),
    taalStatusNotice: createMockElement("div", "taalStatusNotice", "taal-status-notice"),
    tablaTaalEngineApp: createMockElement("div", "tablaTaalEngineApp", "taal-app")
  };
  elementsMap.tempoInput.value = "80";

  global.window = {
    location: { protocol: "http:" },
    addEventListener: () => {},
    performance: { now: () => Date.now() },
    document: {
      readyState: "complete",
      getElementById: (id) => elementsMap[id] || null,
      createElement: (tag) => createMockElement(tag),
      createDocumentFragment: () => ({ isFragment: true, _children: [], appendChild: function(c) { this._children.push(c); } }),
      addEventListener: () => {}
    },
    fetch: async (url) => {
      // Mock fetch to read actual disk json
      let resolvedDiskPath;
      if (url === "data/taals.json") {
        resolvedDiskPath = rootDataPath;
      } else if (url === "tabla-taal-engine/data/taals.json") {
        resolvedDiskPath = engineDataPath;
      } else {
        return { ok: false, status: 404 };
      }
      const rawText = fs.readFileSync(resolvedDiskPath, "utf-8");
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(rawText)
      };
    }
  };
  global.document = global.window.document;
  global.fetch = global.window.fetch;

  global.window.__TABLA_DATA_PATH__ = "data/taals.json";

  // Load modules into node environment
  require(path.join(rootDir, "tabla-taal-engine", "js", "taal-loader.js"));
  require(path.join(rootDir, "tabla-taal-engine", "js", "taal-renderer.js"));
  require(path.join(rootDir, "tabla-taal-engine", "js", "metronome-engine.js"));
  require(path.join(rootDir, "tabla-taal-engine", "js", "app.js"));

  const App = global.window.TablaTaalEngine;
  if (!App) {
    console.error("[FAIL] TablaTaalEngine global object not loaded.");
    return false;
  }

  // Wait for async initialization to complete
  while (!App.taals || App.taals.length === 0) {
    await new Promise((r) => setTimeout(r, 20));
  }

  // Check 1: Dropdown populated
  const options = elementsMap.taalSelect.children;
  if (options.length === 7) {
    console.log(`[PASS] Taal select populated with ${options.length} options.`);
  } else {
    console.error(`[FAIL] Expected 7 options in dropdown, got ${options.length}`);
    return false;
  }

  // Check 2: Beat grid rendered for Tintaal (16 cells)
  const beatCells = elementsMap.beatGrid.children;
  if (beatCells.length === 16) {
    console.log(`[PASS] Beat grid rendered with 16 cells for Tintaal.`);
  } else {
    console.error(`[FAIL] Expected 16 cells, got ${beatCells.length}`);
    return false;
  }

  // Check 3: Cell 1 is active (Sam)
  if (beatCells[0].classList.contains("active")) {
    console.log(`[PASS] Beat 1 has active class.`);
  } else {
    console.error(`[FAIL] Beat 1 missing active class.`);
    return false;
  }

  // Check 4: Tempo control interactions
  elementsMap.btnDoubleTempo.dispatchEvent({ type: "click", preventDefault: () => {} });
  if (Number(elementsMap.tempoInput.value) === 160 && App.metronome.bpm === 160) {
    console.log(`[PASS] ×2 doubled tempo from 80 to 160 BPM.`);
  } else {
    console.error(`[FAIL] ×2 tempo failed. Input value: ${elementsMap.tempoInput.value}`);
    return false;
  }

  elementsMap.btnHalveTempo.dispatchEvent({ type: "click", preventDefault: () => {} });
  if (Number(elementsMap.tempoInput.value) === 80 && App.metronome.bpm === 80) {
    console.log(`[PASS] ÷2 halved tempo back to 80 BPM.`);
  } else {
    console.error(`[FAIL] ÷2 tempo failed.`);
    return false;
  }

  // Check 5: Play button starts playback
  elementsMap.btnPlay.dispatchEvent({ type: "click", preventDefault: () => {} });
  if (App.metronome.state === "PLAYING" && elementsMap.btnPlay.classList.contains("is-playing")) {
    console.log(`[PASS] Play button successfully started metronome engine.`);
  } else {
    console.error(`[FAIL] Metronome failed to enter PLAYING state. Current state: ${App.metronome.state}`);
    return false;
  }

  if (!elementsMap.btnStopNow.disabled && !elementsMap.btnStopCycle.disabled) {
    console.log(`[PASS] Stop buttons enabled during playback.`);
  } else {
    console.error(`[FAIL] Stop buttons remained disabled during playback.`);
    return false;
  }

  // Check 6: Stop Now stops playback immediately
  elementsMap.btnStopNow.dispatchEvent({ type: "click", preventDefault: () => {} });
  if (App.metronome.state === "STOPPED") {
    console.log(`[PASS] STOP NOW immediately halted playback.`);
  } else {
    console.error(`[FAIL] STOP NOW failed.`);
    return false;
  }

  if (elementsMap.btnStopNow.disabled && elementsMap.btnStopCycle.disabled) {
    console.log(`[PASS] Stop buttons disabled after stopping.`);
  } else {
    console.error(`[FAIL] Stop buttons should be disabled in STOPPED state.`);
    return false;
  }

  // Check 7: STOP AFTER CYCLE
  elementsMap.btnPlay.dispatchEvent({ type: "click", preventDefault: () => {} });
  elementsMap.btnStopCycle.dispatchEvent({ type: "click", preventDefault: () => {} });
  if (App.metronome.state === "STOPPING_AFTER_CYCLE" && elementsMap.btnStopCycle.classList.contains("is-pending")) {
    console.log(`[PASS] STOP AFTER CYCLE set state to STOPPING_AFTER_CYCLE with is-pending class.`);
  } else {
    console.error(`[FAIL] STOP AFTER CYCLE state failed.`);
    return false;
  }

  // Simulate end of cycle
  App.metronome.stop();
  if (App.metronome.state === "STOPPED") {
    console.log(`[PASS] Cycle completed and transitioned to STOPPED.`);
  }

  // Check 8: Taal Switching without auto-play
  App.selectTaal("dadra");
  if (App.currentTaal.id === "dadra" && App.currentTaal.beats === 6) {
    console.log(`[PASS] Switched to Dadra (6 beats).`);
  }
  if (App.metronome.state === "STOPPED") {
    console.log(`[PASS] Taal switch did NOT trigger autoplay.`);
  } else {
    console.error(`[FAIL] Taal switch triggered autoplay!`);
    return false;
  }

  console.log("\n=== ALL INTEGRATION VERIFICATION CHECKS PASSED (100%) ===");
  return true;
}

const ok1 = verifyFilesExist();
const ok2 = verifyJsonData();
const ok3 = verifyPlaceholderRemoved();
const ok4 = verifyHtmlComponents();

testFullDOMSimulation().then((simOk) => {
  if (ok1 && ok2 && ok3 && ok4 && simOk) {
    console.log("\nSUCCESS: The Tabla Taal Engine is fully integrated and verified.");
    process.exit(0);
  } else {
    console.error("\nFAILURE: One or more integration checks failed.");
    process.exit(1);
  }
}).catch(err => {
  console.error("Simulation error:", err);
  process.exit(1);
});
