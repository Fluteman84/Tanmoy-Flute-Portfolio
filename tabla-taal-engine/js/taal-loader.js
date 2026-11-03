/**
 * Tabla Taal Engine — Taal Data Loader & Validator
 * 
 * Module: TaalLoader
 * Purpose:
 * - Loads Taal metadata from data/taals.json
 * - Performs strict schema and semantic validation
 * - Enforces the invariant: notation.length === beats (if notation is provided)
 * - Isolates invalid Taals with diagnostic logging without crashing the application
 * - Provides structured error/warning reports for the UI
 */

(function () {
  "use strict";

  const TaalLoader = {
    /**
     * Validates raw parsed JSON data according to the Part 2 schema.
     * @param {Object} rawData - The parsed JSON object.
     * @returns {{ success: boolean, taals: Array, errors: Array<string>, warnings: Array<string> }}
     */
    validate: function (rawData) {
      const errors = [];
      const warnings = [];
      const validTaals = [];

      // 1. Root structure validation
      if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
        errors.push("Root JSON must be a valid object.");
        return { success: false, taals: [], errors: errors, warnings: warnings };
      }

      if (typeof rawData.version === "undefined") {
        warnings.push("Taal data version field is missing.");
      }

      if (!Array.isArray(rawData.taals)) {
        errors.push("Missing or invalid 'taals' array in JSON.");
        return { success: false, taals: [], errors: errors, warnings: warnings };
      }

      if (rawData.taals.length === 0) {
        errors.push("The 'taals' array is empty. No Taals found.");
        return { success: false, taals: [], errors: errors, warnings: warnings };
      }

      const seenIds = new Set();

      // 2. Per-Taal validation
      rawData.taals.forEach(function (t, index) {
        const itemPrefix = "Taal #" + (index + 1);

        if (!t || typeof t !== "object" || Array.isArray(t)) {
          errors.push(itemPrefix + ": Entry must be a valid object.");
          return;
        }

        // Validate ID
        if (typeof t.id !== "string" || t.id.trim() === "") {
          errors.push(itemPrefix + ": Missing or empty 'id'.");
          return;
        }
        const id = t.id.trim();
        if (seenIds.has(id)) {
          errors.push(itemPrefix + " ('" + id + "'): Duplicate Taal ID detected. IDs must be unique.");
          return;
        }
        seenIds.add(id);

        // Validate Name
        if (typeof t.name !== "string" || t.name.trim() === "") {
          errors.push(itemPrefix + " ('" + id + "'): Missing or empty 'name'.");
          return;
        }
        const name = t.name.trim();

        // Validate Beats
        if (!Number.isInteger(t.beats) || t.beats <= 0) {
          errors.push("Taal '" + name + "' (" + id + "): 'beats' must be a positive integer.");
          return;
        }
        const beats = t.beats;

        // Validate Notation (if provided)
        let notation = null;
        if (t.notation !== null && typeof t.notation !== "undefined") {
          if (!Array.isArray(t.notation)) {
            errors.push("Taal '" + name + "' (" + id + "): 'notation' must be an array of bols or null.");
            return;
          }

          // Strict validation: length must match beats count
          if (t.notation.length !== beats) {
            errors.push(
              "Taal '" + name + "' (" + id + "): Notation length mismatch. Declared beats: " +
              beats + ", but notation array contains " + t.notation.length + " entries."
            );
            return;
          }

          // Ensure entries are valid strings
          for (let i = 0; i < t.notation.length; i++) {
            if (typeof t.notation[i] !== "string" || t.notation[i].trim() === "") {
              warnings.push("Taal '" + name + "' (" + id + "): Beat " + (i + 1) + " has an empty or non-string bol.");
            }
          }
          notation = t.notation;
        }

        // Validate Vibhags (if provided)
        let vibhags = null;
        if (t.vibhags !== null && typeof t.vibhags !== "undefined") {
          if (!Array.isArray(t.vibhags)) {
            warnings.push("Taal '" + name + "' (" + id + "): 'vibhags' must be an array of integers or null.");
          } else {
            let sum = 0;
            let vibhagsValid = true;
            for (let v of t.vibhags) {
              if (!Number.isInteger(v) || v <= 0) {
                warnings.push("Taal '" + name + "' (" + id + "): Invalid vibhag count: " + v);
                vibhagsValid = false;
                break;
              }
              sum += v;
            }
            if (vibhagsValid) {
              if (sum !== beats) {
                warnings.push("Taal '" + name + "' (" + id + "): Sum of vibhags (" + sum + ") does not equal declared beats (" + beats + ").");
              }
              vibhags = t.vibhags;
            }
          }
        }

        // Validate Sam (optional)
        let sam = null;
        if (t.sam !== null && typeof t.sam !== "undefined") {
          if (Number.isInteger(t.sam) && t.sam >= 1 && t.sam <= beats) {
            sam = t.sam;
          } else {
            warnings.push("Taal '" + name + "' (" + id + "): 'sam' beat position (" + t.sam + ") is out of range 1.." + beats + ".");
          }
        }

        // Validate Tali (optional)
        const tali = [];
        if (Array.isArray(t.tali)) {
          t.tali.forEach(function (pos) {
            if (Number.isInteger(pos) && pos >= 1 && pos <= beats) {
              tali.push(pos);
            } else {
              warnings.push("Taal '" + name + "' (" + id + "): Tali position (" + pos + ") is out of range 1.." + beats + ".");
            }
          });
        }

        // Validate Khali (optional)
        const khali = [];
        if (Array.isArray(t.khali)) {
          t.khali.forEach(function (pos) {
            if (Number.isInteger(pos) && pos >= 1 && pos <= beats) {
              khali.push(pos);
            } else {
              warnings.push("Taal '" + name + "' (" + id + "): Khali position (" + pos + ") is out of range 1.." + beats + ".");
            }
          });
        }

        // Passed validation: construct clean, sanitized Taal object
        validTaals.push({
          id: id,
          name: name,
          beats: beats,
          vibhags: vibhags,
          sam: sam,
          tali: tali,
          khali: khali,
          notation: notation
        });
      });

      // Output diagnostics to console
      if (errors.length > 0) {
        console.group("%c[TaalLoader] Validation Errors (" + errors.length + ")", "color: #C53030; font-weight: bold;");
        errors.forEach(function (err) {
          console.error("- " + err);
        });
        console.groupEnd();
      }

      if (warnings.length > 0) {
        console.group("%c[TaalLoader] Validation Warnings (" + warnings.length + ")", "color: #DD6B20; font-weight: bold;");
        warnings.forEach(function (warn) {
          console.warn("- " + warn);
        });
        console.groupEnd();
      }

      return {
        success: validTaals.length > 0,
        taals: validTaals,
        errors: errors,
        warnings: warnings
      };
    },

    /**
     * Loads the JSON file asynchronously via fetch and runs validation.
     * @param {string} url - Path to the taals.json file (default: 'data/taals.json').
     * @returns {Promise<{ success: boolean, taals: Array, errors: Array<string>, warnings: Array<string> }>}
     */
    load: async function (url) {
      const targetUrl = url || "data/taals.json";

      try {
        const response = await fetch(targetUrl);

        if (!response.ok) {
          const fetchErr = "HTTP Error " + response.status + " while loading " + targetUrl;
          console.error("[TaalLoader]", fetchErr);
          return {
            success: false,
            taals: [],
            errors: [fetchErr],
            warnings: []
          };
        }

        let rawData;
        try {
          rawData = await response.json();
        } catch (jsonErr) {
          const parseErr = "JSON Parsing Error in " + targetUrl + ": " + jsonErr.message;
          console.error("[TaalLoader]", parseErr);
          return {
            success: false,
            taals: [],
            errors: [parseErr],
            warnings: []
          };
        }

        return this.validate(rawData);
      } catch (networkErr) {
        let msg = "Network/Access Error while fetching '" + targetUrl + "': " + networkErr.message;
        if (window.location.protocol === "file:") {
          msg += " (Note: Browsers block local file fetch() requests via file:// protocol. Please serve this app through a local HTTP server such as 'python -m http.server 8000').";
        }
        console.error("[TaalLoader]", msg);
        return {
          success: false,
          taals: [],
          errors: [msg],
          warnings: []
        };
      }
    }
  };

  // Expose module globally
  window.TaalLoader = TaalLoader;
})();
