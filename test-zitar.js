/**
 * Comprehensive Automated QA & Regression Test Suite
 * Tests Groups A, B, C, D, E, F
 */
const fs = require("fs");
const path = require("path");

const ZitarData = require("./js/zitar-data.js");
const ZitarApp = require("./js/zitar-app.js");

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
  } catch (err) {
    failedTests.push({ name, error: err.message, stack: err.stack });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error("Assertion failed: " + message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message || "Mismatch") + "\nExpected: " + JSON.stringify(expected) + "\nActual:   " + JSON.stringify(actual)
    );
  }
}

console.log("=== RUNNING ZITAR TONE REFERENCE QA SUITE ===\n");

// -------------------------------------------------------------
// TEST GROUP A: EXISTING WEBSITE INTEGRITY & REGRESSION
// -------------------------------------------------------------
test("Group A1: index.html exists, has menuToggle and links to zitar.html", () => {
  const content = fs.readFileSync("index.html", "utf-8");
  assert(content.includes("TANMOY"), "index.html brand exists");
  assert(content.includes('id="toolsDropdown"'), "index.html toolsDropdown exists");
  assert(content.includes('id="menuToggle"'), "index.html menuToggle exists");
  assert(content.includes('href="zitar.html"'), "index.html links to zitar.html");
  assert(content.includes("Zitar Tone Reference"), "index.html includes Zitar Tone Reference label");
});

test("Group A2: notes.html exists, has tools navigation and links to zitar.html", () => {
  const content = fs.readFileSync("notes.html", "utf-8");
  assert(content.includes('id="toolsDropdown"'), "notes.html toolsDropdown exists");
  assert(content.includes("Back to Stage"), "notes.html Back to Stage exists");
  assert(content.includes('href="zitar.html"'), "notes.html links to zitar.html");
  assert(content.includes("Zitar Tone Reference"), "notes.html includes Zitar Tone Reference label");
});

test("Group A3: notation.html exists, has tools navigation and links to zitar.html", () => {
  const content = fs.readFileSync("notation.html", "utf-8");
  assert(content.includes('id="toolsDropdown"'), "notation.html toolsDropdown exists");
  assert(content.includes("Back to Stage"), "notation.html Back to Stage exists");
  assert(content.includes('href="zitar.html"'), "notation.html links to zitar.html");
  assert(content.includes("Zitar Tone Reference"), "notation.html includes Zitar Tone Reference label");
});

test("Group A4: tabla.html exists, has tools navigation and links to zitar.html", () => {
  const content = fs.readFileSync("tabla.html", "utf-8");
  assert(content.includes('id="toolsDropdown"'), "tabla.html toolsDropdown exists");
  assert(content.includes("Back to Stage"), "tabla.html Back to Stage exists");
  assert(content.includes('href="zitar.html"'), "tabla.html links to zitar.html");
  assert(content.includes("Zitar Tone Reference"), "tabla.html includes Zitar Tone Reference label");
});

test("Group A5: Palta generator automated tests pass without regression", () => {
  global.window = global;
  require("./js/palta-generator.js");
  const paltaGen = global.PaltaGenerator;
  assert(paltaGen && paltaGen.PALTAS.length === 8, "Palta presets intact");
  const row1 = paltaGen.generateAscending(paltaGen.PALTAS[0])[0];
  assertEqual(row1, "SRG SRG SR SRGM MGRS", "Palta 1 row 1 aroha");
});

// -------------------------------------------------------------
// TEST GROUP B: AMPLIFIER SELECTION & ARCHITECTURE
// -------------------------------------------------------------
test("Group B1: Gretex GT-15FX appears in the amplifier registry", () => {
  assert(ZitarData.AMPLIFIERS.gretexGT15FX, "gretexGT15FX in registry");
  assertEqual(ZitarData.AMPLIFIERS.gretexGT15FX.name, "Gretex GT-15FX", "Amp name matches");
});

test("Group B2: Exactly 9 controls defined for Gretex GT-15FX", () => {
  const controls = ZitarData.AMPLIFIERS.gretexGT15FX.controls;
  assertEqual(controls.length, 9, "9 controls required");
  const keys = controls.map((c) => c.key);
  assertEqual(
    keys.join(","),
    "masterVolume,overdrive,gain,overdriveVolume,treble,mid,bass,reverb,reverbAmount",
    "Exact control keys order"
  );
});

