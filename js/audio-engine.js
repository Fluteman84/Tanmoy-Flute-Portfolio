/**
 * Tabla Taal Engine — Dedicated Web Audio API Engine
 * 
 * Module: AudioEngine
 * Responsibilities:
 * - Preload and decode Sound1.wav and Sound2.wav into reusable AudioBuffers
 * - Dynamic sound mapping based on Taal metadata:
 *     Sound1 -> Sam, Tali, Khali
 *     Sound2 -> Normal / ordinary beats
 * - High-precision Web Audio scheduling via AudioBufferSourceNode
 * - Master volume management (~75% gain node)
 * - Immediate silence on STOP NOW via tracking active AudioBufferSourceNodes
 * - Resilient error handling and diagnostic reporting
 */

(function () {
  "use strict";

  const AudioEngine = {
    // Sound categories
    CATEGORY_SOUND1: "sound1", // Sam, Tali, Khali
    CATEGORY_SOUND2: "sound2", // Ordinary beats

    // Status: "UNINITIALIZED" | "LOADING" | "READY" | "ERROR"
    status: "UNINITIALIZED",
    errorMessage: "",
    resolvedSoundPaths: null,

    // Web Audio state
    ctx: null,
    masterGain: null,
    volume: 0.75,

    // Decoded audio buffers
    sound1Buffer: null,
    sound2Buffer: null,

    // Active playing or scheduled source nodes (for immediate STOP NOW termination)
    activeSources: new Set(),

    // Callbacks
    onStatusChange: null, // function(newStatus, errorMessage)

    // Internal promise for deduplicating concurrent load calls
    _loadPromise: null,

    /**
     * Initializes the AudioEngine configuration.
     * @param {Object} [options]
     */
    init: function (options) {
      if (options && typeof options.volume === "number") {
        this.volume = Math.max(0, Math.min(1, options.volume));
      }
      this.status = "UNINITIALIZED";
      this.errorMessage = "";
      this._loadPromise = null;
    },

    /**
     * Ensures AudioContext exists and is running (resumed).
     * Must be called during or after a user interaction (e.g. Play button click).
     * @returns {Promise<boolean>} True if context is active.
     */
    ensureContext: async function () {
      try {
        if (!this.ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) {
            this.status = "ERROR";
            this.errorMessage = "Web Audio API is not supported in this browser.";
            this._notifyStatus();
            return false;
          }
          this.ctx = new AudioContextClass();
        }

        if (!this.masterGain && this.ctx) {
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = this.volume;
          this.masterGain.connect(this.ctx.destination);
        }

        if (this.ctx && this.ctx.state === "suspended") {
          await this.ctx.resume();
        }

        return this.ctx.state === "running";
      } catch (err) {
        console.error("[AudioEngine] Error ensuring AudioContext:", err);
        this.status = "ERROR";
        this.errorMessage = "Failed to activate AudioContext: " + (err.message || err);
        this._notifyStatus();
        return false;
      }
    },

    /**
     * Returns current hardware audio time from AudioContext.
     * @returns {number} AudioContext.currentTime in seconds.
     */
    getCurrentTime: function () {
      if (this.ctx) {
        return this.ctx.currentTime;
      }
      return (typeof performance !== "undefined" && performance.now)
        ? performance.now() / 1000
        : Date.now() / 1000;
    },

    /**
     * Preloads and decodes Sound1.wav and Sound2.wav into reusable AudioBuffers.
     * Tries candidate paths to ensure seamless execution in both root and standalone directory setups.
     * @param {Object} [customPaths] - Optional explicit { sound1, sound2 } paths.
     * @returns {Promise<boolean>} True if both samples loaded successfully.
     */
    loadSamples: async function (customPaths) {
      if (this.status === "READY" && this.sound1Buffer && this.sound2Buffer) {
        return true;
      }

      if (this._loadPromise) {
        return this._loadPromise;
      }

      this._loadPromise = (async () => {
        this.status = "LOADING";
        this.errorMessage = "";
        this._notifyStatus();

        // 1. Ensure AudioContext is ready for decoding
        try {
          if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
              throw new Error("Web Audio API not supported");
            }
            this.ctx = new AudioContextClass();
          }
          if (!this.masterGain && this.ctx) {
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
          }
        } catch (ctxErr) {
          this.status = "ERROR";
          this.errorMessage = "Failed to initialize Web Audio: " + (ctxErr.message || ctxErr);
          this._notifyStatus();
          this._loadPromise = null;
          return false;
        }

        // 2. Candidate paths
        const candidates = [];
        if (customPaths && customPaths.sound1 && customPaths.sound2) {
          candidates.push(customPaths);
        }
        if (window.__TABLA_SOUNDS_PATH__) {
          const base = window.__TABLA_SOUNDS_PATH__.replace(/\/+$/, "");
          candidates.push({
            sound1: base + "/Sound1.wav",
            sound2: base + "/Sound2.wav"
          });
        }
        // Relative paths for root and subfolder execution
        candidates.push({ sound1: "Sounds/Sound1.wav", sound2: "Sounds/Sound2.wav" });
        candidates.push({ sound1: "../Sounds/Sound1.wav", sound2: "../Sounds/Sound2.wav" });
        candidates.push({ sound1: "./Sounds/Sound1.wav", sound2: "./Sounds/Sound2.wav" });

        let chosenPair = null;
        let s1ArrayBuffer = null;
        let s2ArrayBuffer = null;
        let lastError = null;

        for (const cand of candidates) {
          try {
            const r1 = await fetch(cand.sound1);
            if (!r1.ok) continue;
            const r2 = await fetch(cand.sound2);
            if (!r2.ok) continue;

            s1ArrayBuffer = await r1.arrayBuffer();
            s2ArrayBuffer = await r2.arrayBuffer();
            chosenPair = cand;
            break;
          } catch (e) {
            lastError = e;
          }
        }

        if (!chosenPair || !s1ArrayBuffer || !s2ArrayBuffer) {
          this.status = "ERROR";
          this.errorMessage = "Unable to load audio files (Sound1.wav, Sound2.wav) from Sounds/ directory.";
          console.error("[AudioEngine] Sound loading failed across all candidate paths.", lastError);
          this._notifyStatus();
          this._loadPromise = null;
          return false;
        }

        // 3. Decode audio buffers
        try {
          const decode = (ab) => {
            return new Promise((resolve, reject) => {
              // Promise and callback syntax support for all browser versions
              const res = this.ctx.decodeAudioData(ab, resolve, reject);
              if (res && typeof res.then === "function") {
                res.then(resolve).catch(reject);
              }
            });
          };

          const [buf1, buf2] = await Promise.all([
            decode(s1ArrayBuffer),
            decode(s2ArrayBuffer)
          ]);

          this.sound1Buffer = buf1;
          this.sound2Buffer = buf2;
          this.resolvedSoundPaths = chosenPair;
          this.status = "READY";
          this.errorMessage = "";

          console.log(
            `%c[AudioEngine]%c Loaded & decoded: Sound1 (${buf1.duration.toFixed(2)}s) and Sound2 (${buf2.duration.toFixed(2)}s) from ${chosenPair.sound1}`,
            "color: #22C55E; font-weight: bold;",
            "color: inherit;"
          );

          this._notifyStatus();
          this._loadPromise = null;
          return true;
        } catch (decodeErr) {
          this.status = "ERROR";
          this.errorMessage = "Failed to decode WAV audio data: " + (decodeErr.message || decodeErr);
          console.error("[AudioEngine] Decode error:", decodeErr);
          this._notifyStatus();
          this._loadPromise = null;
          return false;
        }
      })();

      return this._loadPromise;
    },

    /**
     * Determines whether a given beat is Sound1 (Sam, Tali, Khali) or Sound2 (Normal).
     * Strictly driven by the Taal's JSON metadata without hardcoding beat positions.
     * Missing metadata or bol text does not crash or stop sound; it gracefully defaults to Sound2.
     * @param {Object} taal - Taal metadata object from taals.json.
     * @param {number} beatNumber - 1-based beat index.
     * @returns {"sound1"|"sound2"} The designated sound category.
     */
    getSoundCategory: function (taal, beatNumber) {
      if (!taal || typeof beatNumber !== "number") {
        return this.CATEGORY_SOUND2;
      }

      const isSam = (typeof taal.sam === "number" && taal.sam === beatNumber);
      const isTali = Array.isArray(taal.tali) && taal.tali.includes(beatNumber);
      const isKhali = Array.isArray(taal.khali) && taal.khali.includes(beatNumber);

      if (isSam || isTali || isKhali) {
        return this.CATEGORY_SOUND1;
      }
      return this.CATEGORY_SOUND2;
    },

    /**
     * Schedules a single beat sample on the Web Audio timeline.
     * Preserves original pitch (playbackRate = 1.0) and master volume (~75%).
     * Adds the node to activeSources so STOP NOW can terminate it immediately.
     * @param {"sound1"|"sound2"} category - Target sound category.
     * @param {number} [targetAudioTime] - AudioContext timeline target time in seconds.
     * @returns {AudioBufferSourceNode|null}
     */
    playBeat: function (category, targetAudioTime) {
      if (this.status !== "READY" || !this.ctx || !this.masterGain) {
        return null;
      }

      const buffer = (category === this.CATEGORY_SOUND1) ? this.sound1Buffer : this.sound2Buffer;
      if (!buffer) {
        console.warn("[AudioEngine] Requested buffer not loaded for category:", category);
        return null;
      }

      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 1.0; // Strictly preserve original sample pitch
        source.connect(this.masterGain);

        const currentAudioTime = this.ctx.currentTime;
        const startTime = (typeof targetAudioTime === "number" && targetAudioTime >= currentAudioTime)
          ? targetAudioTime
          : currentAudioTime;

        source.start(startTime);
        this.activeSources.add(source);

        source.onended = () => {
          this.activeSources.delete(source);
        };

        return source;
      } catch (err) {
        console.warn("[AudioEngine] Error playing beat sound:", err);
        return null;
      }
    },

    /**
     * Immediately stops and disconnects all currently playing or scheduled samples.
     * Clears all active source references.
     */
    stopAll: function () {
      this.activeSources.forEach((source) => {
        try {
          source.stop(0);
          source.disconnect();
        } catch (e) {
          // Source may have already terminated naturally
        }
      });
      this.activeSources.clear();
    },

    /**
     * Sets master volume level (0.0 to 1.0).
     * @param {number} level
     */
    setVolume: function (level) {
      if (typeof level === "number" && !isNaN(level)) {
        this.volume = Math.max(0, Math.min(1, level));
        if (this.masterGain) {
          this.masterGain.gain.value = this.volume;
        }
      }
    },

    /**
     * Dispatches status change notification.
     */
    _notifyStatus: function () {
      if (typeof this.onStatusChange === "function") {
        this.onStatusChange(this.status, this.errorMessage);
      }
    }
  };

  AudioEngine.init();

  // Expose module globally
  window.AudioEngine = AudioEngine;
})();
