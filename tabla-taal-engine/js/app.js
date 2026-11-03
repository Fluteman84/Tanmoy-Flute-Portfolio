/**
 * Tabla Taal Engine — Main Application Controller (Part 2)
 * 
 * NOTE (Architecture & Strict Instructions):
 * - Independent module with zero external dependencies.
 * - Dynamic data-driven architecture: data/taals.json is the single source of truth.
 * - No hardcoded Taal names or bols in this controller.
 * - Changing the Taal selection never triggers playback.
 * - Sound generation, metronome timing, and automatic beat progression are reserved for Part 3+.
 */

(function () {
  "use strict";

  const TablaTaalEngine = {
    version: "2.0.0",
    stage: "Part 2 — Taal Data Management & Dynamic Notation",
    elements: {},
    taals: [],
    currentTaal: null,
    activeBeat: 1,

    /**
     * Initializes the application once the DOM is ready.
     */
    init: async function () {
      this.cacheDOMElements();
      this.setupButtonInterceptors();
      await this.loadAndInitializeData("data/taals.json");
    },

    /**
     * Cache references to UI controls and dynamic containers.
     */
    cacheDOMElements: function () {
      this.elements = {
        taalSelect: document.getElementById("taalSelect"),
        tempoInput: document.getElementById("tempoInput"),
        btnHalveTempo: document.getElementById("btnHalveTempo"),
        btnDoubleTempo: document.getElementById("btnDoubleTempo"),
        btnPlay: document.getElementById("btnPlay"),
        btnStopNow: document.getElementById("btnStopNow"),
        btnStopCycle: document.getElementById("btnStopCycle"),
        beatGrid: document.getElementById("beatGrid"),
        statusNotice: document.getElementById("taalStatusNotice")
      };
    },

    /**
     * Intercepts button clicks to prevent unwanted form submits and maintain static behavior for Part 2.
     */
    setupButtonInterceptors: function () {
      const { btnPlay, btnStopNow, btnStopCycle, btnHalveTempo, btnDoubleTempo } = this.elements;

      [btnPlay, btnStopNow, btnStopCycle, btnHalveTempo, btnDoubleTempo].forEach(function (button) {
        if (button) {
          button.addEventListener("click", function (e) {
            e.preventDefault();
            // In Part 2, playback and calculations remain inactive by specification.
          });
        }
      });
    },

    /**
     * Loads Taal data asynchronously via TaalLoader and renders the UI.
     * @param {string} dataUrl - Path to taals.json file.
     */
    loadAndInitializeData: async function (dataUrl) {
      if (!window.TaalLoader || !window.TaalRenderer) {
        console.error("[TablaTaalEngine] Required helper modules (TaalLoader, TaalRenderer) are not loaded.");
        return;
      }

      const result = await window.TaalLoader.load(dataUrl);

      // Render any diagnostic status notices (isolated errors or warnings)
      if (this.elements.statusNotice) {
        window.TaalRenderer.renderStatusNotice(this.elements.statusNotice, result.errors, result.warnings);
      }

      if (!result.success || result.taals.length === 0) {
        console.error("[TablaTaalEngine] Failed to load any valid Taals from:", dataUrl);
        if (this.elements.beatGrid) {
          this.elements.beatGrid.innerHTML = `
            <div class="beat-grid-empty-message">
              <strong>Unable to load Taal data.</strong><br>
              ${result.errors.length > 0 ? result.errors[0] : "Please check data/taals.json."}
            </div>
          `;
        }
        return;
      }

      this.taals = result.taals;

      // Select Tintaal by default if present, otherwise default to first valid Taal
      let defaultTaal = this.taals.find(function (t) {
        return t.id === "tintaal";
      });
      if (!defaultTaal) {
        defaultTaal = this.taals[0];
      }

      this.currentTaal = defaultTaal;
      this.activeBeat = 1;

      // 1. Render dynamic Taal dropdown selector
      window.TaalRenderer.renderSelector(
        this.elements.taalSelect,
        this.taals,
        this.currentTaal.id,
        this.onTaalSelect.bind(this)
      );

      // 2. Render dynamic beat grid for the default Taal
      window.TaalRenderer.renderBeatGrid(
        this.elements.beatGrid,
        this.currentTaal,
        this.activeBeat
      );

      console.log(
        "%c[Tabla Taal Engine]%c Part 2 loaded successfully with " + this.taals.length + " Taals. Active Taal: " + this.currentTaal.name,
        "color: #D4AF37; font-weight: bold;",
        "color: inherit;"
      );
    },

    /**
     * Event listener triggered when the user chooses a different Taal.
     * Updates the beat grid immediately. Never starts playback.
     * @param {string} selectedTaalId - ID of the selected Taal.
     */
    onTaalSelect: function (selectedTaalId) {
      const chosenTaal = this.taals.find(function (t) {
        return t.id === selectedTaalId;
      });

      if (!chosenTaal) {
        console.warn("[TablaTaalEngine] Selected Taal ID not found in loaded database:", selectedTaalId);
        return;
      }

      this.currentTaal = chosenTaal;
      this.activeBeat = 1;

      // Re-render beat grid immediately for the newly selected Taal
      window.TaalRenderer.renderBeatGrid(
        this.elements.beatGrid,
        this.currentTaal,
        this.activeBeat
      );

      // Ensure playback is NOT started
      console.log("[TablaTaalEngine] Switched to Taal:", chosenTaal.name, "(" + chosenTaal.beats + " beats). Playback idle.");
    },

    /**
     * Public API helper to programmatically set the active beat.
     * Prepared for Part 3 visual progression.
     * @param {number} beatNumber - 1-indexed beat number.
     */
    setActiveBeat: function (beatNumber) {
      if (!this.currentTaal) return;
      const validNum = Math.max(1, Math.min(this.currentTaal.beats, beatNumber));
      this.activeBeat = validNum;
      if (this.elements.beatGrid && window.TaalRenderer) {
        window.TaalRenderer.setActiveBeat(this.elements.beatGrid, validNum);
      }
    },

    /**
     * Public API helper to programmatically switch Taal.
     * @param {string} taalId - Unique ID of the target Taal.
     */
    selectTaal: function (taalId) {
      if (this.elements.taalSelect) {
        this.elements.taalSelect.value = taalId;
      }
      this.onTaalSelect(taalId);
    }
  };

  // Expose application globally
  window.TablaTaalEngine = TablaTaalEngine;

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      TablaTaalEngine.init();
    });
  } else {
    TablaTaalEngine.init();
  }
})();