test("Group B3: Extensible architecture supports adding another amp without breaking", () => {
  const mockAmp = {
    id: "fenderChampion20",
    name: "Fender Champion 20",
    controls: [{ key: "volume", label: "Volume", type: "dial" }],
    presets: [{ id: 1, patchNumber: "01", name: "Mock Preset", settings: { volume: "12:00" } }]
  };
  ZitarData.AMPLIFIERS["fenderChampion20"] = mockAmp;
  assert(ZitarData.AMPLIFIERS["fenderChampion20"], "Can register another amplifier");
  const p = ZitarData.getPresetById(1, "fenderChampion20");
  assertEqual(p.name, "Mock Preset", "Can retrieve preset from new amplifier");
  delete ZitarData.AMPLIFIERS["fenderChampion20"];
});

// -------------------------------------------------------------
// TEST GROUP C: PATCH LIBRARY (20 PRESETS)
// -------------------------------------------------------------
const presets = ZitarData.AMPLIFIERS.gretexGT15FX.presets;

test("Group C1: Exactly 20 master presets present", () => {
  assertEqual(presets.length, 20, "Must be exactly 20 presets");
});

test("Group C2: All preset numbers and IDs are correct and sequential 01-20", () => {
  presets.forEach((p, index) => {
    const expectedId = index + 1;
    const expectedNum = (expectedId < 10 ? "0" : "") + expectedId;
    assertEqual(p.id, expectedId, `Preset index ${index} id`);
    assertEqual(p.patchNumber, expectedNum, `Preset index ${index} patchNumber`);
  });
});

test("Group C3: All 20 preset names match master list", () => {
  const expectedNames = [
    "Classical Clean Zitar",
    "Fusion Zitar – Niladri Kumar-inspired",
    "Deep Alap Tone",
    "Metallic Bright Sitar",
    "Vintage Warm Tone",
    "Meditative Drone Tone",
    "Ambient Zitar",
    "Cinematic Lead",
    "Dreamy Soft Tone",
    "Sustained Lead Character",
    "Rock Zitar",
    "Singing Blues Lead",
    "High-Gain Fusion",
    "Classic Crunch",
    "Dark Distorted Zitar",
    "Telephone / Radio Zitar",
    "Hollow / Thin Zitar",
    "Thick Midrange Zitar",
    "Bright Percussive Zitar",
    "Warm Overdriven Fusion"
  ];
  presets.forEach((p, i) => {
    assertEqual(p.name, expectedNames[i], `Preset ${i + 1} name`);
  });
});

test("Group C4: Preset categories match 4 master categories", () => {
  for (let i = 0; i < 6; i++) {
    assertEqual(presets[i].category, "Classical and Indian Music", `Preset ${i + 1} category`);
  }
  for (let i = 6; i < 10; i++) {
    assertEqual(presets[i].category, "Cinematic and Atmospheric", `Preset ${i + 1} category`);
  }
  for (let i = 10; i < 15; i++) {
    assertEqual(presets[i].category, "Rock and Fusion", `Preset ${i + 1} category`);
  }
  for (let i = 15; i < 20; i++) {
    assertEqual(presets[i].category, "Experimental and Special-Purpose", `Preset ${i + 1} category`);
  }
});

test("Group C5: Search by patch name, category, character, application", () => {
  let res = ZitarData.searchPresets("Deep Alap Tone");
  assertEqual(res.length, 1, "Search Deep Alap Tone");
  assertEqual(res[0].id, 3, "Matched ID 3");

  res = ZitarData.searchPresets("Cinematic");
  assertEqual(res.length, 4, "Category B count (7, 8, 9, 10)");

  res = ZitarData.searchPresets("crunchy");
  assertEqual(res.length, 1, "Character crunchy finds Rock Zitar");
  assertEqual(res[0].id, 11, "Matched ID 11");

  res = ZitarData.searchPresets("fast taans");
  assertEqual(res.length, 1, "Application fast taans");
  assertEqual(res[0].id, 1, "Matched ID 1");

  res = ZitarData.searchPresets("invalid_nonexistent_search");
  assertEqual(res.length, 0, "No results for gibberish query");

  res = ZitarData.searchPresets("");
  assertEqual(res.length, 20, "Empty query returns all 20");
});

