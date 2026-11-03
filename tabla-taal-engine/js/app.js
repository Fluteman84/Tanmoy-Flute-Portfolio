/**
 * Tabla Taal Engine — Main Application Controller (Combined Parts 3, 4, 5)
 * 
 * NOTE (Architecture & Strict Instructions):
 * - Independent module with zero external dependencies.
 * - Dynamic data-driven architecture: data/taals.json is the single source of truth.
 * - Monotonic drift-resistant timing through MetronomeEngine.
 * - Complete playback controls (Play, Stop Now, Stop After Cycle).
 * - Full visual indicators: Sam, Tali, Khali, Vibhags, and Live Cycle/Metric Bar.
 * - Strictly visual-only; ZERO audio/sound output.
 */

(function () {
  "use strict";

  const TablaTaalEngine = {
    version: "3.1.0",
    stage: "Audio Playback & Metronome Synchronization",
    elements: {},
    taals: [],
    currentTaal: null,
    metronome: null,
    audioEngine: null,

    /**
     * Initializes the application once the DOM is ready.
     * @param {string} [dataPath] - Optional custom path to taals.json.
     */
    init: async function (dataPath) {
      if (this.initialized) return;
      this.initialized = true;

      this.cacheDOMElements();
      this.initAudioEngine();
      this.initMetronomeEngine();
      this.setupControlEventListeners();

      const resolvedPath = dataPath || window.__TABLA_DATA_PATH__ || "data/taals.json";
      await this.loadAndInitializeData(resolvedPath);

      // Preload audio samples in background without playing sound
      if (this.audioEngine) {
        this.audioEngine.loadSamples().catch((err) => {
          console.warn("[TablaTaalEngine] Background audio preload notice:", err);
        });
      }
    },

    /**
     * Initializes and binds the AudioEngine module.
     */
    initAudioEngine: function () {
      this.audioEngine = window.AudioEngine || null;
      if (!this.audioEngine) {
        console.warn("[TablaTaalEngine] AudioEngine module missing.");
        return;
      }

      this.audioEngine.onStatusChange = (status, errorMsg) => {
        this.updatePlaybackInfoDisplay(
          this.metronome ? this.metronome.currentBeat : 1,
          this.metronome ? this.metronome.currentCycle : 1,
          this.metronome ? this.metronome.state : "STOPPED"
        );

        if (status === "ERROR" && errorMsg && this.elements.statusNotice && window.TaalRenderer) {
          window.TaalRenderer.renderStatusNotice(
            this.elements.statusNotice,
            ["Audio Notice: " + errorMsg],
            []
          );
        }
      };
    },

    /**
     * Cache references to UI controls, playback buttons, and dynamic containers.
     */
    cacheDOMElements: function () {
      this.elements = {
        taalSelect: document.getElementById("taalSelect"),
        tempoInput: document.getElementById("tempoInput"),
        btnStepperUp: document.getElementById("btnStepperUp"),
        btnStepperDown: document.getElementById("btnStepperDown"),
        btnHalveTempo: document.getElementById("btnHalveTempo"),
        btnDoubleTempo: document.getElementById("btnDoubleTempo"),
        btnPlay: document.getElementById("btnPlay"),
        btnStopNow: document.getElementById("btnStopNow"),
        btnStopCycle: document.getElementById("btnStopCycle"),
        beatGrid: document.getElementById("beatGrid"),
        playbackInfoBar: document.getElementById("playbackInfoBar"),
        statusNotice: document.getElementById("taalStatusNotice")
      };
    },

    /**
     * Initializes and binds the MetronomeEngine module.
     */
    initMetronomeEngine: function () {
      this.metronome = window.MetronomeEngine;
      if (!this.metronome) {
        console.error("[TablaTaalEngine] MetronomeEngine module missing.");
        return;
      }

      this.metronome.audioEngine = this.audioEngine || window.AudioEngine || null;

      // 1. On every beat progression
      this.metronome.onBeat = (beatNumber, cycleNumber, state) => {
        // Highlight active cell
        if (this.elements.beatGrid && window.TaalRenderer) {
          window.TaalRenderer.setActiveBeat(this.elements.beatGrid, beatNumber);
        }

        // Update live playback metrics
        this.updatePlaybackInfoDisplay(beatNumber, cycleNumber, state);
      };

      // 2. On playback state change (STOPPED | PLAYING | STOPPING_AFTER_CYCLE)
      this.metronome.onStateChange = (newState) => {
        if (window.TaalRenderer) {
          window.TaalRenderer.updateButtonStates(
            {
              btnPlay: this.elements.btnPlay,
              btnStopNow: this.elements.btnStopNow,
              btnStopCycle: this.elements.btnStopCycle
            },
            newState
          );
        }
        this.updatePlaybackInfoDisplay(this.metronome.currentBeat, this.metronome.currentCycle, newState);
      };

      // 3. On stop
      this.metronome.onStop = () => {
        if (this.elements.beatGrid && window.TaalRenderer) {
          window.TaalRenderer.setActiveBeat(this.elements.beatGrid, 1);
        }
        this.updatePlaybackInfoDisplay(1, 1, this.metronome.STATE_STOPPED);
      };
    },

    /**
     * Updates the live playback info bar with current values.
     */
    updatePlaybackInfoDisplay: function (beatNumber, cycleNumber, state) {
      if (!this.elements.playbackInfoBar || !window.TaalRenderer || !this.currentTaal) return;

      let currentVibhag = null;
      let totalVibhags = null;

      if (Array.isArray(this.currentTaal.vibhags) && this.currentTaal.vibhags.length > 0) {
        totalVibhags = this.currentTaal.vibhags.length;
        let cumulative = 0;
        for (let i = 0; i < this.currentTaal.vibhags.length; i++) {
          cumulative += this.currentTaal.vibhags[i];
          if (beatNumber <= cumulative) {
            currentVibhag = i + 1;
            break;
          }
        }
      }

      window.TaalRenderer.renderPlaybackInfo(this.elements.playbackInfoBar, {
        taalName: this.currentTaal.name,
        bpm: this.metronome ? this.metronome.bpm : 80,
        currentBeat: beatNumber,
        totalBeats: this.currentTaal.beats,
        currentCycle: cycleNumber,
        currentVibhag: currentVibhag,
        totalVibhags: totalVibhags,
        state: state,
        soundStatus: this.audioEngine ? this.audioEngine.status : "READY"
      });
    },

    /**
     * Sets up event listeners for all playback buttons, tempo inputs, and steppers.
     */
    setupControlEventListeners: function () {
      const {
        btnPlay,
        btnStopNow,
        btnStopCycle,
        btnHalveTempo,
        btnDoubleTempo,
        tempoInput,
        btnStepperUp,
        btnStepperDown
      } = this.elements;

      // Play button
      if (btnPlay) {
        btnPlay.addEventListener("click", async (e) => {
          e.preventDefault();
          if (!this.metronome) return;
          if (this.metronome.state === "PLAYING" || this.metronome.state === "STOPPING_AFTER_CYCLE") {
            return;
          }

          // Audio initialization & user-gesture resumption
          if (this.audioEngine) {
            if (this.audioEngine.status === "UNINITIALIZED" || this.audioEngine.status === "LOADING") {
              this.updatePlaybackInfoDisplay(1, 1, "LOADING");
              const loaded = await this.audioEngine.loadSamples();
              if (!loaded) {
                if (this.elements.statusNotice && window.TaalRenderer) {
                  window.TaalRenderer.renderStatusNotice(
                    this.elements.statusNotice,
                    [this.audioEngine.errorMessage || "Audio initialization failed. Check Sounds/ directory."],
                    []
                  );
                }
                return;
              }
            } else if (this.audioEngine.status === "ERROR") {
              if (this.elements.statusNotice && window.TaalRenderer) {
                window.TaalRenderer.renderStatusNotice(
                  this.elements.statusNotice,
                  [this.audioEngine.errorMessage || "Audio files are unavailable."],
                  []
                );
              }
              return;
            }

            // Ensure AudioContext is actively running
            await this.audioEngine.ensureContext();
          }

          if (this.metronome) {
            this.metronome.setTaal(this.currentTaal);
            this.metronome.start();
          }
        });
      }

      // Stop Now button
      if (btnStopNow) {
        btnStopNow.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.metronome) {
            this.metronome.stopImmediate();
          }
        });
      }

      // Stop After Cycle button
      if (btnStopCycle) {
        btnStopCycle.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.metronome) {
            this.metronome.stopAfterCycle();
          }
        });
      }

      // Tempo input validation and change handler
      if (tempoInput) {
        const handleTempoChange = () => {
          let val = parseInt(tempoInput.value, 10);
          if (isNaN(val)) {
            val = this.metronome ? this.metronome.bpm : 80;
          }
          const clamped = Math.max(20, Math.min(300, val));
          tempoInput.value = clamped;
          if (this.metronome) {
            this.metronome.setBpm(clamped);
          }
          this.updatePlaybackInfoDisplay(
            this.metronome ? this.metronome.currentBeat : 1,
            this.metronome ? this.metronome.currentCycle : 1,
            this.metronome ? this.metronome.state : "STOPPED"
          );
        };

        tempoInput.addEventListener("change", handleTempoChange);
        tempoInput.addEventListener("blur", handleTempoChange);

        // Stepper buttons
        if (btnStepperUp) {
          btnStepperUp.addEventListener("click", (e) => {
            e.preventDefault();
            const current = parseInt(tempoInput.value, 10) || 80;
            const updated = Math.min(300, current + 1);
            tempoInput.value = updated;
            handleTempoChange();
          });
        }

        if (btnStepperDown) {
          btnStepperDown.addEventListener("click", (e) => {
            e.preventDefault();
            const current = parseInt(tempoInput.value, 10) || 80;
            const updated = Math.max(20, current - 1);
            tempoInput.value = updated;
            handleTempoChange();
          });
        }
      }

      // Halve tempo (÷2)
      if (btnHalveTempo) {
        btnHalveTempo.addEventListener("click", (e) => {
          e.preventDefault();
          const current = this.metronome ? this.metronome.bpm : 80;
          const halved = Math.max(20, Math.floor(current / 2));
          if (tempoInput) tempoInput.value = halved;
          if (this.metronome) this.metronome.setBpm(halved);
          this.updatePlaybackInfoDisplay(
            this.metronome ? this.metronome.currentBeat : 1,
            this.metronome ? this.metronome.currentCycle : 1,
            this.metronome ? this.metronome.state : "STOPPED"
          );
        });
      }

      // Double tempo (×2)
      if (btnDoubleTempo) {
        btnDoubleTempo.addEventListener("click", (e) => {
          e.preventDefault();
          const current = this.metronome ? this.metronome.bpm : 80;
          const doubled = Math.min(300, current * 2);
          if (tempoInput) tempoInput.value = doubled;
          if (this.metronome) this.metronome.setBpm(doubled);
          this.updatePlaybackInfoDisplay(
            this.metronome ? this.metronome.currentBeat : 1,
            this.metronome ? this.metronome.currentCycle : 1,
            this.metronome ? this.metronome.state : "STOPPED"
          );
        });
      }
    },

    /**
     * Loads Taal data asynchronously and renders UI components.
     * @param {string} dataUrl - Path to taals.json.
     */
    loadAndInitializeData: async function (dataUrl) {
      if (!window.TaalLoader || !window.TaalRenderer) {
        console.error("[TablaTaalEngine] TaalLoader or TaalRenderer module missing.");
        return;
      }

      let result = await window.TaalLoader.load(dataUrl);

      // If initial load failed with default path, attempt fallback to standalone folder
      if ((!result.success || result.taals.length === 0) && dataUrl === "data/taals.json") {
        try {
          const fallbackResult = await window.TaalLoader.load("tabla-taal-engine/data/taals.json");
          if (fallbackResult.success && fallbackResult.taals.length > 0) {
            result = fallbackResult;
          }
        } catch (e) {}
      }

      // Render diagnostic notice if errors/warnings exist
      if (this.elements.statusNotice) {
        window.TaalRenderer.renderStatusNotice(this.elements.statusNotice, result.errors, result.warnings);
      }

      if (!result.success || result.taals.length === 0) {
        console.error("[TablaTaalEngine] Failed to load any valid Taals.");
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

      // Select Tintaal by default if present, otherwise first available Taal
      let defaultTaal = this.taals.find((t) => t.id === "tintaal");
      if (!defaultTaal) {
        defaultTaal = this.taals[0];
      }

      this.currentTaal = defaultTaal;
      if (this.metronome) {
        this.metronome.setTaal(this.currentTaal);
      }

      // 1. Render dynamic Taal selector
      window.TaalRenderer.renderSelector(
        this.elements.taalSelect,
        this.taals,
        this.currentTaal.id,
        this.onTaalSelect.bind(this)
      );

      // 2. Render beat grid with Sam, Tali, Khali, Vibhag indicators
      window.TaalRenderer.renderBeatGrid(
        this.elements.beatGrid,
        this.currentTaal,
        1
      );

      // 3. Render initial playback info bar
      this.updatePlaybackInfoDisplay(1, 1, "STOPPED");

      // 4. Set initial button states (Play enabled; Stops disabled)
      window.TaalRenderer.updateButtonStates(
        {
          btnPlay: this.elements.btnPlay,
          btnStopNow: this.elements.btnStopNow,
          btnStopCycle: this.elements.btnStopCycle
        },
        "STOPPED"
      );

      console.log(
        "%c[Tabla Taal Engine]%c Visual Metronome Engine initialized. Active: " + this.currentTaal.name,
        "color: #D4AF37; font-weight: bold;",
        "color: inherit;"
      );
    },

    /**
     * Handles selection of a different Taal.
     * Safely terminates any active playback, resets position to Beat 1, preserves BPM, and never auto-plays.
     * @param {string} selectedTaalId - Target Taal ID.
     */
    onTaalSelect: function (selectedTaalId) {
      const chosenTaal = this.taals.find((t) => t.id === selectedTaalId);
      if (!chosenTaal) return;

      // 1. Stop any ongoing playback immediately
      if (this.metronome) {
        this.metronome.stopImmediate();
      }

      this.currentTaal = chosenTaal;

      // 2. Configure metronome active Taal and total beats
      if (this.metronome) {
        this.metronome.setTaal(this.currentTaal);
      }

      // 3. Re-render beat grid
      if (window.TaalRenderer && this.elements.beatGrid) {
        window.TaalRenderer.renderBeatGrid(this.elements.beatGrid, this.currentTaal, 1);
      }

      // 4. Update playback info display to idle
      this.updatePlaybackInfoDisplay(1, 1, "STOPPED");

      // 5. Ensure button states reflect STOPPED
      if (window.TaalRenderer) {
        window.TaalRenderer.updateButtonStates(
          {
            btnPlay: this.elements.btnPlay,
            btnStopNow: this.elements.btnStopNow,
            btnStopCycle: this.elements.btnStopCycle
          },
          "STOPPED"
        );
      }

      console.log("[TablaTaalEngine] Switched Taal to:", chosenTaal.name, ". Playback idle.");
    },

    /**
     * Programmatically switches Taal (helper for tests and integrations).
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
