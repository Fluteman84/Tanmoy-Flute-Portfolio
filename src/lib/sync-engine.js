/**
 * Musician's Sheet — Live Performance Synchronization Engine
 *
 * Implements:
 * - Master and Participant roles
 * - Authoritative timeline broadcast from Master
 * - High-resolution monotonic clock with NTP-style drift offset calculation
 * - Visual-only beat calculation (NO AUDIO)
 * - Synchronized count-in
 * - Bar tracking & automatic section transitions
 * - Multi-device connection status & roster
 * - Dual adapters: WebSocket (real Wi-Fi/network sync) & BroadcastChannel (local tab testing)
 */

import { calculateBarTiming, getPlaybackPositionInfo } from "./song-parser.js";

export const CONNECTION_STATUS = {
  CONNECTED: "Connected",
  SYNCHRONIZING: "Synchronizing",
  DISCONNECTED: "Disconnected",
  RECONNECTING: "Reconnecting",
};

export const SYNC_MODES = {
  WEBSOCKET: "websocket",
  BROADCAST_CHANNEL: "broadcast_channel",
};

export class SyncEngine {
  constructor(options = {}) {
    this.deviceId = options.deviceId || `device_${Math.random().toString(36).slice(2, 9)}`;
    this.sessionCode = (options.sessionCode || "BAND01").toUpperCase().trim();
    this.role = options.role || "master"; // "master" | "participant"
    this.musicianFormat = options.musicianFormat || "guitar";
    this.deviceName = options.deviceName || (this.role === "master" ? "Master Device" : `${this.musicianFormat} Player`);
    this.syncMode = options.syncMode || SYNC_MODES.WEBSOCKET;
    this.wsUrl = options.wsUrl || this._getDefaultWsUrl();

    // Timeline and Song
    this.timeline = null;
    this.state = {
      status: "stopped", // "playing" | "paused" | "stopped"
      songId: "",
      scheduledStartTime: 0,
      pausePositionMs: 0,
      countInBars: 1,
      activeOccurrenceId: "",
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4, pulseUnit: "quarter" },
      lastUpdated: 0,
    };

    // Clock offset (masterTime - localTime)
    this.clockOffsetMs = 0;
    this.latencyMs = 0;
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.connectedDevices = [];

    // Animation & Beat Loop
    this.rafId = null;
    this.lastRenderedBeat = null;
    this.lastActiveOccurrenceId = null;
    this.lastPlaybackPositionMs = 0;

    // Event Listeners
    this.listeners = {
      beatTick: new Set(),
      sectionChange: new Set(),
      stateChange: new Set(),
      rosterChange: new Set(),
      connectionChange: new Set(),
    };