// -------------------------------------------------------------
// TEST GROUP D: KNOB ACCURACY ACROSS ALL 20 PRESETS
// -------------------------------------------------------------
test("Group D1: Every preset settings object has all 9 controls", () => {
  presets.forEach((p) => {
    const s = p.settings;
    assert(s !== undefined && s !== null, `Preset ${p.id} settings exists`);
    assert("masterVolume" in s, `Preset ${p.id} has masterVolume`);
    assert("overdrive" in s, `Preset ${p.id} has overdrive`);
    assert("gain" in s, `Preset ${p.id} has gain`);
    assert("overdriveVolume" in s, `Preset ${p.id} has overdriveVolume`);
    assert("treble" in s, `Preset ${p.id} has treble`);
    assert("mid" in s, `Preset ${p.id} has mid`);
    assert("bass" in s, `Preset ${p.id} has bass`);
    assert("reverb" in s, `Preset ${p.id} has reverb`);
    assert("reverbAmount" in s, `Preset ${p.id} has reverbAmount`);
  });
});

test("Group D2: Overdrive OFF presets strictly have null gain and overdriveVolume", () => {
  const odOffPresets = presets.filter((p) => !p.settings.overdrive);
  assertEqual(odOffPresets.length, 12, "12 Clean presets (OD off)");
  odOffPresets.forEach((p) => {
    assertEqual(p.settings.gain, null, `Preset ${p.id} gain must be null`);
    assertEqual(p.settings.overdriveVolume, null, `Preset ${p.id} OD volume must be null`);
  });
});

test("Group D3: Overdrive ON presets strictly have non-null string gain and overdriveVolume", () => {
  const odOnPresets = presets.filter((p) => p.settings.overdrive);
  assertEqual(odOnPresets.length, 8, "8 Overdrive presets (OD on)");
  odOnPresets.forEach((p) => {
    assert(typeof p.settings.gain === "string", `Preset ${p.id} gain must be string`);
    assert(typeof p.settings.overdriveVolume === "string", `Preset ${p.id} OD vol must be string`);
  });
});

test("Group D4: Reverb OFF presets strictly have null reverbAmount", () => {
  const revOffPresets = presets.filter((p) => !p.settings.reverb);
  assertEqual(revOffPresets.length, 2, "Presets 16 & 19 have reverb OFF");
  revOffPresets.forEach((p) => {
    assertEqual(p.settings.reverbAmount, null, `Preset ${p.id} reverbAmount must be null`);
    assert(p.id === 16 || p.id === 19, `Only Presets 16 & 19 have reverb OFF`);
  });
});

test("Group D5: Reverb ON presets strictly have non-null string reverbAmount", () => {
  const revOnPresets = presets.filter((p) => p.settings.reverb);
  assertEqual(revOnPresets.length, 18, "18 presets have reverb ON");
  revOnPresets.forEach((p) => {
    assert(typeof p.settings.reverbAmount === "string", `Preset ${p.id} reverbAmount is string`);
  });
});

test("Group D6: Clock angle conversion verification for all preset dials", () => {
  presets.forEach((p) => {
    const s = p.settings;
    const mvDeg = ZitarData.parseClockToDegrees(s.masterVolume);
    assert(mvDeg !== null && !isNaN(mvDeg), `Preset ${p.id} masterVolume valid angle (${mvDeg})`);

    ["treble", "mid", "bass"].forEach((ctrl) => {
      const deg = ZitarData.parseClockToDegrees(s[ctrl]);
      assert(deg !== null && !isNaN(deg), `Preset ${p.id} ${ctrl} valid angle (${deg})`);
    });

    if (s.overdrive) {
      const gDeg = ZitarData.parseClockToDegrees(s.gain);
      assert(gDeg !== null && !isNaN(gDeg), `Preset ${p.id} gain angle (${gDeg})`);
      const odvDeg = ZitarData.parseClockToDegrees(s.overdriveVolume);
      assert(odvDeg !== null && !isNaN(odvDeg), `Preset ${p.id} OD volume angle (${odvDeg})`);
    }

    if (s.reverb) {
      const rDeg = ZitarData.parseClockToDegrees(s.reverbAmount);
      assert(rDeg !== null && !isNaN(rDeg), `Preset ${p.id} reverb amount angle (${rDeg})`);
    }
  });
});

test("Group D7: Range midpoint preservation in parseClockToDegrees", () => {
  assertEqual(ZitarData.parseClockToDegrees("10–11 o'clock"), -45, "10–11 midpoint");
  assertEqual(ZitarData.parseClockToDegrees("9–10 o'clock"), -75, "9–10 midpoint");
});

