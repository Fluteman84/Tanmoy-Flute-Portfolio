/**
 * Tabla Taal Engine — Dynamic Taal & Beat Grid Renderer
 * 
 * Module: TaalRenderer
 * Purpose:
 * - Dynamically populates the Taal selector dropdown with format: "<Name> (<Beats> Beats)"
 * - Dynamically constructs beat counting cells for any arbitrary Taal beat count
 * - Handles Taals without notation cleanly by rendering the subdued "Bol not supplied" placeholder
 * - Prepares data attributes for Vibhags, Sam, Tali, and Khali without intrusive visual clutter
 * - Renders application-level notices for data validation diagnostics or loading failures
 */

(function () {
  "use strict";

  const TaalRenderer = {
    /**
     * Renders the options inside the Taal dropdown selector.
     * @param {HTMLSelectElement} selectEl - The <select> element.
     * @param {Array<Object>} taals - List of validated Taal objects.
     * @param {string} selectedTaalId - ID of the currently selected Taal.
     * @param {Function} onSelectCallback - Handler triggered when a new Taal is chosen.
     */
    renderSelector: function (selectEl, taals, selectedTaalId, onSelectCallback) {
      if (!selectEl) return;

      selectEl.innerHTML = "";

      if (!taals || taals.length === 0) {
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "No Taals available";
        selectEl.appendChild(emptyOpt);
        return;
      }

      taals.forEach(function (t) {
        const opt = document.createElement("option");
        opt.value = t.id;
        // Exact requested format: Name (N Beats)
        opt.textContent = t.name + " (" + t.beats + " Beats)";
        if (t.id === selectedTaalId) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      // Bind change listener cleanly (ensures one single active handler)
      selectEl.onchange = function (e) {
        if (typeof onSelectCallback === "function") {
          onSelectCallback(e.target.value);
        }
      };
    },

    /**
     * Builds a fast lookup map for vibhag boundaries given an array of vibhag counts.
     * @param {Array<number>|null} vibhags - E.g. [4, 4, 4, 4]
     * @returns {Object<number, { index: number, isStart: boolean, isEnd: boolean, beatInVibhag: number }>}
     */
    _buildVibhagMap: function (vibhags) {
      const map = {};
      if (!Array.isArray(vibhags) || vibhags.length === 0) return map;

      let currentBeat = 1;
      vibhags.forEach(function (count, vIdx) {
        const vibhagNum = vIdx + 1;
        for (let b = 1; b <= count; b++) {
          map[currentBeat] = {
            index: vibhagNum,
            isStart: (b === 1),
            isEnd: (b === count),
            beatInVibhag: b
          };
          currentBeat++;
        }
      });
      return map;
    },

    /**
     * Renders the complete dynamic beat-counting grid for the active Taal.
     * @param {HTMLElement} gridEl - Container element for the beat cells.
     * @param {Object} taal - The Taal object containing beats and notation.
     * @param {number} activeBeat - The initial active beat to highlight (default: 1).
     */
    renderBeatGrid: function (gridEl, taal, activeBeat) {
      if (!gridEl) return;

      gridEl.innerHTML = "";

      if (!taal || !taal.beats || taal.beats <= 0) {
        const errorCard = document.createElement("div");
        errorCard.className = "beat-grid-empty-message";
        errorCard.textContent = "Unable to render beat grid. Invalid Taal data.";
        gridEl.appendChild(errorCard);
        return;
      }

      const activeNum = typeof activeBeat === "number" ? activeBeat : 1;
      const vibhagMap = this._buildVibhagMap(taal.vibhags);
      const hasNotation = Array.isArray(taal.notation) && taal.notation.length === taal.beats;

      // Update grid region aria-label and total beats attribute
      gridEl.setAttribute("aria-label", "Beat Grid for " + taal.name + " (" + taal.beats + " Beats)");
      gridEl.setAttribute("data-total-beats", String(taal.beats));

      // DocumentFragment for optimal DOM insertion performance
      const fragment = document.createDocumentFragment();

      for (let beat = 1; beat <= taal.beats; beat++) {
        const cell = document.createElement("div");
        cell.className = "beat-cell";
        cell.id = "beat-" + beat;
        cell.setAttribute("data-beat", String(beat));

        // Format leading zero: 01, 02 ... 09, 10 ...
        const paddedBeat = String(beat).padStart(2, "0");

        // Vibhag metadata preparation
        if (vibhagMap[beat]) {
          const v = vibhagMap[beat];
          cell.setAttribute("data-vibhag", String(v.index));
          if (v.isStart) cell.setAttribute("data-vibhag-start", "true");
          if (v.isEnd) cell.setAttribute("data-vibhag-end", "true");
          cell.setAttribute("data-vibhag-beat", String(v.beatInVibhag));
        }

        // Sam, Tali, Khali metadata preparation
        if (taal.sam === beat) {
          cell.setAttribute("data-is-sam", "true");
        }
        if (Array.isArray(taal.tali) && taal.tali.includes(beat)) {
          cell.setAttribute("data-is-tali", "true");
        }
        if (Array.isArray(taal.khali) && taal.khali.includes(beat)) {
          cell.setAttribute("data-is-khali", "true");
        }

        // Active state (highlighted beat)
        if (beat === activeNum) {
          cell.classList.add("active");
          cell.setAttribute("aria-current", "step");
        }

        // Beat number element
        const numSpan = document.createElement("span");
        numSpan.className = "beat-number";
        numSpan.textContent = paddedBeat;

        // Bol element
        const bolSpan = document.createElement("span");
        bolSpan.className = "beat-bol";

        if (hasNotation && typeof taal.notation[beat - 1] === "string" && taal.notation[beat - 1].trim() !== "") {
          bolSpan.textContent = taal.notation[beat - 1].trim();
        } else {
          // Fallback for Taals without notation
          bolSpan.textContent = "Bol not supplied";
          bolSpan.classList.add("empty-bol");
        }

        cell.appendChild(numSpan);
        cell.appendChild(bolSpan);
        fragment.appendChild(cell);
      }

      gridEl.appendChild(fragment);
    },

    /**
     * Highlights a specific beat cell and de-highlights all others.
     * @param {HTMLElement} gridEl - Container element for the beat cells.
     * @param {number} beatNumber - 1-indexed beat number.
     */
    setActiveBeat: function (gridEl, beatNumber) {
      if (!gridEl) return;
      const cells = gridEl.querySelectorAll(".beat-cell");
      cells.forEach(function (cell) {
        const num = parseInt(cell.getAttribute("data-beat"), 10);
        if (num === beatNumber) {
          cell.classList.add("active");
          cell.setAttribute("aria-current", "step");
        } else {
          cell.classList.remove("active");
          cell.removeAttribute("aria-current");
        }
      });
    },

    /**
     * Renders validation notices, warnings, or fetch errors into a designated status container.
     * @param {HTMLElement} containerEl - Status element in the DOM.
     * @param {Array<string>} errors - List of error messages.
     * @param {Array<string>} warnings - List of warning messages.
     */
    renderStatusNotice: function (containerEl, errors, warnings) {
      if (!containerEl) return;

      const hasErrors = Array.isArray(errors) && errors.length > 0;
      const hasWarnings = Array.isArray(warnings) && warnings.length > 0;

      if (!hasErrors && !hasWarnings) {
        containerEl.innerHTML = "";
        containerEl.style.display = "none";
        return;
      }

      containerEl.innerHTML = "";
      containerEl.style.display = "block";

      const alertBox = document.createElement("div");
      alertBox.className = "taal-status-alert " + (hasErrors ? "alert-error" : "alert-warning");

      let html = "";
      if (hasErrors) {
        html += "<div class='alert-header'><strong>Taal Data Notice:</strong> " + errors.length + " error(s) detected.</div>";
        html += "<ul class='alert-list'>";
        errors.forEach(function (err) {
          html += "<li>" + err + "</li>";
        });
        html += "</ul>";
      }

      if (hasWarnings) {
        html += "<div class='alert-header'><strong>Warnings:</strong> " + warnings.length + " warning(s) detected.</div>";
        html += "<ul class='alert-list'>";
        warnings.forEach(function (warn) {
          html += "<li>" + warn + "</li>";
        });
        html += "</ul>";
      }

      alertBox.innerHTML = html;
      containerEl.appendChild(alertBox);
    }
  };

  // Expose module globally
  window.TaalRenderer = TaalRenderer;
})();