    // Adapter reference
    this.adapter = null;
    this._pingTimer = null;
    this._reconnectTimer = null;
  }

  _getDefaultWsUrl() {
    if (typeof window !== "undefined" && window.location) {
      const host = window.location.hostname || "localhost";
      return `ws://${host}:8765`;
    }
    return "ws://localhost:8765";
  }

  // ── Listener Registration ──────────────────────────────────────────

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  _emit(event, ...args) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in sync listener "${event}":`, err);
        }
      }
    }
  }

  // ── Initialization & Adapter Setup ─────────────────────────────────

  setTimeline(resolvedTimeline) {
    this.timeline = resolvedTimeline;
    if (resolvedTimeline) {
      if (!this.state.songId) {
        this.state.songId = resolvedTimeline.songId;
      }
      if (!this.state.activeOccurrenceId && resolvedTimeline.occurrences[0]) {
        this.state.activeOccurrenceId = resolvedTimeline.occurrences[0].occurrenceId;
      }
      this.state.bpm = resolvedTimeline.metadata.bpm || 120;
      this.state.timeSignature = resolvedTimeline.metadata.timeSignature || { numerator: 4, denominator: 4, pulseUnit: "quarter" };
    }
  }

  connect() {
    this._cleanupAdapter();
    this._setConnectionStatus(CONNECTION_STATUS.SYNCHRONIZING);

    if (this.syncMode === SYNC_MODES.WEBSOCKET) {
      this._connectWebSocket();
    } else {
      this._connectBroadcastChannel();
    }

    this._startLoop();
  }

  disconnect() {
    this._cleanupAdapter();
    this._stopLoop();
    this._setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  setRole(newRole) {
    if (this.role === newRole) return;
    this.role = newRole;
    this._emit("stateChange", this.state, this.role);
    this._sendJoinMessage();
  }

  setMusicianFormat(format) {
    this.musicianFormat = format;
    if (this.adapter?.send) {
      this.adapter.send({
        type: "change_format",
        sessionCode: this.sessionCode,
        deviceId: this.deviceId,
        musicianFormat: format,
      });
    }
  }

  setSyncMode(mode, customWsUrl) {
    this.syncMode = mode;
    if (customWsUrl) this.wsUrl = customWsUrl;
    this.connect();
  }

  setSessionCode(code) {
    this.sessionCode = (code || "BAND01").toUpperCase().trim();
    this.connect();
  }

  _setConnectionStatus(status, latency = this.latencyMs) {
    this.connectionStatus = status;
    this.latencyMs = latency;
    this._emit("connectionChange", status, latency);
  }

  // ── WebSocket Adapter ──────────────────────────────────────────────

  _connectWebSocket() {
    try {
      const ws = new WebSocket(this.wsUrl);
      this.adapter = {
        type: "websocket",
        ws,
        send: (data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        },
      };

      ws.onopen = () => {
        this._setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        this._sendJoinMessage();
        this._startPingInterval();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleIncomingMessage(msg);
        } catch (err) {
          // message parse fail
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      ws.onclose = () => {
        this._setConnectionStatus(CONNECTION_STATUS.RECONNECTING);
        this._scheduleReconnect();
      };
    } catch (err) {
      this._setConnectionStatus(CONNECTION_STATUS.RECONNECTING);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      if (this.connectionStatus === CONNECTION_STATUS.RECONNECTING) {
        this._connectWebSocket();
      }
    }, 3000);
  }

  // ── BroadcastChannel Adapter (Local Multi-Tab Test) ────────────────

  _connectBroadcastChannel() {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      this._setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      return;
    }

    const channelName = `musician_sheet_${this.sessionCode}`;
    const channel = new BroadcastChannel(channelName);

    this.adapter = {
      type: "broadcast_channel",
      channel,
      send: (data) => {
        try {
          channel.postMessage({ ...data, _senderDeviceId: this.deviceId });
        } catch (err) {}
      },
    };

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg._senderDeviceId === this.deviceId) return;
      this._handleIncomingMessage(msg);
    };

    this._setConnectionStatus(CONNECTION_STATUS.CONNECTED, 1);
    this._sendJoinMessage();
    this._startPingInterval();
  }

  _cleanupAdapter() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.adapter) {
      if (this.adapter.ws) {
        this.adapter.ws.onclose = null;
        this.adapter.ws.close();
      }
      if (this.adapter.channel) {
        this.adapter.channel.close();
      }
      this.adapter = null;
    }
  }

  _sendJoinMessage() {
    if (!this.adapter?.send) return;
    this.adapter.send({
      type: "join_session",
      sessionCode: this.sessionCode,
      deviceId: this.deviceId,
      role: this.role,
      musicianFormat: this.musicianFormat,
      name: this.deviceName,
    });
  }

  _startPingInterval() {
    if (this._pingTimer) clearInterval(this._pingTimer);
    this._pingTimer = setInterval(() => {
      if (this.adapter?.send) {
        this.adapter.send({
          type: "clock_ping",
          clientSendTime: performance.now(),
        });
      }
    }, 3000);
  }

  // ── Incoming Message Handling ──────────────────────────────────────

  _handleIncomingMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "clock_pong") {
      const now = performance.now();
      const rtt = Math.max(0, now - msg.clientSendTime);
      this.latencyMs = Math.round(rtt / 2);
      // Clock offset with exponential smoothing
      const instantOffset = msg.serverTime - (msg.clientSendTime + rtt / 2);
      this.clockOffsetMs = this.clockOffsetMs === 0
        ? instantOffset
        : this.clockOffsetMs * 0.8 + instantOffset * 0.2;
      this._emit("connectionChange", this.connectionStatus, this.latencyMs);
      return;
    }

    if (msg.type === "roster_update") {
      this.connectedDevices = msg.devices || [];
      this._emit("rosterChange", this.connectedDevices);
      return;
    }

    if (msg.type === "session_joined") {
      if (msg.state) {
        this._applyRemoteState(msg.state);
      }
      return;
    }

    if (msg.type === "playback_state_broadcast" || msg.type === "playback_state") {
      if (this.role === "participant") {
        this._applyRemoteState(msg.state);
      }
    }
  }

  _applyRemoteState(newState) {
    if (!newState) return;
    const oldStatus = this.state.status;
    this.state = {
      ...this.state,
      ...newState,
    };
    this._emit("stateChange", this.state, this.role);

    if (oldStatus !== newState.status && newState.status === "stopped") {
      this.lastPlaybackPositionMs = 0;
      this.lastRenderedBeat = null;
    }
  }

  _broadcastState() {
    if (this.role !== "master" || !this.adapter?.send) return;
    this.adapter.send({
      type: "playback_state",
      sessionCode: this.sessionCode,
      deviceId: this.deviceId,
      state: this.state,
    });
  }

  // ── Master Playback Controls ───────────────────────────────────────

  play() {
    if (this.role !== "master") return;
    if (!this.timeline) return;

    const now = performance.now();
    const countInBars = Number(this.state.countInBars) || 0;
    const firstOcc = this.timeline.occurrences[0];
    const timing = calculateBarTiming(firstOcc.timeSignature, this.state.bpm || firstOcc.bpm);
    const countInMs = countInBars * timing.barDurationMs;

    this.state.status = "playing";
    this.state.scheduledStartTime = now + countInMs;
    this.state.pausePositionMs = 0;
    this.state.lastUpdated = Date.now();

    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  pause() {
    if (this.role !== "master") return;
    if (this.state.status !== "playing") return;

    const currentPos = this.getCurrentPlaybackPositionMs();
    this.state.status = "paused";
    this.state.pausePositionMs = Math.max(0, currentPos);
    this.state.lastUpdated = Date.now();

    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  resume() {
    if (this.role !== "master") return;
    if (this.state.status !== "paused") return;

    const now = performance.now();
    this.state.status = "playing";
    this.state.scheduledStartTime = now - this.state.pausePositionMs;
    this.state.lastUpdated = Date.now();

    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  stop() {
    if (this.role !== "master") return;
    this.state.status = "stopped";
    this.state.scheduledStartTime = 0;
    this.state.pausePositionMs = 0;
    this.lastPlaybackPositionMs = 0;
    this.lastRenderedBeat = null;
    this.state.lastUpdated = Date.now();

    if (this.timeline && this.timeline.occurrences[0]) {
      this.state.activeOccurrenceId = this.timeline.occurrences[0].occurrenceId;
    }

    this._broadcastState();
    this._emit("stateChange", this.state, this.role);

    // Immediate beat reset tick
    if (this.timeline) {
      const pos = getPlaybackPositionInfo(this.timeline, 0);
      this._emit("beatTick", pos);
      this._emit("sectionChange", pos.occurrence, 0);
    }
  }

  restart() {
    if (this.role !== "master") return;
    this.stop();
    this.play();
  }

  nextSection() {
    if (this.role !== "master" || !this.timeline) return;
    const currentIndex = this.timeline.occurrences.findIndex(
      (o) => o.occurrenceId === this.state.activeOccurrenceId
    );
    if (currentIndex >= 0 && currentIndex < this.timeline.occurrences.length - 1) {
      const nextOcc = this.timeline.occurrences[currentIndex + 1];
      this.jumpToOccurrence(nextOcc.occurrenceId);
    }
  }

  prevSection() {
    if (this.role !== "master" || !this.timeline) return;
    const currentIndex = this.timeline.occurrences.findIndex(
      (o) => o.occurrenceId === this.state.activeOccurrenceId
    );
    if (currentIndex > 0) {
      const prevOcc = this.timeline.occurrences[currentIndex - 1];
      this.jumpToOccurrence(prevOcc.occurrenceId);
    } else if (currentIndex === 0) {
      this.jumpToOccurrence(this.timeline.occurrences[0].occurrenceId);
    }
  }

  jumpToOccurrence(occurrenceId) {
    if (this.role !== "master" || !this.timeline) return;
    const occ = this.timeline.occurrences.find((o) => o.occurrenceId === occurrenceId);
    if (!occ) return;

    const targetMs = occ.startMs;
    const now = performance.now();

    if (this.state.status === "playing") {
      this.state.scheduledStartTime = now - targetMs;
    } else {
      this.state.pausePositionMs = targetMs;
    }
    this.state.activeOccurrenceId = occ.occurrenceId;
    this.state.lastUpdated = Date.now();

    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  updateBpm(bpm) {
    if (this.role !== "master") return;
    const newBpm = Math.max(30, Math.min(300, Math.round(Number(bpm) || 120)));
    this.state.bpm = newBpm;
    this.state.lastUpdated = Date.now();
    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  updateCountIn(bars) {
    if (this.role !== "master") return;
    this.state.countInBars = Number(bars);
    this.state.lastUpdated = Date.now();
    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  updateTimeSignature(numerator, denominator) {
    if (this.role !== "master") return;
    this.state.timeSignature = {
      ...this.state.timeSignature,
      numerator: Number(numerator),
      denominator: Number(denominator),
    };
    this.state.lastUpdated = Date.now();
    this._broadcastState();
    this._emit("stateChange", this.state, this.role);
  }

  // ── Timeline Position Calculation ──────────────────────────────────

  getCurrentPlaybackPositionMs() {
    if (this.state.status === "stopped") return 0;
    if (this.state.status === "paused") return this.state.pausePositionMs;

    const now = performance.now();
    let currentMs = now - this.state.scheduledStartTime;

    // Monotonic guard: never travel backwards in time while playing
    if (currentMs < this.lastPlaybackPositionMs && this.state.status === "playing" && currentMs >= 0) {
      currentMs = this.lastPlaybackPositionMs;
    }
    this.lastPlaybackPositionMs = currentMs;
    return currentMs;
  }

  // ── Visual Animation & Timing Loop ─────────────────────────────────

  _startLoop() {
    if (this.rafId) return;

    const loop = () => {
      this._tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _tick() {
    if (!this.timeline) return;

    const elapsedMs = this.getCurrentPlaybackPositionMs();
    const pos = getPlaybackPositionInfo(this.timeline, elapsedMs);

    // Section transition detection
    if (pos.occurrence && pos.occurrence.occurrenceId !== this.lastActiveOccurrenceId) {
      this.lastActiveOccurrenceId = pos.occurrence.occurrenceId;
      this.state.activeOccurrenceId = pos.occurrence.occurrenceId;
      this._emit("sectionChange", pos.occurrence, pos.occurrenceIndex);
    }

    // Beat pulse check: only emit beatTick when the integer beat changes or count-in tick
    const beatKey = `${pos.isCountIn ? "c" : "p"}_${pos.totalBar}_${pos.beat}`;
    if (beatKey !== this.lastRenderedBeat || pos.fraction < 0.1) {
      this.lastRenderedBeat = beatKey;
      this._emit("beatTick", pos);
    }

    // Auto-advance or stop at end of song
    if (pos.isFinished && this.state.status === "playing" && this.role === "master") {
      this.stop();
    }
  }
}
