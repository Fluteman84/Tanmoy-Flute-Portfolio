/**
 * Comprehensive Automated QA & Regression Test Suite
 * Zitar Tone Reference – External JSON Database & Architecture Verification
 *
 * Test Groups:
 * Group A: Existing Website Integrity & Regression
 * Group B: External JSON Database & Schema Integrity (data/amplifier-presets.json)
 * Group C: Data Validation & Error Handling Engine
 * Group D: ZitarData Query & Math Engine
 * Group E: Multi-Amplifier Support & Extensibility
 * Group F: ZitarApp UI Lifecycle, Dials & Modal Integration
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
    const res = fn();
    if (res && typeof res.then === "function") {
      throw new Error("Test returned a promise; use async test runner or sync assertions.");
    }
    passedTests++;
  } catch (err) {
    failedTests.push({ name, error: err.message, stack: err.stack });
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
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

async function runTestSuite() {
  console.log("=== RUNNING ZITAR TONE REFERENCE QA SUITE ===\n");

  // -------------------------------------------------------------
  // TEST GROUP A: EXISTING WEBSITE INTEGRITY & REGRESSION
  // -------------------------------------------------------------
  const reactEntries = {
    "index.html": "main",
    "notes.html": "tools/palta",
    "notation.html": "tools/notation",
    "tabla.html": "tools/tabla",
    "zitar.html": "tools/zitar",
  };
  for (const [page, entry] of Object.entries(reactEntries)) {
    test(`Group A: ${page} loads its React entry`, () => {
      const content = fs.readFileSync(page, "utf-8");
      assert(content.includes('id="root"'), `${page} has a React mount point`);
      assert(content.includes(`type="module" src="/src/${entry}.jsx"`), `${page} loads ${entry}`);
      assert(fs.existsSync(`src/${entry}.jsx`), `${entry}.jsx exists`);
    });
  }

  test("Group A: shared navigation routes to the Zitar page", () => {
    const header = fs.readFileSync("src/components/header.jsx", "utf-8");
    assert(header.includes('["zitar.html", "Zitar Tone Reference"'), "Zitar appears in the shared Tools menu");
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
  // TEST GROUP B: EXTERNAL JSON DATABASE & SCHEMA INTEGRITY
  // -------------------------------------------------------------
  test("Group B1: data/amplifier-presets.json exists and parses cleanly", () => {
    assert(fs.existsSync("data/amplifier-presets.json"), "data/amplifier-presets.json must exist");
    const content = fs.readFileSync("data/amplifier-presets.json", "utf-8");
    const parsed = JSON.parse(content);
    assert(parsed && typeof parsed === "object", "Parsed JSON must be an object");
    assertEqual(parsed.schemaVersion, "1.0.0", "Schema version must be 1.0.0");
    assert(Array.isArray(parsed.amplifiers), "amplifiers must be an array");
    assertEqual(parsed.amplifiers.length, 1, "Initial DB contains 1 amplifier (Gretex)");
  });

  const rawJson = JSON.parse(fs.readFileSync("data/amplifier-presets.json", "utf-8"));
  const gretexAmpJson = rawJson.amplifiers[0];

  test("Group B2: Gretex GT-15FX amplifier metadata is correct in JSON", () => {
    assertEqual(gretexAmpJson.id, "gretexGT15FX", "Amp ID");
    assertEqual(gretexAmpJson.manufacturer, "Gretex", "Amp Manufacturer");
    assertEqual(gretexAmpJson.modelName, "GT-15FX", "Amp Model Name");
    assertEqual(gretexAmpJson.displayName, "Gretex GT-15FX", "Amp Display Name");
    assertEqual(gretexAmpJson.effects.join(","), "overdrive,reverb", "Amp Effects");
  });

  test("Group B3: Exactly 9 controls defined in JSON for Gretex GT-15FX", () => {
    assertEqual(gretexAmpJson.controls.length, 9, "9 controls required");
    const keys = gretexAmpJson.controls.map((c) => c.key);
    assertEqual(
      keys.join(","),
      "masterVolume,overdrive,gain,overdriveVolume,treble,mid,bass,reverb,reverbAmount",
      "Control keys order"
    );
  });

  test("Group B4: Exactly 20 master presets present in JSON", () => {
    assertEqual(gretexAmpJson.presets.length, 20, "Must be exactly 20 presets");
  });

  test("Group B5: All 20 preset IDs are unique and sequential 1 to 20", () => {
    const ids = gretexAmpJson.presets.map((p) => p.id);
    const uniqueIds = new Set(ids);
    assertEqual(uniqueIds.size, 20, "All 20 IDs must be strictly unique");
    gretexAmpJson.presets.forEach((p, idx) => {
      assertEqual(p.id, idx + 1, `Preset index ${idx} ID`);
      const expectedNum = (idx + 1 < 10 ? "0" : "") + (idx + 1);
      assertEqual(p.patchNumber, expectedNum, `Preset index ${idx} patchNumber`);
    });
  });

  test("Group B6: All 20 preset names match master list in JSON", () => {
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
    gretexAmpJson.presets.forEach((p, i) => {
      assertEqual(p.name, expectedNames[i], `Preset ${i + 1} name`);
    });
  });

  test("Group B7: Categories in JSON match the 4 master categories", () => {
    for (let i = 0; i < 6; i++) {
      assertEqual(gretexAmpJson.presets[i].category, "Classical and Indian Music", `Preset ${i + 1} category`);
    }
    for (let i = 6; i < 10; i++) {
      assertEqual(gretexAmpJson.presets[i].category, "Cinematic and Atmospheric", `Preset ${i + 1} category`);
    }
    for (let i = 10; i < 15; i++) {
      assertEqual(gretexAmpJson.presets[i].category, "Rock and Fusion", `Preset ${i + 1} category`);
    }
    for (let i = 15; i < 20; i++) {
      assertEqual(gretexAmpJson.presets[i].category, "Experimental and Special-Purpose", `Preset ${i + 1} category`);
    }
  });

  test("Group B8: All 9 controls present in every preset's settings and inactive controls are null", () => {
    const expectedControls = [
      "masterVolume", "overdrive", "gain", "overdriveVolume",
      "treble", "mid", "bass", "reverb", "reverbAmount"
    ];

    gretexAmpJson.presets.forEach((p) => {
      const s = p.settings;
      assert(s, `Preset ${p.id} must have settings`);
      expectedControls.forEach((key) => {
        assert(key in s, `Preset ${p.id} missing control key '${key}'`);
      });

      // Switch controls must be booleans
      assertEqual(typeof s.overdrive, "boolean", `Preset ${p.id} overdrive must be boolean`);
      assertEqual(typeof s.reverb, "boolean", `Preset ${p.id} reverb must be boolean`);

      // Dependent controls must be null when parent switch is false
      if (!s.overdrive) {
        assertEqual(s.gain, null, `Preset ${p.id} gain must be null when overdrive is false`);
        assertEqual(s.overdriveVolume, null, `Preset ${p.id} overdriveVolume must be null when overdrive is false`);
      } else {
        assert(s.gain !== null, `Preset ${p.id} gain cannot be null when overdrive is true`);
        assert(s.overdriveVolume !== null, `Preset ${p.id} overdriveVolume cannot be null when overdrive is true`);
      }

      if (!s.reverb) {
        assertEqual(s.reverbAmount, null, `Preset ${p.id} reverbAmount must be null when reverb is false`);
      } else {
        assert(s.reverbAmount !== null, `Preset ${p.id} reverbAmount cannot be null when reverb is true`);
      }
    });
  });

  test("Group B9: Range-based clock positions preserve original range and define explicit midpoint", () => {
    const p1 = gretexAmpJson.presets[0];
    assertEqual(p1.settings.masterVolume, "10–11 o'clock", "Preset 01 preserves original range string");
    assertEqual(p1.midpoints.masterVolume, "10:30", "Preset 01 defines explicit midpoint 10:30");

    const p2 = gretexAmpJson.presets[1];
    assertEqual(p2.settings.masterVolume, "10–11 o'clock", "Preset 02 preserves original range string");
    assertEqual(p2.midpoints.masterVolume, "10:30", "Preset 02 defines explicit midpoint 10:30");

    const p11 = gretexAmpJson.presets[10];
    assertEqual(p11.settings.masterVolume, "9–10 o'clock", "Preset 11 preserves original range string");
    assertEqual(p11.midpoints.masterVolume, "9:30", "Preset 11 defines explicit midpoint 9:30");

    const p12 = gretexAmpJson.presets[11];
    assertEqual(p12.settings.masterVolume, "9–10 o'clock", "Preset 12 preserves original range string");
    assertEqual(p12.midpoints.masterVolume, "9:30", "Preset 12 defines explicit midpoint 9:30");
  });

  // -------------------------------------------------------------
  // TEST GROUP C: DATA VALIDATION & ERROR HANDLING ENGINE
  // -------------------------------------------------------------
  test("Group C1: ZitarData.validate() passes cleanly on master JSON", () => {
    const res = ZitarData.validate(rawJson);
    assertEqual(res.success, true, "Validation must succeed");
    assertEqual(res.errors.length, 0, "Errors must be empty");
    assert(res.amplifiers.gretexGT15FX, "gretexGT15FX present in validated amplifiers");
  });

  test("Group C2: Validation rejects invalid root structure or missing schemaVersion", () => {
    assertEqual(ZitarData.validate(null).success, false, "Null root rejected");
    assertEqual(ZitarData.validate([]).success, false, "Array root rejected");
    assertEqual(ZitarData.validate({}).success, false, "Empty root rejected");

    const missingVersion = JSON.parse(JSON.stringify(rawJson));
    delete missingVersion.schemaVersion;
    const res = ZitarData.validate(missingVersion);
    assertEqual(res.success, false, "Missing schemaVersion rejected");
    assert(res.errors.some((e) => e.includes("schemaVersion")), "Reports schemaVersion error");
  });

  test("Group C3: Validation rejects duplicate amplifier IDs", () => {
    const dupAmps = JSON.parse(JSON.stringify(rawJson));
    dupAmps.amplifiers.push(JSON.parse(JSON.stringify(dupAmps.amplifiers[0])));
    const res = ZitarData.validate(dupAmps);
    assertEqual(res.success, false, "Duplicate amplifier ID rejected");
    assert(res.errors.some((e) => e.includes("Duplicate amplifier ID")), "Reports duplicate amp error");
  });

  test("Group C4: Validation rejects duplicate preset IDs", () => {
    const dupPresets = JSON.parse(JSON.stringify(rawJson));
    dupPresets.amplifiers[0].presets[1].id = dupPresets.amplifiers[0].presets[0].id;
    const res = ZitarData.validate(dupPresets);
    assertEqual(res.success, false, "Duplicate preset ID rejected");
    assert(res.errors.some((e) => e.includes("Duplicate preset ID")), "Reports duplicate preset ID error");
  });

  test("Group C5: Validation rejects missing preset required fields", () => {
    const missingField = JSON.parse(JSON.stringify(rawJson));
    delete missingField.amplifiers[0].presets[0].description;
    const res = ZitarData.validate(missingField);
    assertEqual(res.success, false, "Missing description rejected");
    assert(res.errors.some((e) => e.includes("description")), "Reports missing description");
  });

  test("Group C6: Validation rejects missing control in preset settings", () => {
    const missingCtrl = JSON.parse(JSON.stringify(rawJson));
    delete missingCtrl.amplifiers[0].presets[0].settings.treble;
    const res = ZitarData.validate(missingCtrl);
    assertEqual(res.success, false, "Missing treble setting rejected");
    assert(res.errors.some((e) => e.includes("treble")), "Reports missing treble");
  });

  test("Group C7: Validation rejects inactive control that is not null", () => {
    const invalidActive = JSON.parse(JSON.stringify(rawJson));
    // Preset 1 overdrive is false, so gain must be null
    invalidActive.amplifiers[0].presets[0].settings.gain = "10 o'clock";
    const res = ZitarData.validate(invalidActive);
    assertEqual(res.success, false, "Non-null gain when overdrive is false rejected");
    assert(res.errors.some((e) => e.includes("must be null")), "Reports inactive control error");
  });

  test("Group C8: Validation rejects non-boolean switch setting", () => {
    const invalidSwitch = JSON.parse(JSON.stringify(rawJson));
    invalidSwitch.amplifiers[0].presets[0].settings.overdrive = "ON"; // String instead of boolean
    const res = ZitarData.validate(invalidSwitch);
    assertEqual(res.success, false, "String switch setting rejected");
    assert(res.errors.some((e) => e.includes("must be boolean")), "Reports switch boolean error");
  });

  // -------------------------------------------------------------
  // TEST GROUP D: ZITARDATA QUERY & MATH ENGINE
  // -------------------------------------------------------------
  await asyncTest("Group D1: ZitarData.load() loads and initializes registry from JSON", async () => {
    const res = await ZitarData.load("data/amplifier-presets.json");
    assertEqual(res.success, true, "ZitarData.load succeeds");
    assertEqual(ZitarData.isLoaded(), true, "isLoaded() returns true");
    assert(ZitarData.AMPLIFIERS.gretexGT15FX, "gretexGT15FX in registry");
    assertEqual(ZitarData.AMPLIFIERS.gretexGT15FX.presets.length, 20, "20 presets loaded");
  });

  test("Group D2: getPresetById() retrieves presets accurately", () => {
    const p1 = ZitarData.getPresetById(1);
    assertEqual(p1.name, "Classical Clean Zitar", "Preset 1 name");
    assertEqual(p1.settings.masterVolume, "10–11 o'clock", "Preset 1 masterVolume");

    const p16 = ZitarData.getPresetById(16);
    assertEqual(p16.name, "Telephone / Radio Zitar", "Preset 16 name");
    assertEqual(p16.settings.reverb, false, "Preset 16 reverb off");
    assertEqual(p16.settings.reverbAmount, null, "Preset 16 reverbAmount null");
  });

  test("Group D3: searchPresets() works across names, categories, sounds and applications", () => {
    let res = ZitarData.searchPresets("Deep Alap Tone");
    assertEqual(res.length, 1, "Find Deep Alap Tone");

    res = ZitarData.searchPresets("Cinematic");
    assertEqual(res.length, 4, "Find 4 Cinematic presets");

    res = ZitarData.searchPresets("crunchy");
    assertEqual(res.length, 1, "Character 'crunchy' matches Rock Zitar");

    res = ZitarData.searchPresets("fast taans");
    assertEqual(res.length, 1, "Application 'fast taans' matches Preset 1");

    res = ZitarData.searchPresets("nonexistent_search_query");
    assertEqual(res.length, 0, "No results for gibberish query");

    res = ZitarData.searchPresets("");
    assertEqual(res.length, 20, "Empty search returns all 20");
  });

  test("Group D4: parseClockToDegrees() converts single clock positions correctly", () => {
    assertEqual(ZitarData.parseClockToDegrees("12 o'clock"), 0, "12:00 = 0 deg");
    assertEqual(ZitarData.parseClockToDegrees("12:00"), 0, "12:00 = 0 deg");
    assertEqual(ZitarData.parseClockToDegrees("3 o'clock"), 90, "3:00 = +90 deg");
    assertEqual(ZitarData.parseClockToDegrees("9 o'clock"), -90, "9:00 = -90 deg");
    assertEqual(ZitarData.parseClockToDegrees("1:30"), 45, "1:30 = +45 deg");
    assertEqual(ZitarData.parseClockToDegrees("10:30"), -45, "10:30 = -45 deg");
    assertEqual(ZitarData.parseClockToDegrees("7:00"), -150, "7:00 = -150 deg");
    assertEqual(ZitarData.parseClockToDegrees("5:00"), 150, "5:00 = +150 deg");
    assertEqual(ZitarData.parseClockToDegrees(null), null, "null = null");
  });

  test("Group D5: parseClockToDegrees() computes explicit midpoint for range settings", () => {
    const p1 = ZitarData.getPresetById(1);
    const deg1 = ZitarData.parseClockToDegrees(p1.settings.masterVolume, p1, "masterVolume");
    assertEqual(deg1, -45, "10–11 o'clock resolves to midpoint 10:30 (-45 deg)");

    const p11 = ZitarData.getPresetById(11);
    const deg11 = ZitarData.parseClockToDegrees(p11.settings.masterVolume, p11, "masterVolume");
    assertEqual(deg11, -75, "9–10 o'clock resolves to midpoint 9:30 (-75 deg)");

    assertEqual(ZitarData.getClockMidpoint("10–11 o'clock"), "10:30", "getClockMidpoint for 10-11");
    assertEqual(ZitarData.getClockMidpoint("9–10 o'clock"), "9:30", "getClockMidpoint for 9-10");
  });

  // -------------------------------------------------------------
  // TEST GROUP E: MULTI-AMPLIFIER SUPPORT & EXTENSIBILITY
  // -------------------------------------------------------------
  test("Group E1: Adding a second amplifier object works without UI redesign", () => {
    const multiAmpDb = JSON.parse(JSON.stringify(rawJson));
    multiAmpDb.amplifiers.push({
      id: "voxAC15",
      manufacturer: "Vox",
      modelName: "AC15",
      displayName: "Vox AC15 Custom",
      subtitle: "15-Watt Tube Combo with Top Boost",
      effects: ["topBoost", "tremolo"],
      controls: [
        { key: "masterVolume", label: "Master Volume", type: "dial", minClock: "7:00", maxClock: "5:00" },
        { key: "topBoost", label: "Top Boost", type: "switch" },
        { key: "tremoloSpeed", label: "Tremolo Speed", type: "dial", dependsOn: "topBoost", minClock: "7:00", maxClock: "5:00" }
      ],
      presets: [
        {
          id: 101,
          patchNumber: "01",
          name: "British Chime",
          category: "Rock and Fusion",
          character: "Bright, chiming tube chime.",
          description: "Classic British tube combo response with sparkling high frequencies.",
          applications: ["Arpeggiated chords", "Melodic leads"],
          techniques: ["Clean picking"],
          settings: {
            masterVolume: "11 o'clock",
            topBoost: true,
            tremoloSpeed: "1:00"
          }
        }
      ]
    });

    const valResult = ZitarData.validate(multiAmpDb);
    assertEqual(valResult.success, true, "Multi-amp DB validates successfully");
    assert(valResult.amplifiers.voxAC15, "voxAC15 successfully parsed");

    // Load into registry and query
    ZitarData.loadData(multiAmpDb);
    assertEqual(ZitarData.getAmplifiers().length, 2, "2 amplifiers registered");
    const voxPreset = ZitarData.getPresetById(101, "voxAC15");
    assertEqual(voxPreset.name, "British Chime", "Retrieved preset from second amplifier");

    // Restore original single amp
    ZitarData.loadData(rawJson);
    assertEqual(ZitarData.getAmplifiers().length, 1, "Restored single amplifier");
  });

  // -------------------------------------------------------------
  // TEST GROUP F: ZITARAPP UI LIFECYCLE & INTEGRATION
  // -------------------------------------------------------------
  await asyncTest("Group F1: Full simulated DOM lifecycle runs without runtime errors", async () => {
    const doc = {
      elementsById: {},
      getElementById(id) {
        return this.elementsById[id] || null;
      },
      createElement(tag) {
        return createMockEl(tag);
      },
      listeners: {},
      addEventListener(evt, handler) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(handler);
      },
      body: {
        classList: {
          _classes: new Set(),
          add(c) { this._classes.add(c); },
          remove(c) { this._classes.delete(c); },
          contains(c) { return this._classes.has(c); }
        }
      }
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
        scrollIntoView() {},
        focus() {},
        blur() {}
      };
      if (id) doc.elementsById[id] = el;
      return el;
    }

    const idsToCreate = [
      "ampSelect", "patchSearchInput", "searchClearBtn", "patchSelect",
      "patchRibbon", "noPatchesNotice", "infoPatchNumber", "infoPatchName",
      "infoCategory", "infoCharacter", "infoDescription", "infoApplicationsList",
      "infoTechniquesList", "infoNoteBox", "infoNoteText", "ampControlPanel",
      "sidebarSearchWrapper", "searchSuggestionsDropdown", "sidebarPatchListScroll",
      "sidebarSearchFocusBtn", "aboutPatchBtn", "aboutModal", "closeAboutModalBtn",
      "closeModalBottomBtn", "modalPatchNumber", "modalPatchName", "modalCategory",
      "modalCharacter"
    ];
    idsToCreate.forEach(id => {
      const el = createMockEl("div", id);
      if (id === "aboutModal" || id === "noPatchesNotice" || id === "searchSuggestionsDropdown") {
        el.style.display = "none";
      }
    });

    global.document = doc;
    global.window = { ZitarData };

    // Initialize ZitarApp with external JSON
    const initResult = await ZitarApp.init("data/amplifier-presets.json");
    assertEqual(initResult.success, true, "ZitarApp.init succeeded");

    // Verify amp dropdown
    assertEqual(doc.getElementById("ampSelect").value, "gretexGT15FX", "Amp select default");

    // Test selecting patches
    [1, 5, 10, 16, 20].forEach(pid => {
      ZitarApp.selectPatch(pid);
      const p = ZitarData.getPresetById(pid);
      assertEqual(doc.getElementById("infoPatchName").textContent, p.name, `Selected patch ${pid} name`);
      assertEqual(doc.getElementById("modalPatchName").textContent, p.name, `Modal patch ${pid} name`);
    });

    // Test About Modal open / close
    assertEqual(doc.getElementById("aboutModal").style.display, "none", "About modal hidden by default");
    ZitarApp.openAboutModal();
    assertEqual(doc.getElementById("aboutModal").style.display, "flex", "About modal opens on openAboutModal");
    ZitarApp.closeAboutModal();
    assertEqual(doc.getElementById("aboutModal").style.display, "none", "About modal closes on closeAboutModal");

    // Test Search Suggestions
    ZitarApp.showSuggestions("blues");
    assertEqual(doc.getElementById("searchSuggestionsDropdown").style.display, "block", "Suggestions show on showSuggestions");
    ZitarApp.hideSuggestions();
    assertEqual(doc.getElementById("searchSuggestionsDropdown").style.display, "none", "Suggestions hide on hideSuggestions");

    // Test search filtering in left sidebar
    ZitarApp.filterPatches("blues");
    assertEqual(doc.getElementById("infoPatchName").textContent, "Singing Blues Lead", "Filtered to blues preset");

    // Restore
    ZitarApp.filterPatches("");
  });

  await asyncTest("Group F2: Inactive controls display N/A and disabled states correctly", async () => {
    // Select Preset 1 (Classical Clean: overdrive is false, gain and overdriveVolume are inactive)
    ZitarApp.selectPatch(1);
    const panel = global.document.getElementById("ampControlPanel");
    const gainUnit = panel.querySelector('[data-control-key="gain"]');
    assert(gainUnit, "Gain unit exists");
    assert(gainUnit.classList.contains("is-disabled"), "Gain is-disabled when overdrive is false");
    const gainBadge = gainUnit.querySelector(".clock-badge");
    assertEqual(gainBadge.textContent, "N/A", "Gain badge shows N/A");

    // Select Preset 10 (Sustained Lead: overdrive is true)
    ZitarApp.selectPatch(10);
    assert(!gainUnit.classList.contains("is-disabled"), "Gain is not disabled when overdrive is true");
    assert(gainBadge.textContent !== "N/A", "Gain badge shows clock position");
  });

  await asyncTest("Group F3: Failure to load JSON displays error banner without crashing", async () => {
    const errRes = await ZitarApp.init("data/non-existent-file.json");
    assertEqual(errRes.success, false, "Load fails on missing file");
    const panel = global.document.getElementById("ampControlPanel");
    assert(panel.innerHTML.includes("zitar-error-banner"), "Error banner rendered in control panel");
    assert(panel.innerHTML.includes("zitarRetryBtn"), "Retry button rendered in banner");

    // Restore working DB
    const restoreRes = await ZitarApp.init("data/amplifier-presets.json");
    assertEqual(restoreRes.success, true, "ZitarApp restores when valid DB loaded");
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
}

runTestSuite().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
