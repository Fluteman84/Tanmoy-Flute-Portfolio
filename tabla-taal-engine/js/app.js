/**
 * Tabla Taal Engine — Part 1: Static User Interface Controller
 * 
 * NOTE (Architecture & Strict Instructions):
 * - Independent module with zero external dependencies.
 * - Sound generation, metronome timing, and automatic beat progression
 *   are strictly reserved for subsequent parts (Part 2 to Part 5).
 * - This file handles static DOM references, element initialization,
 *   and provides a clean API surface for future dynamic phases.
 */

(function () {
  "use strict";

  // Application namespace
  const TablaTaalEngine = {
    version: "1.0.0",
    stage: "Part 1 — Static UI",
    elements: {},

    /**
     * Initializes static UI components and DOM references
     */
    init: function () {
      this.cacheDOMElements();
      this.setupStaticEventInterceptors();
      console.log(
        "%c[Tabla Taal Engine]%c Static User Interface initialized successfully (Part 1).",
        "color: #D4AF37; font-weight: bold;",
        "color: inherit;"
      );
    },

    /**
     * Cache references to static UI controls
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
        beatCells: document.querySelectorAll(".beat-cell")
      };
    },

    /**
     * Intercepts button clicks during Part 1 to prevent unexpected form submits
     * and sets up groundwork for Part 2/3 handlers.
     */
    setupStaticEventInterceptors: function () {
      const { btnPlay, btnStopNow, btnStopCycle, btnHalveTempo, btnDoubleTempo, taalSelect } = this.elements;

      // Ensure buttons do not trigger form submission or reloads
      [btnPlay, btnStopNow, btnStopCycle, btnHalveTempo, btnDoubleTempo].forEach(function (button) {
        if (button) {
          button.addEventListener("click", function (e) {
            e.preventDefault();
            // In Part 1, playback and calculations are inactive by specification.
          });
        }
      });

      // Ensure selecting a Taal does not trigger any premature playback
      if (taalSelect) {
        taalSelect.addEventListener("change", function () {
          // Prepared for Part 2 dynamic data loading
        });
      }
    },

    /**
     * Visual state helper: updates the active beat cell.
     * Prepared for Part 3 visual progression.
     * @param {number} beatNumber - 1-indexed beat number to highlight
     */
    setActiveBeat: function (beatNumber) {
      const cells = document.querySelectorAll(".beat-cell");
      cells.forEach(function (cell) {
        const num = parseInt(cell.getAttribute("data-beat"), 10);
        if (num === beatNumber) {
          cell.classList.add("active");
        } else {
          cell.classList.remove("active");
        }
      });
    }
  };

  // Expose namespace cleanly on window for future phase integration
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
