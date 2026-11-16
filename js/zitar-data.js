/**
 * Zitar Tone Reference – Data Architecture & External JSON Loader
 * Provides schema validation, data loading, and tone preset query utilities.
 * Single source of truth is data/amplifier-presets.json.
 */
(function (root, factory) {
  if (typeof window === "object") {
    root.ZitarData = factory();
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(module.require.bind(module));
  }
})(typeof self !== "undefined" ? self : this, function (requireNode) {
  "use strict";

  // Dynamic amplifier registry (populated upon loading data/amplifier-presets.json)
  var AMPLIFIERS = {};
  var isLoadedFlag = false;
  var lastLoadError = null;

  /**
   * Converts clock-face string (e.g. "1:30", "10 o'clock", "10–11 o'clock", "8:30")
   * into a visual rotation angle in degrees where 12:00 is 0° (straight up).
   * Clockwise is positive, counter-clockwise is negative (-150° to +150°).
   *
   * @param {string|null} clockStr
   * @param {Object} [preset] Optional preset object for explicit midpoint reference
   * @param {string} [controlKey] Optional control key to lookup preset.midpoints
   * @returns {number|null} Degrees from 12 o'clock (-180 to +180), or null if inactive/null.
   */
  function parseClockToDegrees(clockStr, preset, controlKey) {
    if (!clockStr || typeof clockStr !== "string") {
      return null;
    }

    var clean = clockStr.trim();
    if (clean === "N/A" || clean.toLowerCase() === "null") {
      return null;
    }

    // Check if preset has an explicit midpoint defined for this control
    if (preset && preset.midpoints && controlKey && preset.midpoints[controlKey]) {
      var explicitDeg = parseSingleClock(preset.midpoints[controlKey]);
      if (explicitDeg !== null) return explicitDeg;
    }

    // Check for range like "10–11 o'clock", "9-10 o'clock" or "10-11"
    var rangeMatch = clean.match(/^(\d+(?::\d+)?)\s*[–—-]\s*(\d+(?::\d+)?)(?:\s*o['’]clock)?$/i);
    if (rangeMatch) {
      var deg1 = parseSingleClock(rangeMatch[1]);
      var deg2 = parseSingleClock(rangeMatch[2]);
      if (deg1 !== null && deg2 !== null) {
        var diff = deg2 - deg1;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        var mid = deg1 + diff / 2;
        if (mid > 180) mid -= 360;
        if (mid < -180) mid += 360;
        return Math.round(mid * 10) / 10;
      }
    }

    return parseSingleClock(clean);
  }

  /**
   * Helper to parse single clock position into degrees relative to 12 o'clock
   */
  function parseSingleClock(str) {
    if (!str) return null;
    var s = String(str).trim().toLowerCase();

    // Remove "o'clock" or "o’clock"
    s = s.replace(/\s*o['’]clock/g, "").trim();

    var hour = 0;
    var minute = 0;

    if (s.indexOf(":") !== -1) {
      var parts = s.split(":");
      hour = parseInt(parts[0], 10);
      minute = parseInt(parts[1], 10) || 0;
    } else {
      hour = parseInt(s, 10);
      minute = 0;
    }

    if (isNaN(hour)) return null;

    // Normalize hour into 12-hour clock (1..12)
    var totalMinutes = (hour % 12) * 60 + minute;
    // Each minute is 360 / (12 * 60) = 0.5 degrees
    var rawDeg = totalMinutes * 0.5;

    // Convert into -180 to +180 relative to 12 o'clock
    var deg = rawDeg > 180 ? rawDeg - 360 : rawDeg;
    return Math.round(deg * 10) / 10;
  }

  /**
   * Returns explicit clock-face midpoint string for a range-based clock position
   * E.g. "10–11 o'clock" -> "10:30", "9–10 o'clock" -> "9:30"
   */
  function getClockMidpoint(clockStr) {
    if (!clockStr || typeof clockStr !== "string") return null;
    var clean = clockStr.trim();
    var rangeMatch = clean.match(/^(\d+(?::\d+)?)\s*[–—-]\s*(\d+(?::\d+)?)(?:\s*o['’]clock)?$/i);
    if (!rangeMatch) return clean;

    var p1 = rangeMatch[1];
    var p2 = rangeMatch[2];
    var h1 = parseInt(p1.split(":")[0], 10);
    var m1 = parseInt(p1.split(":")[1] || "0", 10);
    var h2 = parseInt(p2.split(":")[0], 10);
    var m2 = parseInt(p2.split(":")[1] || "0", 10);

    var tot1 = (h1 % 12) * 60 + m1;
    var tot2 = (h2 % 12) * 60 + m2;
    var diff = tot2 - tot1;
    if (diff < -360) diff += 720;
    if (diff > 360) diff -= 720;
    var midTot = (tot1 + diff / 2) % 720;
    if (midTot < 0) midTot += 720;

    var midH = Math.floor(midTot / 60);
    if (midH === 0) midH = 12;
    var midM = Math.round(midTot % 60);
    var midMStr = midM < 10 ? "0" + midM : "" + midM;
    return midH + ":" + midMStr;
  }

  /**
   * Validates raw parsed JSON data according to the Tone Reference Schema.
   *
   * @param {Object} rawData Parsed JSON root object
   * @returns {{ success: boolean, amplifiers: Object, errors: Array<string>, warnings: Array<string> }}
   */
  function validate(rawData) {
    var errors = [];
    var warnings = [];
    var validAmplifiers = {};

    // 1. Root structure
    if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
      errors.push("Root JSON must be a valid object.");
      return { success: false, amplifiers: {}, errors: errors, warnings: warnings };
    }

    if (typeof rawData.schemaVersion !== "string" || !rawData.schemaVersion.trim()) {
      errors.push("Missing or invalid 'schemaVersion' in root JSON.");
    }

    if (!Array.isArray(rawData.amplifiers) || rawData.amplifiers.length === 0) {
      errors.push("Root JSON must contain a non-empty 'amplifiers' array.");
      return { success: false, amplifiers: {}, errors: errors, warnings: warnings };
    }

    var seenAmpIds = {};

    // 2. Iterate each amplifier
    rawData.amplifiers.forEach(function (amp, aIdx) {
      var ampPrefix = "Amplifier #" + (aIdx + 1);

      if (!amp || typeof amp !== "object" || Array.isArray(amp)) {
        errors.push(ampPrefix + ": Entry must be an object.");
        return;
      }

      // Validate ID
      if (typeof amp.id !== "string" || !amp.id.trim()) {
        errors.push(ampPrefix + ": Missing or empty 'id'.");
        return;
      }
      var ampId = amp.id.trim();
      if (seenAmpIds[ampId]) {
        errors.push(ampPrefix + ": Duplicate amplifier ID '" + ampId + "'.");
        return;
      }
      seenAmpIds[ampId] = true;

      // Validate Display Name
      var displayName = amp.displayName || amp.name;
      if (typeof displayName !== "string" || !displayName.trim()) {
        errors.push("Amplifier '" + ampId + "': Missing or empty 'displayName'.");
        displayName = ampId;
      }

      if (typeof amp.manufacturer !== "string" || !amp.manufacturer.trim()) {
        warnings.push("Amplifier '" + ampId + "': Missing 'manufacturer'.");
      }
      if (typeof amp.modelName !== "string" || !amp.modelName.trim()) {
        warnings.push("Amplifier '" + ampId + "': Missing 'modelName'.");
      }

      // Validate Controls
      if (!Array.isArray(amp.controls) || amp.controls.length === 0) {
        errors.push("Amplifier '" + ampId + "': Must define at least one control in 'controls'.");
        return;
      }

      var controlMap = {};
      amp.controls.forEach(function (ctrl, cIdx) {
        var cLabel = "Amplifier '" + ampId + "' Control #" + (cIdx + 1);
        if (!ctrl || typeof ctrl !== "object" || Array.isArray(ctrl)) {
          errors.push(cLabel + ": Control must be an object.");
          return;
        }

        if (typeof ctrl.key !== "string" || !ctrl.key.trim()) {
          errors.push(cLabel + ": Missing or empty control 'key'.");
          return;
        }
        var cKey = ctrl.key.trim();
        if (controlMap[cKey]) {
          errors.push("Amplifier '" + ampId + "': Duplicate control key '" + cKey + "'.");
          return;
        }
        if (typeof ctrl.label !== "string" || !ctrl.label.trim()) {
          errors.push("Amplifier '" + ampId + "' control '" + cKey + "': Missing 'label'.");
        }
        if (ctrl.type !== "dial" && ctrl.type !== "switch") {
          errors.push("Amplifier '" + ampId + "' control '" + cKey + "': 'type' must be 'dial' or 'switch'.");
        }

        controlMap[cKey] = ctrl;
      });

      // Verify dependsOn references
      amp.controls.forEach(function (ctrl) {
        if (ctrl.dependsOn) {
          var parentCtrl = controlMap[ctrl.dependsOn];
          if (!parentCtrl) {
            errors.push("Amplifier '" + ampId + "' control '" + ctrl.key + "': dependsOn '" + ctrl.dependsOn + "' does not exist.");
          } else if (parentCtrl.type !== "switch") {
            errors.push("Amplifier '" + ampId + "' control '" + ctrl.key + "': dependsOn target '" + ctrl.dependsOn + "' must be a switch.");
          }
        }
      });

      // Validate Presets
      if (!Array.isArray(amp.presets) || amp.presets.length === 0) {
        errors.push("Amplifier '" + ampId + "': Missing or empty 'presets' array.");
        return;
      }

      var seenPresetIds = {};
      var validPresets = [];

      amp.presets.forEach(function (p, pIdx) {
        var pLabel = "Amplifier '" + ampId + "' Preset #" + (pIdx + 1);

        if (!p || typeof p !== "object" || Array.isArray(p)) {
          errors.push(pLabel + ": Entry must be an object.");
          return;
        }

        if (typeof p.id === "undefined" || p.id === null) {
          errors.push(pLabel + ": Missing 'id'.");
          return;
        }
        var pIdKey = String(p.id);
        if (seenPresetIds[pIdKey]) {
          errors.push(pLabel + " (ID: " + p.id + "): Duplicate preset ID detected.");
          return;
        }
        seenPresetIds[pIdKey] = true;

        if (typeof p.patchNumber !== "string" || !p.patchNumber.trim()) {
          errors.push(pLabel + " (ID: " + p.id + "): Missing or empty 'patchNumber'.");
        }

        var reqStrings = ["name", "category", "character", "description"];
        reqStrings.forEach(function (f) {
          if (typeof p[f] !== "string" || !p[f].trim()) {
            errors.push("Preset '" + (p.name || p.id) + "': Missing required field '" + f + "'.");
          }
        });

        if (!Array.isArray(p.applications)) {
          errors.push("Preset '" + (p.name || p.id) + "': 'applications' must be an array.");
        }
        if (!Array.isArray(p.techniques)) {
          errors.push("Preset '" + (p.name || p.id) + "': 'techniques' must be an array.");
        }

        if (!p.settings || typeof p.settings !== "object" || Array.isArray(p.settings)) {
          errors.push("Preset '" + (p.name || p.id) + "': 'settings' must be an object.");
          return;
        }

        // Validate each amplifier control in settings
        amp.controls.forEach(function (ctrl) {
          if (!(ctrl.key in p.settings)) {
            errors.push("Preset '" + (p.name || p.id) + "': Missing control setting for '" + ctrl.key + "'.");
            return;
          }

          var val = p.settings[ctrl.key];

          if (ctrl.type === "switch") {
            if (typeof val !== "boolean") {
              errors.push("Preset '" + (p.name || p.id) + "': Switch '" + ctrl.key + "' must be boolean true or false.");
            }
          } else if (ctrl.type === "dial") {
            var isDependent = !!ctrl.dependsOn;
            var isParentOn = isDependent ? p.settings[ctrl.dependsOn] === true : true;

            if (!isParentOn) {
              if (val !== null) {
                errors.push("Preset '" + (p.name || p.id) + "': Inactive control '" + ctrl.key + "' must be null when '" + ctrl.dependsOn + "' is OFF.");
              }
            } else {
              if (val === null || val === undefined) {
                errors.push("Preset '" + (p.name || p.id) + "': Active control '" + ctrl.key + "' cannot be null.");
              } else if (typeof val !== "string" || !val.trim()) {
                errors.push("Preset '" + (p.name || p.id) + "': Control '" + ctrl.key + "' must be a non-empty clock string.");
              } else {
                // Check range format
                var isRange = /^(\d+(?::\d+)?)\s*[–—-]\s*(\d+(?::\d+)?)(?:\s*o['’]clock)?$/i.test(val.trim());
                if (isRange) {
                  // Ensure explicit midpoint is defined or calculated
                  if (!p.midpoints || !p.midpoints[ctrl.key]) {
                    if (!p.midpoints) p.midpoints = {};
                    p.midpoints[ctrl.key] = getClockMidpoint(val);
                  }
                }
              }
            }
          }
        });

        validPresets.push(p);
      });

      validAmplifiers[ampId] = {
        id: ampId,
        name: displayName,
        displayName: displayName,
        manufacturer: amp.manufacturer || "",
        modelName: amp.modelName || "",
        subtitle: amp.subtitle || "",
        effects: Array.isArray(amp.effects) ? amp.effects : [],
        controls: amp.controls,
        presets: validPresets
      };
    });

    return {
      success: errors.length === 0,
      amplifiers: validAmplifiers,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Loads parsed data object into the runtime registry after validation
   *
   * @param {Object} rawData Parsed JSON data
   * @returns {{ success: boolean, amplifiers: Object, errors: Array<string>, warnings: Array<string> }}
   */
  function loadData(rawData) {
    var result = validate(rawData);
    if (!result.success) {
      lastLoadError = result.errors.join("; ");
      console.error("[ZitarData] Validation failed with errors:", result.errors);
      return result;
    }

    // Clear and populate AMPLIFIERS
    for (var key in AMPLIFIERS) {
      if (Object.prototype.hasOwnProperty.call(AMPLIFIERS, key)) {
        delete AMPLIFIERS[key];
      }
    }
    for (var ampId in result.amplifiers) {
      if (Object.prototype.hasOwnProperty.call(result.amplifiers, ampId)) {
        AMPLIFIERS[ampId] = result.amplifiers[ampId];
      }
    }

    isLoadedFlag = true;
    lastLoadError = null;
    return result;
  }

  /**
   * Loads JSON file asynchronously and initializes the amplifier registry.
   *
   * @param {string} [url="data/amplifier-presets.json"]
   * @returns {Promise<{ success: boolean, amplifiers: Object, errors: Array<string>, warnings: Array<string> }>}
   */
  function load(url) {
    var targetUrl = url || "data/amplifier-presets.json";

    // Node.js environment support for QA suites & server-side scripts
    var isNode = typeof process !== "undefined" && process.versions && !!process.versions.node;
    if (isNode && requireNode) {
      try {
        var fs = requireNode("node:fs");
        var path = requireNode("node:path");
        var filePath = path.resolve(process.cwd(), targetUrl);
        if (!fs.existsSync(filePath)) {
          var notFoundErr = "File not found: " + targetUrl;
          lastLoadError = notFoundErr;
          return Promise.resolve({
            success: false,
            amplifiers: {},
            errors: [notFoundErr],
            warnings: []
          });
        }
        var fileContent = fs.readFileSync(filePath, "utf-8");
        var parsed = JSON.parse(fileContent);
        return Promise.resolve(loadData(parsed));
      } catch (err) {
        var readErr = "Failed reading JSON file '" + targetUrl + "': " + err.message;
        lastLoadError = readErr;
        return Promise.resolve({
          success: false,
          amplifiers: {},
          errors: [readErr],
          warnings: []
        });
      }
    }

    // Browser environment via fetch()
    return fetch(targetUrl)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status + " " + res.statusText + " while fetching " + targetUrl);
        }
        return res.json();
      })
      .then(function (jsonData) {
        return loadData(jsonData);
      })
      .catch(function (fetchErr) {
        var msg = "Failed to load '" + targetUrl + "': " + fetchErr.message;
        if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
          msg += " (Local file CORS restriction: modern browsers block asynchronous fetch via file:// protocol. Serve using a local HTTP server e.g. python -m http.server 8000 or host on GitHub Pages).";
        }
        lastLoadError = msg;
        console.error("[ZitarData]", msg);
        return {
          success: false,
          amplifiers: {},
          errors: [msg],
          warnings: []
        };
      });
  }

  /**
   * Search and filter presets by query across name, category, character, applications and techniques
   *
   * @param {string} query
   * @param {string} [ampKey]
   * @returns {Array} Filtered presets array
   */
  function searchPresets(query, ampKey) {
    var key = ampKey;
    if (!key || !AMPLIFIERS[key]) {
      var keys = Object.keys(AMPLIFIERS);
      key = keys.length > 0 ? keys[0] : "gretexGT15FX";
    }
    var amp = AMPLIFIERS[key];
    if (!amp || !amp.presets) return [];

    var q = (query || "").trim().toLowerCase();
    if (!q) return amp.presets.slice();

    return amp.presets.filter(function (preset) {
      if (preset.name && preset.name.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.category && preset.category.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.character && preset.character.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.description && preset.description.toLowerCase().indexOf(q) !== -1) return true;
      if (preset.patchNumber && preset.patchNumber.indexOf(q) !== -1) return true;
      if (
        preset.applications &&
        preset.applications.some(function (app) {
          return app.toLowerCase().indexOf(q) !== -1;
        })
      ) {
        return true;
      }
      if (
        preset.techniques &&
        preset.techniques.some(function (tech) {
          return tech.toLowerCase().indexOf(q) !== -1;
        })
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Retrieve a preset by its ID
   *
   * @param {number|string} id
   * @param {string} [ampKey]
   * @returns {Object|null}
   */
  function getPresetById(id, ampKey) {
    var key = ampKey;
    if (!key || !AMPLIFIERS[key]) {
      var keys = Object.keys(AMPLIFIERS);
      key = keys.length > 0 ? keys[0] : "gretexGT15FX";
    }
    var amp = AMPLIFIERS[key];
    if (!amp || !amp.presets) return null;
    var targetId = parseInt(id, 10);
    for (var i = 0; i < amp.presets.length; i++) {
      if (amp.presets[i].id === targetId) {
        return amp.presets[i];
      }
    }
    return null;
  }

  /**
   * Get first preset of an amplifier
   */
  function getFirstPreset(ampKey) {
    var key = ampKey;
    if (!key || !AMPLIFIERS[key]) {
      var keys = Object.keys(AMPLIFIERS);
      key = keys.length > 0 ? keys[0] : "gretexGT15FX";
    }
    var amp = AMPLIFIERS[key];
    if (!amp || !amp.presets || amp.presets.length === 0) return null;
    return amp.presets[0];
  }

  /**
   * Returns list of all loaded amplifier models
   */
  function getAmplifiers() {
    var list = [];
    for (var key in AMPLIFIERS) {
      if (Object.prototype.hasOwnProperty.call(AMPLIFIERS, key)) {
        list.push(AMPLIFIERS[key]);
      }
    }
    return list;
  }

  /**
   * Get specific amplifier by ID
   */
  function getAmplifier(id) {
    return AMPLIFIERS[id] || null;
  }

  /**
   * Check if data is loaded
   */
  function isLoaded() {
    return isLoadedFlag;
  }

  /**
   * Returns last load error string, if any
   */
  function getLastError() {
    return lastLoadError;
  }

  return {
    AMPLIFIERS: AMPLIFIERS,
    load: load,
    loadData: loadData,
    validate: validate,
    isLoaded: isLoaded,
    getLastError: getLastError,
    getAmplifiers: getAmplifiers,
    getAmplifier: getAmplifier,
    getFirstPreset: getFirstPreset,
    getPresetById: getPresetById,
    searchPresets: searchPresets,
    parseClockToDegrees: parseClockToDegrees,
    parseSingleClock: parseSingleClock,
    getClockMidpoint: getClockMidpoint
  };
});