// -------------------------------------------------------------
// TEST GROUP E: HTML STRUCTURE & INTEGRATION
// -------------------------------------------------------------
test("Group E1: zitar.html exists and is well-formed", () => {
  const html = fs.readFileSync("zitar.html", "utf-8");
  assert(html.includes("<!DOCTYPE html>"), "Has DOCTYPE");
  assert(html.includes('<title>Zitar Tone Reference | Tanmoy Flute</title>'), "Has Title");
  assert(html.includes('class="notes-page zitar-page"'), "Has notes-page zitar-page body classes");
  assert(html.includes('id="toolsDropdown"'), "Has toolsDropdown");
  assert(html.includes('id="toolsToggle"'), "Has toolsToggle");
  assert(html.includes('class="notes-back-link"'), "Has notes-back-link");
});

test("Group E2: zitar.html contains all required IDs for ZitarApp", () => {
  const html = fs.readFileSync("zitar.html", "utf-8");
  const requiredIds = [
    "ampSelect",
    "patchSearchInput",
    "searchClearBtn",
    "patchSelect",
    "patchRibbon",
    "noPatchesNotice",
    "infoPatchNumber",
    "infoPatchName",
    "infoCategory",
    "infoCharacter",
    "infoDescription",
    "infoApplicationsList",
    "infoTechniquesList",
    "infoNoteBox",
    "infoNoteText",
    "ampControlPanel"
  ];
  requiredIds.forEach((id) => {
    assert(html.includes(`id="${id}"`), `zitar.html must contain id="${id}"`);
  });
});

test("Group E3: No duplicate IDs in zitar.html", () => {
  const html = fs.readFileSync("zitar.html", "utf-8");
  const idRegex = /id=["']([^"']+)["']/g;
  const ids = [];
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  const seen = new Set();
  const dupes = [];
  ids.forEach((id) => {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  });
  assertEqual(dupes.length, 0, "No duplicate IDs found: " + dupes.join(", "));
});

test("Group E4: All stylesheets referenced in zitar.html exist on disk", () => {
  const html = fs.readFileSync("zitar.html", "utf-8");
  const cssRegex = /href=["'](css\/[^"']+\.css)["']/g;
  let match;
  while ((match = cssRegex.exec(html)) !== null) {
    const cssPath = match[1];
    assert(fs.existsSync(cssPath), `Stylesheet ${cssPath} must exist on disk`);
  }
});

test("Group E5: All scripts referenced in zitar.html exist on disk", () => {
  const html = fs.readFileSync("zitar.html", "utf-8");
  const jsRegex = /src=["'](js\/[^"']+\.js)["']/g;
  let match;
  while ((match = jsRegex.exec(html)) !== null) {
    const jsPath = match[1];
    assert(fs.existsSync(jsPath), `Script ${jsPath} must exist on disk`);
  }
});

// -------------------------------------------------------------
// TEST GROUP F: CSS VALIDITY & NON-CONFLICT
// -------------------------------------------------------------
test("Group F1: css/zitar.css exists and has responsive rules", () => {
  const css = fs.readFileSync("css/zitar.css", "utf-8");
  assert(css.includes(".amp-control-panel"), "amp-control-panel in css");
  assert(css.includes(".digital-dial"), "digital-dial in css");
  assert(css.includes(".digital-switch"), "digital-switch in css");
  assert(css.includes("@media (max-width: 640px)"), "Has <=640px mobile media query");
  assert(css.includes("@media (max-width: 440px)"), "Has <=440px mobile media query");
});

test("Group F2: Controls are display-only (pointer-events: none on dials and switches)", () => {
  const css = fs.readFileSync("css/zitar.css", "utf-8");
  assert(css.includes("pointer-events: none; /* Strictly Display-Only"), "Strictly non-interactive dials & switches");
});

