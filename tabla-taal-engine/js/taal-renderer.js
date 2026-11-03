/**
 * Tabla Taal Engine — Dynamic Taal & Beat Grid Renderer (Parts 2, 3, 4, 5)
 * 
 * Module: TaalRenderer
 * Responsibilities:
 * - Dynamically renders the Taal selector dropdown with format: "<Name> (<Beats> Beats)"
 * - Dynamically constructs beat counting cells for any arbitrary Taal beat count
 * - Renders Sam, Tali, and Khali visual indicator badges
 * - Prepares and renders Vibhag section boundaries
 * - Manages the Live Playback Information & Cycle Counter
 * - Updates button states for STOPPED | PLAYING | STOPPING_AFTER_CYCLE
 * - Handles active beat visual progression
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
        opt.textContent = t.name + " (" + t.beats + " Beats)";
        if (t.id === selectedTaalId) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      selectEl.onchange = function (e) {
        if (typeof onSelectCallback === "function") {
          onSelectCallback(e.target.value);
        }
      };
    },

    /**
     * Builds a fast lookup map for vibhag boundaries given an array of vibhag counts.
     * @param {Array<number>|null} vibhags - E.g. [4, 4, 4, 4]
     * @returns {Object<number, { index: number, isStart: boolean, isEnd: boolean, beatInVibhag: number, totalVibhags: number }>}
     */
    _buildVibhagMap: function (vibhags) {
      const map = {};
      if (!Array.isArray(vibhags) || vibhags.length === 0) return map;

      const totalVibhags = vibhags.length;
      let currentBeat = 1;
      vibhags.forEach(function (count, vIdx) {
        const vibhagNum = vIdx + 1;
        for (let b = 1; b <= count; b++) {
          map[currentBeat] = {
            index: vibhagNum,
            isStart: (b === 1),
            isEnd: (b === count),
            beatInVibhag: b,
            totalVibhags: totalVibhags
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

      const fragment = document.createDocumentFragment();

      for (let beat = 1; beat <= taal.beats; beat++) {
        const cell = document.createElement("div");
        cell.className = "beat-cell";
        cell.id = "beat-" + beat;
        cell.setAttribute("data-beat", String(beat));

        // Format leading zero: 01, 02 ... 09, 10 ...
        const paddedBeat = String(beat).padStart(2, "0");

        // Vibhag metadata preparation & section boundary styling
        if (vibhagMap[beat]) {
          const v = vibhagMap[beat];
          cell.setAttribute("data-vibhag", String(v.index));
          if (v.isStart) cell.setAttribute("data-vibhag-start", "true");
          if (v.isEnd) {
            cell.setAttribute("data-vibhag-end", "true");
            cell.classList.add("vibhag-boundary-end");
          }
          cell.setAttribute("data-vibhag-beat", String(v.beatInVibhag));
        }

        // Active state (highlighted beat)
        if (beat === activeNum) {
          cell.classList.add("active");
          cell.setAttribute("aria-current", "step");
        }

        // Top Header of the Cell: Beat Number and Sam/Tali/Khali Marker Badge
        const cellHeader = document.createElement("div");
        cellHeader.className = "beat-cell-header";

        const numSpan = document.createElement("span");
        numSpan.className = "beat-number";
        numSpan.textContent = paddedBeat;
        cellHeader.appendChild(numSpan);

        // Sam / Tali / Khali Visual Indicator Badges
        let markerBadge = null;

        if (taal.sam === beat) {
          cell.setAttribute("data-is-sam", "true");
          markerBadge = document.createElement("span");
          markerBadge.className = "beat-marker marker-sam";
          markerBadge.textContent = "SAM (X)";
          markerBadge.title = "Sam — Principal Beat (X)";
        } else if (Array.isArray(taal.khali) && taal.khali.includes(beat)) {
          cell.setAttribute("data-is-khali", "true");
          markerBadge = document.createElement("span");
          markerBadge.className = "beat-marker marker-khali";
          markerBadge.textContent = "KHALI (0)";
          markerBadge.title = "Khali — Wave/Empty Beat (0)";
        } else if (Array.isArray(taal.tali) && taal.tali.includes(beat)) {
          cell.setAttribute("data-is-tali", "true");
          markerBadge = document.createElement("span");
          markerBadge.className = "beat-marker marker-tali";

          // Calculate which Tali clap index it is
          const taliIdx = taal.tali.indexOf(beat) + 1;
          markerBadge.textContent = "TALI (" + taliIdx + ")";
          markerBadge.title = "Tali — Clap Position " + taliIdx;
        }

        if (markerBadge) {
          cellHeader.appendChild(markerBadge);
        }

        cell.appendChild(cellHeader);

        // Bol element (Centered, Prominent)
        const bolSpan = document.createElement("span");
        bolSpan.className = "beat-bol";

        if (hasNotation && typeof taal.notation[beat - 1] === "string" && taal.notation[beat - 1].trim() !== "") {
          bolSpan.textContent = taal.notation[beat - 1].trim();
        } else {
          bolSpan.textContent = "Bol not supplied";
          bolSpan.classList.add("empty-bol");
        }

        cell.appendChild(bolSpan);

        // Subtle Vibhag Corner Badge (if vibhags exist)
        if (vibhagMap[beat]) {
          const vInfo = vibhagMap[beat];
          const vibhagBadge = document.createElement("span");
          vibhagBadge.className = "vibhag-badge";
          vibhagBadge.textContent = "V" + vInfo.index;
          cell.appendChild(vibhagBadge);
        }

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
     * Renders the live playback information bar (Taal, BPM, Current Beat, Vibhag, Cycle, Status).
     * @param {HTMLElement} barEl - The container element.
     * @param {Object} info - Information object containing current values.
     */
    renderPlaybackInfo: function (barEl, info) {
      if (!barEl || !info) return;

      const beatFormatted = String(info.currentBeat || 1).padStart(2, "0");
      const totalBeatsFormatted = String(info.totalBeats || 16).padStart(2, "0");
      const cycleFormatted = String(info.currentCycle || 1).padStart(2, "0");

      let vibhagText = "—";
      if (info.currentVibhag && info.totalVibhags) {
        vibhagText = info.currentVibhag + " / " + info.totalVibhags;
      }

      let statusLabel = "IDLE";
      let statusClass = "status-idle";
      if (info.state === "PLAYING") {
        statusLabel = "PLAYING";
        statusClass = "status-playing";
      } else if (info.state === "STOPPING_AFTER_CYCLE") {
        statusLabel = "STOPPING AT END OF CYCLE";
        statusClass = "status-stopping";
      }

      barEl.innerHTML = `
        <div class="info-metric">
          <span class="metric-label">Taal</span>
          <span class="metric-val taal-name-val">${info.taalName || "—"}</span>
        </div>
        <div class="info-metric">
          <span class="metric-label">Tempo</span>
          <span class="metric-val">${info.bpm || 80} BPM</span>
        </div>
        <div class="info-metric highlight-metric">
          <span class="metric-label">Beat</span>
          <span class="metric-val beat-counter-val">${beatFormatted} <span class="dimmed">/ ${totalBeatsFormatted}</span></span>
        </div>
        <div class="info-metric">
          <span class="metric-label">Vibhag</span>
          <span class="metric-val">${vibhagText}</span>
        </div>
        <div class="info-metric highlight-metric">
          <span class="metric-label">Cycle</span>
          <span class="metric-val cycle-counter-val">${cycleFormatted}</span>
        </div>
        <div class="info-metric status-metric">
          <span class="metric-label">Status</span>
          <span class="playback-status-pill ${statusClass}">${statusLabel}</span>
        </div>
      `;
    },

    /**
     * Synchronizes button states with the playback state machine.
     * @param {Object} buttons - { btnPlay, btnStopNow, btnStopCycle }
     * @param {string} state - STOPPED | PLAYING | STOPPING_AFTER_CYCLE
     */
    updateButtonStates: function (buttons, state) {
      const { btnPlay, btnStopNow, btnStopCycle } = buttons;

      if (!btnPlay || !btnStopNow || !btnStopCycle) return;

      if (state === "STOPPED") {
        // Play enabled
        btnPlay.classList.remove("is-playing");
        btnPlay.removeAttribute("disabled");
        btnPlay.setAttribute("aria-pressed", "false");
        btnPlay.innerHTML = `
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 2.5L13.5 8L4 13.5V2.5Z" />
          </svg>
          Play
        `;

        // Stop buttons disabled
        btnStopNow.setAttribute("disabled", "true");
        btnStopNow.classList.add("is-disabled");

        btnStopCycle.setAttribute("disabled", "true");
        btnStopCycle.classList.add("is-disabled");
        btnStopCycle.classList.remove("is-pending");
        btnStopCycle.innerHTML = `
          <span class="btn-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 3L9.5 8L2.5 13V3Z" />
              <rect x="11.5" y="3" width="2" height="10" rx="0.5" />
            </svg>
          </span>
          STOP AFTER CYCLE
        `;
      } else if (state === "PLAYING") {
        // Play indicates active playback
        btnPlay.classList.add("is-playing");
        btnPlay.setAttribute("aria-pressed", "true");
        btnPlay.innerHTML = `
          <span class="playing-pulse-indicator" aria-hidden="true"></span>
          Playing
        `;

        // Stop buttons active
        btnStopNow.removeAttribute("disabled");
        btnStopNow.classList.remove("is-disabled");

        btnStopCycle.removeAttribute("disabled");
        btnStopCycle.classList.remove("is-disabled");
        btnStopCycle.classList.remove("is-pending");
        btnStopCycle.innerHTML = `
          <span class="btn-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 3L9.5 8L2.5 13V3Z" />
              <rect x="11.5" y="3" width="2" height="10" rx="0.5" />
            </svg>
          </span>
          STOP AFTER CYCLE
        `;
      } else if (state === "STOPPING_AFTER_CYCLE") {
        // Play remains active
        btnPlay.classList.add("is-playing");
        btnPlay.setAttribute("aria-pressed", "true");

        // Stop Now remains enabled for immediate abort
        btnStopNow.removeAttribute("disabled");
        btnStopNow.classList.remove("is-disabled");

        // Stop After Cycle shows pending status
        btnStopCycle.removeAttribute("disabled");
        btnStopCycle.classList.add("is-pending");
        btnStopCycle.innerHTML = `
          <span class="btn-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="8 4" />
            </svg>
          </span>
          FINISHING CYCLE...
        `;
      }
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
