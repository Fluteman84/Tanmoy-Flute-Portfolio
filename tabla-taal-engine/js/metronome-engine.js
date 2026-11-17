/**
 * Tabla Taal Engine — High-Resolution Drift-Resistant Metronome Engine
 * 
 * Module: MetronomeEngine
 * Responsibilities:
 * - High-resolution monotonic timing via performance.now() and Web Audio API
 * - Drift-compensated deadline scheduling (no setInterval)
 * - Complete playback state machine:
 *     STOPPED | PLAYING | PAUSED | STOPPING_AFTER_CYCLE | PAUSED_AFTER_CYCLE_REQUEST
 * - Instant Pause/Resume mechanism preserving beat position, cycle counter, and pending stop requests
 * - Seamless mid-playback tempo adjustment at next beat boundary
 * - Synchronized audio and visual beat progression against the absolute beat timeline
 * - Immediate stop (STOP NOW) with instant audio cutoff
 * - Graceful cycle completion (STOP AFTER CYCLE) with natural final beat ring-out
 * - Background tab timing recovery via visibilitychange
 */

(function () {
  "use strict";

  const MetronomeEngine = {
    // Playback States
    STATE_STOPPED: "STOPPED",
    STATE_PLAYING: "PLAYING",
    STATE_PAUSED: "PAUSED",
    STATE_STOPPING_AFTER_CYCLE: "STOPPING_AFTER_CYCLE",
    STATE_PAUSED_AFTER_CYCLE_REQUEST: "PAUSED_AFTER_CYCLE_REQUEST",

    // State Variables
    state: "STOPPED",
    bpm: 120,
    totalBeats: 16,
    currentBeat: 1,
    currentCycle: 1,

    // Active Taal & Audio Engine Reference
    currentTaal: null,
    audioEngine: null,

    // Internal Timing Control (Monotonic JS & Web Audio)
    _timerId: null,
    _sessionToken: null,
    _nextBeatExpectedTime: 0,
    _nextBeatAudioTime: 0,
    _stopAfterCycleRequested: false,

    // Callbacks
    onBeat: null,        // function(beatNumber, cycleNumber, state, metronome)
    onCycle: null,       // function(cycleNumber)
    onStop: null,        // function()
    onStateChange: null, // function(newState)
    onScheduleBeat: null,// function(beatNumber, cycleNumber, targetAudioTime, metronome)

    /**
     * Initializes the engine with initial settings and listeners.
     */
    init: function () {
      this.state = this.STATE_STOPPED;
      this.bpm = 120;
      this.currentBeat = 1;
      this.currentCycle = 1;
      this._stopAfterCycleRequested = false;
      this.audioEngine = window.AudioEngine || null;

      // Handle background tab throttling recovery
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", this._handleVisibilityChange.bind(this));
      }
    },

    /**
     * Configures the active Taal metadata and sets total beats.
     * @param {Object} taal - Taal metadata object.
     */
    setTaal: function (taal) {
      this.currentTaal = taal || null;
      if (taal && typeof taal.beats === "number" && taal.beats > 0) {
        this.setTotalBeats(taal.beats);
      }
    },

    /**
     * Configures the total beats for the active Taal.
     * @param {number} totalBeats - Positive integer count of beats in the Taal.
     */
    setTotalBeats: function (totalBeats) {
      if (typeof totalBeats === "number" && totalBeats > 0) {
        this.totalBeats = Math.floor(totalBeats);
      }
    },

    /**
     * Sets a new tempo (BPM). Clamped to 20..300 BPM.
     * If playing, applies the new interval at the next beat boundary without resetting beat or cycle.
     * If paused, preserves beat/cycle/stop request and applies when resumed.
     * @param {number} newBpm - Target tempo in Beats Per Minute.
     * @returns {number} The sanitized BPM applied.
     */
    setBpm: function (newBpm) {
      const parsed = Number(newBpm);
      if (isNaN(parsed) || !isFinite(parsed)) {
        return this.bpm;
      }

      // Keep the upcoming deadline. The next beat schedules the new interval.
      this.bpm = Math.max(20, Math.min(300, Math.round(parsed)));
      return this.bpm;
    },

    /**
     * Starts playback from Beat 1, Cycle 1 (or delegates to resume if currently paused).
     * Guarded against duplicate calls.
     */
    start: function () {
      if (this.state === this.STATE_PLAYING || this.state === this.STATE_STOPPING_AFTER_CYCLE) {
        return; // Already playing
      }

      if (this.state === this.STATE_PAUSED || this.state === this.STATE_PAUSED_AFTER_CYCLE_REQUEST) {
        return this.resume();
      }

      // Refresh AudioEngine reference if needed
      if (!this.audioEngine && window.AudioEngine) {
        this.audioEngine = window.AudioEngine;
      }

      // Generate a unique session token to invalidate any older callbacks
      const session = {};
      this._sessionToken = session;

      this.state = this.STATE_PLAYING;
      this._stopAfterCycleRequested = false;
      this.currentBeat = 1;
      this.currentCycle = 1;

      this._beginBeatTimeline(session);
    },

    /**
     * Pauses playback immediately.
     * Freezes current beat, cycle, Taal, and preserves any pending stop-after-cycle request.
     * Silences all playing audio immediately.
     */
    pause: function () {
      if (this.state !== this.STATE_PLAYING && this.state !== this.STATE_STOPPING_AFTER_CYCLE) {
        return; // Only active playback can be paused
      }

      // Invalidate session token to prevent scheduled callbacks from firing
      this._sessionToken = null;
      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
      }

      // Immediately silence any currently playing or scheduled audio
      if (this.audioEngine && typeof this.audioEngine.stopAll === "function") {
        this.audioEngine.stopAll();
      }

      // Transition to appropriate paused state preserving pending stop-after-cycle
      if (this._stopAfterCycleRequested) {
        this.state = this.STATE_PAUSED_AFTER_CYCLE_REQUEST;
      } else {
        this.state = this.STATE_PAUSED;
      }

      this._notifyStateChange();
    },

    /**
     * Resumes playback from the preserved beat position and cycle counter.
     * Plays the appropriate sample for the preserved beat and resumes progression.
     */
    resume: function () {
      if (this.state !== this.STATE_PAUSED && this.state !== this.STATE_PAUSED_AFTER_CYCLE_REQUEST) {
        return; // Only paused state can be resumed
      }

      // Refresh AudioEngine reference if needed
      if (!this.audioEngine && window.AudioEngine) {
        this.audioEngine = window.AudioEngine;
      }

      const session = {};
      this._sessionToken = session;

      // Transition back to PLAYING or STOPPING_AFTER_CYCLE
      if (this._stopAfterCycleRequested) {
        this.state = this.STATE_STOPPING_AFTER_CYCLE;
      } else {
        this.state = this.STATE_PLAYING;
      }

      this._beginBeatTimeline(session);
    },

    _beginBeatTimeline: function (session) {
      const now = performance.now();
      const audioNow = this.audioEngine?.ctx?.currentTime ?? 0;
      const leadInSec = 0.025;
      this._nextBeatExpectedTime = now + leadInSec * 1000 + 60000 / this.bpm;
      this._nextBeatAudioTime = audioNow + leadInSec + 60 / this.bpm;

      this._notifyStateChange();
      this._triggerAudioForBeat(this.currentBeat, this.currentCycle, audioNow + leadInSec);
      this._notifyBeat();
      this._scheduleNextTick(session);
    },

    /**
     * Triggers audio playback for the given beat against the Web Audio timeline.
     * @param {number} beatNumber
     * @param {number} cycleNumber
     * @param {number} targetAudioTime
     */
    _triggerAudioForBeat: function (beatNumber, cycleNumber, targetAudioTime) {
      if (this.audioEngine && this.audioEngine.status === "READY") {
        const category = this.audioEngine.getSoundCategory(this.currentTaal, beatNumber);
        this.audioEngine.playBeat(category, targetAudioTime);
      }
      if (typeof this.onScheduleBeat === "function") {
        this.onScheduleBeat(beatNumber, cycleNumber, targetAudioTime, this);
      }
    },

    /**
     * Schedules the next beat deadline against the monotonic timeline.
     * @param {Object} session - The current session token.
     */
    _scheduleNextTick: function (session) {
      if (this._sessionToken !== session || this.state === this.STATE_STOPPED || this.state === this.STATE_PAUSED || this.state === this.STATE_PAUSED_AFTER_CYCLE_REQUEST) {
        return;
      }

      const now = performance.now();
      const delay = Math.max(0, this._nextBeatExpectedTime - now);

      this._timerId = setTimeout(() => {
        this._tick(session);
      }, delay);
    },

    /**
     * Executes on every scheduled beat boundary.
     * Synchronously triggers Web Audio sample, schedules next tick, and dispatches visual update.
     * @param {Object} session - The session token for validation.
     */
    _tick: function (session) {
      // Invalidate if session token has changed or state is not active
      if (this._sessionToken !== session || this.state === this.STATE_STOPPED || this.state === this.STATE_PAUSED || this.state === this.STATE_PAUSED_AFTER_CYCLE_REQUEST) {
        return;
      }

      const intervalMs = 60000 / this.bpm;
      if (performance.now() >= this._nextBeatExpectedTime + intervalMs) {
        this._recoverMissedBeats();
        return;
      }

      // Let the final sample finish naturally, without starting another cycle.
      if (this._stopAfterCycleRequested && this.currentBeat === this.totalBeats) {
        this._finishPlayback(false);
        return;
      }

      // 2. Advance beat and cycle counter
      if (this.currentBeat >= this.totalBeats) {
        this.currentBeat = 1;
        this.currentCycle += 1;
        if (typeof this.onCycle === "function") {
          this.onCycle(this.currentCycle);
        }
      } else {
        this.currentBeat += 1;
      }

      const targetAudioTime = this._nextBeatAudioTime;
      this._nextBeatAudioTime += intervalMs / 1000;
      this._nextBeatExpectedTime += intervalMs;
      this._triggerAudioForBeat(this.currentBeat, this.currentCycle, targetAudioTime);

      // 5. Schedule the subsequent tick before rendering
      this._scheduleNextTick(session);

      // 6. Dispatch visual rendering through requestAnimationFrame
      this._notifyBeat();
    },

    /**
     * Requests immediate termination of playback.
     * Cancels all timers, stops and silences all audio samples, resets position to Beat 1,
     * cycle to 1, clears pending cycle stop requests, and restores STOPPED state.
     */
    stopImmediate: function () {
      this._finishPlayback(true);
    },

    _finishPlayback: function (silence) {
      // Invalidate session immediately
      this._sessionToken = null;

      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
      }

      // Stop all currently playing or scheduled audio immediately
      if (silence && this.audioEngine && typeof this.audioEngine.stopAll === "function") {
        this.audioEngine.stopAll();
      }

      this.state = this.STATE_STOPPED;
      this._stopAfterCycleRequested = false;
      this.currentBeat = 1;
      this.currentCycle = 1;

      this._notifyStateChange();

      if (typeof this.onStop === "function") {
        this.onStop();
      }

      // Reset visual state to Beat 1
      this._notifyBeat();
    },

    /**
     * Alias for stopImmediate.
     */
    stop: function () {
      this.stopImmediate();
    },

    /**
     * Requests termination after completing the current Taal cycle.
     * If playing, continues until the final beat of ongoing cycle, then stops.
     * If paused, registers the pending stop request and remains paused until resumed.
     */
    stopAfterCycle: function () {
      if (this.state === this.STATE_PLAYING) {
        this._stopAfterCycleRequested = true;
        this.state = this.STATE_STOPPING_AFTER_CYCLE;
        this._notifyStateChange();
      } else if (this.state === this.STATE_PAUSED) {
        this._stopAfterCycleRequested = true;
        this.state = this.STATE_PAUSED_AFTER_CYCLE_REQUEST;
        this._notifyStateChange();
      }
    },

    cancelStopAfterCycle: function () {
      if (!this._stopAfterCycleRequested) return;
      this._stopAfterCycleRequested = false;
      this.state = this.state === this.STATE_PAUSED_AFTER_CYCLE_REQUEST
        ? this.STATE_PAUSED
        : this.STATE_PLAYING;
      this._notifyStateChange();
    },

    /**
     * Dispatches visual update using requestAnimationFrame.
     */
    _notifyBeat: function () {
      if (typeof this.onBeat === "function") {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => {
            if (typeof this.onBeat === "function") {
              this.onBeat(this.currentBeat, this.currentCycle, this.state, this);
            }
          });
        } else {
          this.onBeat(this.currentBeat, this.currentCycle, this.state, this);
        }
      }
    },

    /**
     * Dispatches state change notification.
     */
    _notifyStateChange: function () {
      if (typeof this.onStateChange === "function") {
        this.onStateChange(this.state);
      }
    },

    /**
     * Handles visibility change when tab is switched or restored.
     * Prevents timing drift and rapid burst animations.
     */
    _handleVisibilityChange: function () {
      if (typeof document === "undefined" || document.hidden) {
        return; // Tab became hidden
      }

      // Tab became visible again
      if (this.state !== this.STATE_PLAYING && this.state !== this.STATE_STOPPING_AFTER_CYCLE) {
        return; // Paused or stopped: do not advance
      }

      this._recoverMissedBeats();
    },

    _recoverMissedBeats: function () {
      const now = performance.now();
      const delay = now - this._nextBeatExpectedTime;
      const intervalMs = 60000 / this.bpm;
      if (delay < intervalMs) return;

      const beatsAdvanced = 1 + Math.floor(delay / intervalMs);
      if (this._stopAfterCycleRequested && beatsAdvanced > this.totalBeats - this.currentBeat) {
        this._finishPlayback(false);
        return;
      }

      const beatIndex = this.currentBeat - 1 + beatsAdvanced;
      const cyclesAdvanced = Math.floor(beatIndex / this.totalBeats);
      this.currentCycle += cyclesAdvanced;
      this.currentBeat = (beatIndex % this.totalBeats) + 1;
      if (cyclesAdvanced && typeof this.onCycle === "function") this.onCycle(this.currentCycle);

      this._nextBeatExpectedTime += beatsAdvanced * intervalMs;
      const audioNow = this.audioEngine?.ctx?.currentTime ?? 0;
      this._nextBeatAudioTime = audioNow + (this._nextBeatExpectedTime - now) / 1000;

      if (this._timerId) clearTimeout(this._timerId);
      this._scheduleNextTick(this._sessionToken);
      this._notifyBeat();
    }
  };

  MetronomeEngine.init();

  // Expose module globally
  window.MetronomeEngine = MetronomeEngine;
})();
