/**
 * Tabla Taal Engine — High-Resolution Drift-Resistant Metronome Engine
 * 
 * Module: MetronomeEngine
 * Responsibilities:
 * - High-resolution monotonic timing via performance.now()
 * - Drift-compensated deadline scheduling (no setInterval)
 * - Playback state machine: STOPPED | PLAYING | STOPPING_AFTER_CYCLE
 * - Seamless mid-playback tempo adjustment at next beat boundary
 * - Immediate stop (STOP NOW) and graceful cycle completion (STOP AFTER CYCLE)
 * - Background tab timing recovery via visibilitychange (no rapid burst replays)
 * - Visual-only dispatch via requestAnimationFrame (Strictly ZERO audio output)
 */

(function () {
  "use strict";

  const MetronomeEngine = {
    // Playback States
    STATE_STOPPED: "STOPPED",
    STATE_PLAYING: "PLAYING",
    STATE_STOPPING_AFTER_CYCLE: "STOPPING_AFTER_CYCLE",

    // State Variables
    state: "STOPPED",
    bpm: 80,
    totalBeats: 16,
    currentBeat: 1,
    currentCycle: 1,

    // Internal Timing Control
    _timerId: null,
    _sessionToken: null,
    _timelineStart: 0,
    _intervalMs: 750,
    _beatsInCurrentSegment: 0,
    _nextBeatExpectedTime: 0,
    _stopAfterCycleRequested: false,

    // Callbacks
    onBeat: null,        // function(beatNumber, cycleNumber, state, metronome)
    onCycle: null,       // function(cycleNumber)
    onStop: null,        // function()
    onStateChange: null, // function(newState)

    /**
     * Initializes the engine with initial settings and listeners.
     */
    init: function () {
      this.state = this.STATE_STOPPED;
      this.bpm = 80;
      this._intervalMs = 60000 / this.bpm;
      this.currentBeat = 1;
      this.currentCycle = 1;

      // Handle background tab throttling recovery
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", this._handleVisibilityChange.bind(this));
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
     * @param {number} newBpm - Target tempo in Beats Per Minute.
     * @returns {number} The sanitized BPM applied.
     */
    setBpm: function (newBpm) {
      const parsed = Number(newBpm);
      if (isNaN(parsed) || !isFinite(parsed)) {
        return this.bpm;
      }

      const clamped = Math.max(20, Math.min(300, Math.round(parsed)));
      this.bpm = clamped;
      const newInterval = 60000 / clamped;

      if (this.state === this.STATE_PLAYING || this.state === this.STATE_STOPPING_AFTER_CYCLE) {
        // Re-anchor timeline seamlessly from the upcoming beat deadline
        this._timelineStart = this._nextBeatExpectedTime;
        this._beatsInCurrentSegment = 0;
        this._intervalMs = newInterval;
      } else {
        this._intervalMs = newInterval;
      }

      return this.bpm;
    },

    /**
     * Starts playback from Beat 1, Cycle 1.
     * Guarded against duplicate calls.
     */
    start: function () {
      if (this.state === this.STATE_PLAYING || this.state === this.STATE_STOPPING_AFTER_CYCLE) {
        return; // Already playing; prevent duplicate loops
      }

      // Generate a unique session token to invalidate any older callbacks
      const session = {};
      this._sessionToken = session;

      this.state = this.STATE_PLAYING;
      this._stopAfterCycleRequested = false;
      this.currentBeat = 1;
      this.currentCycle = 1;

      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      this._timelineStart = now;
      this._intervalMs = 60000 / this.bpm;
      this._beatsInCurrentSegment = 0;
      this._nextBeatExpectedTime = now + this._intervalMs;

      this._notifyStateChange();

      // Trigger Beat 1 visual update immediately
      this._notifyBeat();

      // Schedule subsequent beat
      this._scheduleNextTick(session);
    },

    /**
     * Schedules the next beat deadline against the monotonic timeline.
     * @param {Object} session - The current session token.
     */
    _scheduleNextTick: function (session) {
      if (this._sessionToken !== session || this.state === this.STATE_STOPPED) {
        return;
      }

      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      const delay = Math.max(0, this._nextBeatExpectedTime - now);

      this._timerId = setTimeout(() => {
        this._tick(session);
      }, delay);
    },

    /**
     * Executes on every scheduled beat boundary.
     * @param {Object} session - The session token for validation.
     */
    _tick: function (session) {
      // Invalidate if session token has changed or state is stopped
      if (this._sessionToken !== session || this.state === this.STATE_STOPPED) {
        return;
      }

      // 1. Check if STOP AFTER CYCLE was requested and the final beat was just completed
      if (this._stopAfterCycleRequested && this.currentBeat === this.totalBeats) {
        this.stopImmediate();
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

      // 3. Compute next expected timestamp on the monotonic timeline
      this._beatsInCurrentSegment += 1;
      this._nextBeatExpectedTime = this._timelineStart + (this._beatsInCurrentSegment + 1) * this._intervalMs;

      // 4. Schedule the subsequent tick before rendering
      this._scheduleNextTick(session);

      // 5. Dispatch visual rendering through requestAnimationFrame
      this._notifyBeat();
    },

    /**
     * Requests immediate termination of playback.
     * Cancels all timers, resets position to Beat 1, cycle to 1, and restores STOPPED state.
     */
    stopImmediate: function () {
      // Invalidate session immediately
      this._sessionToken = null;

      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
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
     * Requests termination after completing the current Taal cycle.
     * Playback continues until the final beat of the ongoing cycle, then stops before starting the next cycle.
     */
    stopAfterCycle: function () {
      if (this.state !== this.STATE_PLAYING) {
        return; // Inactive or already stopping
      }

      this._stopAfterCycleRequested = true;
      this.state = this.STATE_STOPPING_AFTER_CYCLE;
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
        return; // Tab became hidden; background timer continues
      }

      // Tab became visible again
      if (this.state !== this.STATE_PLAYING && this.state !== this.STATE_STOPPING_AFTER_CYCLE) {
        return;
      }

      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      const elapsed = Math.max(0, now - this._timelineStart);
      const totalElapsedBeats = Math.floor(elapsed / this._intervalMs);

      if (this._stopAfterCycleRequested) {
        const remainingInCycle = this.totalBeats - this.currentBeat;
        if (totalElapsedBeats >= remainingInCycle) {
          this.stopImmediate();
          return;
        }
      }

      // Calculate the logical beat and cycle from real elapsed time
      const beatsAdvanced = totalElapsedBeats - this._beatsInCurrentSegment;
      if (beatsAdvanced > 0) {
        const newTotalBeatIndex = (this.currentBeat - 1) + beatsAdvanced;
        this.currentCycle += Math.floor(newTotalBeatIndex / this.totalBeats);
        this.currentBeat = (newTotalBeatIndex % this.totalBeats) + 1;

        // Re-anchor timeline cleanly from right now
        this._timelineStart = now;
        this._beatsInCurrentSegment = 0;
        this._nextBeatExpectedTime = now + this._intervalMs;

        // Cancel any pending throttled timers and reschedule
        if (this._timerId) {
          clearTimeout(this._timerId);
          this._timerId = null;
        }
        this._scheduleNextTick(this._sessionToken);

        // Update visual display to current logical beat
        this._notifyBeat();
      }
    }
  };

  MetronomeEngine.init();

  // Expose module globally
  window.MetronomeEngine = MetronomeEngine;
})();
