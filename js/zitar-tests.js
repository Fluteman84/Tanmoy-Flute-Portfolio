/**
 * Automated Tests for Zitar Tone Reference – Gretex GT-15FX
 * Can be run in Node.js or loaded in the browser.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    var ZitarData = require("./zitar-data.js");
    module.exports = factory(ZitarData);
  } else {
    root.ZitarTests = factory(root.ZitarData);
  }
})(typeof self !== "undefined" ? self : this, function (ZitarData) {
  "use strict";

  function assert(condition, message) {
    if (!condition) {
      throw new Error("Assertion failed: " + message);
    }
  }

  function assertEqual(actual, expected, description) {
    if (actual !== expected) {
      throw new Error(
        (description || "Assertion failed") +
          "\n  Expected: " +
          JSON.stringify(expected) +
          "\n  Received: " +
          JSON.stringify(actual)
      );
    }
  }

  function runTests() {
    var results = {
      total: 0,
      passed: 0,
      failures: []
    };

    function test(name, fn) {
      results.total++;
      try {
        fn();
        results.passed++;
      } catch (err) {
        results.failures.push({ name: name, error: err.message });
      }
    }

    // 1. Amplifiers Registry Tests
    test("Amplifier registry contains gretexGT15FX", function () {
      assert(ZitarData.AMPLIFIERS, "AMPLIFIERS registry exists");
      assert(ZitarData.AMPLIFIERS.gretexGT15FX, "gretexGT15FX amplifier exists");
      assertEqual(ZitarData.AMPLIFIERS.gretexGT15FX.name, "Gretex GT-15FX", "Amp name matches");
      assert(Array.isArray(ZitarData.AMPLIFIERS.gretexGT15FX.controls), "Controls is array");
      assertEqual(ZitarData.AMPLIFIERS.gretexGT15FX.controls.length, 9, "Amp has 9 physical controls");
    });

    // 2. Presets Count and Integrity
    var presets = ZitarData.AMPLIFIERS.gretexGT15FX.presets;
    test("Preset count equals exactly 20", function () {
      assert(Array.isArray(presets), "Presets is an array");
      assertEqual(presets.length, 20, "Must have exactly 20 master presets");
    });

    test("Preset IDs are unique and sequential from 1 to 20", function () {
      var ids = new Set();
      for (var i = 0; i < presets.length; i++) {
        var p = presets[i];
        assert(!ids.has(p.id), "ID " + p.id + " is duplicate");
        ids.add(p.id);
        assertEqual(p.id, i + 1, "Preset ID matches 1-based index");
        assertEqual(p.patchNumber, (i + 1 < 10 ? "0" : "") + (i + 1), "Patch number formatted");
      }
    });

    // 3. Settings Structure and Validity for Every Preset
    test("Every preset has all 9 control entries in settings", function () {
      var requiredKeys = [
        "masterVolume",
        "overdrive",
        "gain",
        "overdriveVolume",
        "treble",
        "mid",
        "bass",
        "reverb",
        "reverbAmount"
      ];

      presets.forEach(function (preset) {
        assert(preset.settings, "Preset " + preset.id + " has settings object");
        requiredKeys.forEach(function (k) {
          assert(
            Object.prototype.hasOwnProperty.call(preset.settings, k),
            "Preset " + preset.id + " has setting " + k
          );
        });

        // Boolean checks
        assert(
          typeof preset.settings.overdrive === "boolean",
          "Preset " + preset.id + " overdrive must be boolean"
        );
        assert(
          typeof preset.settings.reverb === "boolean",
          "Preset " + preset.id + " reverb must be boolean"
        );

        // Conditional null checks: when Overdrive is OFF, gain & overdriveVolume must be null
        if (!preset.settings.overdrive) {
          assertEqual(
            preset.settings.gain,
            null,
            "Preset " + preset.id + " gain must be null when OD is OFF"
          );
          assertEqual(
            preset.settings.overdriveVolume,
            null,
            "Preset " + preset.id + " overdriveVolume must be null when OD is OFF"
          );
        } else {
          assert(
            preset.settings.gain !== null && typeof preset.settings.gain === "string",
            "Preset " + preset.id + " gain must be string when OD is ON"
          );
          assert(
            preset.settings.overdriveVolume !== null && typeof preset.settings.overdriveVolume === "string",
            "Preset " + preset.id + " overdriveVolume must be string when OD is ON"
          );
        }

        // Conditional null checks: when Reverb is OFF, reverbAmount must be null
        if (!preset.settings.reverb) {
          assertEqual(
            preset.settings.reverbAmount,
            null,
            "Preset " + preset.id + " reverbAmount must be null when Reverb is OFF"
          );
        } else {
          assert(
            preset.settings.reverbAmount !== null && typeof preset.settings.reverbAmount === "string",
            "Preset " + preset.id + " reverbAmount must be string when Reverb is ON"
          );
        }

        // Active dials must be valid parseable clock positions
        ["masterVolume", "treble", "mid", "bass"].forEach(function (dialKey) {
          var val = preset.settings[dialKey];
          assert(val && typeof val === "string", "Preset " + preset.id + " " + dialKey + " is string");
          var deg = ZitarData.parseClockToDegrees(val);
          assert(deg !== null && !isNaN(deg), "Preset " + preset.id + " " + dialKey + " parseable (" + val + " -> " + deg + ")");
        });
      });
    });

    // 4. Clock to Angle Mapping Consistency
    test("Clock angle mapping calculates consistent degrees from 12 o'clock", function () {
      // 12 o'clock is 0
      assertEqual(ZitarData.parseClockToDegrees("12 o'clock"), 0, "12 o'clock = 0 deg");
      assertEqual(ZitarData.parseClockToDegrees("12:00"), 0, "12:00 = 0 deg");

      // Positive angles (clockwise)
      assertEqual(ZitarData.parseClockToDegrees("1 o'clock"), 30, "1 o'clock = +30 deg");
      assertEqual(ZitarData.parseClockToDegrees("1:00"), 30, "1:00 = +30 deg");
      assertEqual(ZitarData.parseClockToDegrees("1:30"), 45, "1:30 = +45 deg");
      assertEqual(ZitarData.parseClockToDegrees("2 o'clock"), 60, "2 o'clock = +60 deg");
      assertEqual(ZitarData.parseClockToDegrees("2:30"), 75, "2:30 = +75 deg");
      assertEqual(ZitarData.parseClockToDegrees("3 o'clock"), 90, "3 o'clock = +90 deg");
      assertEqual(ZitarData.parseClockToDegrees("3:30"), 105, "3:30 = +105 deg");

      // Negative angles (counter-clockwise)
      assertEqual(ZitarData.parseClockToDegrees("11:30"), -15, "11:30 = -15 deg");
      assertEqual(ZitarData.parseClockToDegrees("11 o'clock"), -30, "11 o'clock = -30 deg");
      assertEqual(ZitarData.parseClockToDegrees("10:30"), -45, "10:30 = -45 deg");
      assertEqual(ZitarData.parseClockToDegrees("10 o'clock"), -60, "10 o'clock = -60 deg");
      assertEqual(ZitarData.parseClockToDegrees("9:30"), -75, "9:30 = -75 deg");
      assertEqual(ZitarData.parseClockToDegrees("9 o'clock"), -90, "9 o'clock = -90 deg");
      assertEqual(ZitarData.parseClockToDegrees("8:30"), -105, "8:30 = -105 deg");

      // Ranges
      assertEqual(ZitarData.parseClockToDegrees("10–11 o'clock"), -45, "10–11 o'clock midpoint is 10:30 (-45 deg)");
      assertEqual(ZitarData.parseClockToDegrees("9–10 o'clock"), -75, "9–10 o'clock midpoint is 9:30 (-75 deg)");

      // Null and disabled values
      assertEqual(ZitarData.parseClockToDegrees(null), null, "null returns null");
      assertEqual(ZitarData.parseClockToDegrees("N/A"), null, "N/A returns null");
    });

    // 5. Preset Search Filtering
    test("Preset search returns exact matches across name, category, character, and application", function () {
      // Search by name
      var cleanMatches = ZitarData.searchPresets("Classical Clean Zitar");
      assertEqual(cleanMatches.length, 1, "Finds exactly Classical Clean Zitar");
      assertEqual(cleanMatches[0].id, 1, "Preset 1 matched");

      // Search by category
      var catMatches = ZitarData.searchPresets("Rock and Fusion");
      assertEqual(catMatches.length, 5, "Category C has 5 presets (11 to 15)");

      // Search by tonal character
      var nasalMatches = ZitarData.searchPresets("nasal");
      assertEqual(nasalMatches.length, 1, "Finds Telephone / Radio Zitar via nasal");
      assertEqual(nasalMatches[0].id, 16, "Preset 16 matched");

      // Search by application
      var alapMatches = ZitarData.searchPresets("Alap");
      assert(alapMatches.length >= 2, "Alap matches multiple presets (01, 03)");

      // Search by fusion
      var fusionMatches = ZitarData.searchPresets("Fusion");
      assert(fusionMatches.length >= 5, "Fusion matches multiple presets");

      // Nonexistent query
      var noMatches = ZitarData.searchPresets("xyz123randomnonexistent");
      assertEqual(noMatches.length, 0, "No matching presets found returns empty array");

      // Empty query returns all 20 presets
      var all = ZitarData.searchPresets("");
      assertEqual(all.length, 20, "Empty search returns all 20 presets");
    });

    // 6. Preset Retrieval by ID
    test("getPresetById retrieves correct preset data", function () {
      var p2 = ZitarData.getPresetById(2);
      assert(p2 !== null, "Preset 2 found");
      assertEqual(p2.name, "Fusion Zitar – Niladri Kumar-inspired", "Name matches");
      assertEqual(p2.settings.reverbAmount, "11 o'clock", "Reverb amount matches");
      assertEqual(p2.settings.overdrive, false, "Overdrive is false");

      var p10 = ZitarData.getPresetById(10);
      assert(p10 !== null, "Preset 10 found");
      assertEqual(p10.settings.overdrive, true, "OD is true");
      assertEqual(p10.settings.gain, "9:30", "Gain matches");
      assertEqual(p10.settings.overdriveVolume, "11 o'clock", "OD volume matches");

      var pInvalid = ZitarData.getPresetById(99);
      assertEqual(pInvalid, null, "Invalid ID returns null");
    });

    // 7. Verification of Presets 16 & 19 with Reverb OFF
    test("Presets 16 and 19 have Reverb OFF and Reverb Amount null", function () {
      var p16 = ZitarData.getPresetById(16);
      assertEqual(p16.settings.reverb, false, "Preset 16 Reverb is false");
      assertEqual(p16.settings.reverbAmount, null, "Preset 16 Reverb Amount is null");

      var p19 = ZitarData.getPresetById(19);
      assertEqual(p19.settings.reverb, false, "Preset 19 Reverb is false");
      assertEqual(p19.settings.reverbAmount, null, "Preset 19 Reverb Amount is null");
    });

    // 8. Verification of all 8 Overdrive ON presets (10, 11, 12, 13, 14, 15, 18, 20)
    test("All 8 Overdrive presets have OD true and valid Gain/OD Volume", function () {
      var odIds = [10, 11, 12, 13, 14, 15, 18, 20];
      odIds.forEach(function (id) {
        var p = ZitarData.getPresetById(id);
        assertEqual(p.settings.overdrive, true, "Preset " + id + " has OD true");
        assert(p.settings.gain !== null, "Preset " + id + " has non-null gain");
        assert(p.settings.overdriveVolume !== null, "Preset " + id + " has non-null OD volume");
      });
    });

    return results;
  }

  var testResults = runTests();
  if (typeof console !== "undefined") {
    if (testResults.failures.length === 0) {
      console.info(
        "Zitar Tone Reference tests PASSED (" +
          testResults.passed +
          "/" +
          testResults.total +
          " assertions)."
      );
    } else {
      console.error(
        "Zitar Tone Reference tests FAILED (" +
          testResults.failures.length +
          " failures):",
        testResults.failures
      );
    }
  }

  return {
    runTests: runTests,
    results: testResults
  };
});