// -------------------------------------------------------------
// TEST GROUP G: SIMULATED DOM INTEGRATION
// -------------------------------------------------------------
test("Group G1: Full simulated DOM lifecycle runs without runtime errors", () => {
  const doc = {
    elementsById: {},
    getElementById(id) { return this.elementsById[id] || null; },
    createElement(tag) { return createMockEl(tag); }
  };

  function createMockEl(tag, id = "", className = "") {
    const el = {
      tagName: tag.toUpperCase(),
      id: id,
      _className: className,
      get className() { return this._className; },
      set className(val) {
        this._className = val;
        this.classList._classes = new Set(val ? val.split(/\s+/).filter(Boolean) : []);
      },
      classList: {
        _classes: new Set(className ? className.split(/\s+/).filter(Boolean) : []),
        add(...cls) { cls.forEach(c => this._classes.add(c)); },
        remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
        toggle(c, force) {
          if (force === undefined) {
            if (this._classes.has(c)) { this._classes.delete(c); return false; }
            else { this._classes.add(c); return true; }
          } else if (force) {
            this._classes.add(c); return true;
          } else {
            this._classes.delete(c); return false;
          }
        },
        contains(c) { return this._classes.has(c); }
      },
      attributes: {},
      setAttribute(name, val) { this.attributes[name] = String(val); },
      getAttribute(name) { return this.attributes[name] || null; },
      removeAttribute(name) { delete this.attributes[name]; },
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      },
      _innerHTML: "",
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) {
        this._innerHTML = val;
        this.children = [];
        if (!val) return;
        const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
        let match;
        while ((match = tagRegex.exec(val)) !== null) {
          const tagName = match[1];
          if (tagName.startsWith("/")) continue;
          const attrsStr = match[2];
          const idMatch = attrsStr.match(/id=["']([^"']+)["']/);
          const classMatch = attrsStr.match(/class=["']([^"']+)["']/);
          const keyMatch = attrsStr.match(/data-control-key=["']([^"']+)["']/);

          const child = createMockEl(
            tagName,
            idMatch ? idMatch[1] : "",
            classMatch ? classMatch[1] : ""
          );
          if (keyMatch) child.setAttribute("data-control-key", keyMatch[1]);
          if (idMatch) doc.elementsById[idMatch[1]] = child;
          this.children.push(child);
        }
      },
      textContent: "",
      value: "",
      listeners: {},
      addEventListener(evt, handler) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(handler);
      },
      querySelector(selector) {
        const all = this.querySelectorAll(selector);
        return all.length > 0 ? all[0] : null;
      },
      querySelectorAll(selector) {
        const matches = [];
        function walk(node) {
          if (!node || !node.children) return;
          for (const child of node.children) {
            if (selector.startsWith("#") && child.id === selector.slice(1)) matches.push(child);
            else if (selector.startsWith(".") && child.classList && child.classList.contains(selector.slice(1))) matches.push(child);
            else if (selector.startsWith("[data-control-key=") && child.getAttribute("data-control-key") === selector.match(/\[data-control-key=["']?([^"']+)["']?\]/)[1]) matches.push(child);
            walk(child);
          }
        }
        walk(this);
        return matches;
      },
      scrollIntoView() {}
    };
    if (id) doc.elementsById[id] = el;
    return el;
  }

  const idsToCreate = [
    "ampSelect", "patchSearchInput", "searchClearBtn", "patchSelect",
    "patchRibbon", "noPatchesNotice", "infoPatchNumber", "infoPatchName",
    "infoCategory", "infoCharacter", "infoDescription", "infoApplicationsList",
    "infoTechniquesList", "infoNoteBox", "infoNoteText", "ampControlPanel"
  ];
  idsToCreate.forEach(id => createMockEl("div", id));

  global.document = doc;
  global.window = { ZitarData };

  ZitarApp.init();

  // Test selecting several patches
  [1, 5, 10, 16, 20].forEach(pid => {
    ZitarApp.selectPatch(pid);
    const p = ZitarData.getPresetById(pid);
    assertEqual(doc.getElementById("infoPatchName").textContent, p.name, `Selected patch ${pid} name`);
  });

  // Test search filtering
  ZitarApp.filterPatches("blues");
  assertEqual(doc.getElementById("infoPatchName").textContent, "Singing Blues Lead", "Filtered to blues preset");

  // Restore
  ZitarApp.filterPatches("");
  assertEqual(doc.getElementById("patchRibbon").children.length, 20, "All 20 presets in ribbon");
});

// Summary
console.log(`\n===========================================`);
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (failedTests.length > 0) {
  console.error(`FAILED TESTS (${failedTests.length}):`);
  failedTests.forEach((f) => {
    console.error(` - ${f.name}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log(`ALL TEST GROUPS PASSED WITH ZERO FAILURES!`);
  console.log(`===========================================\n`);
}
