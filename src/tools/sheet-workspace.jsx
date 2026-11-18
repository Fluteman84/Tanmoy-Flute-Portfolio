import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Clock,
  Compass,
  Disc3,
  FastForward,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Rewind,
  Settings,
  Square,
  Users,
  VolumeX,
  Wifi,
} from "lucide-react";
import songsData from "../../data/musician-sheets.json";
import { resolveSongTimeline } from "../lib/song-parser";
import { CONNECTION_STATUS, SYNC_MODES, SyncEngine } from "../lib/sync-engine";
import "../../css/musicians-sheet.css";

const MUSICIAN_FORMATS = [
  { id: "drums", label: "Drums", icon: Disc3 },
  { id: "guitar", label: "Guitar", icon: Music },
  { id: "bass", label: "Bass", icon: Compass },
  { id: "main-artist", label: "Main Artist", icon: Mic },
];

export function SheetWorkspace() {
  const songs = songsData.songs || [];
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id || "");
  const [musicianFormat, setMusicianFormat] = useState("guitar");
  const [expandRepeats, setExpandRepeats] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sync and Playback State
  const [role, setRole] = useState("master"); // "master" | "participant"
  const [sessionCode, setSessionCode] = useState("BAND01");
  const [syncMode, setSyncMode] = useState(SYNC_MODES.WEBSOCKET);
  const [wsUrl, setWsUrl] = useState(() => {
    if (typeof window !== "undefined" && window.location) {
      return `ws://${window.location.hostname || "localhost"}:8765`;
    }
    return "ws://localhost:8765";
  });
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [latencyMs, setLatencyMs] = useState(0);
  const [connectedDevices, setConnectedDevices] = useState([]);

  const [playbackState, setPlaybackState] = useState({
    status: "stopped",
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4, pulseUnit: "quarter" },
    countInBars: 1,
    activeOccurrenceId: "",
  });

  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [visualCounterEnabled, setVisualCounterEnabled] = useState(true);
  const [isManualScrolled, setIsManualScrolled] = useState(false);

  // Live Beat Readout (Direct DOM / Local State)
  const [beatInfo, setBeatInfo] = useState({
    beat: 1,
    beatsPerBar: 4,
    barInSection: 1,
    totalBar: 1,
    isCountIn: false,
    fraction: 0,
  });
  const [beatPulse, setBeatPulse] = useState(false);

  // Active Occurrence
  const [activeOccurrence, setActiveOccurrence] = useState(null);

  // References
  const syncEngineRef = useRef(null);
  const sectionRefs = useRef({});
  const isAutoScrollingRef = useRef(false);

  // Resolve active song and timeline
  const activeSong = songs.find((s) => s.id === selectedSongId) || songs[0];
  const timeline = resolveSongTimeline(activeSong, { expandRepeats });

  // Initialize Sync Engine
  useEffect(() => {
    const engine = new SyncEngine({
      sessionCode,
      role,
      musicianFormat,
      syncMode,
      wsUrl,
    });
    syncEngineRef.current = engine;
    engine.setTimeline(timeline);
    engine.connect();

    // Event Subscriptions
    const unsubConnection = engine.on("connectionChange", (status, latency) => {
      setConnectionStatus(status);
      setLatencyMs(latency);
    });

    const unsubRoster = engine.on("rosterChange", (devices) => {
      setConnectedDevices(devices);
    });

    const unsubState = engine.on("stateChange", (state, currentRole) => {
      setPlaybackState({ ...state });
      if (currentRole !== role) {
        setRole(currentRole);
      }
    });

    const unsubSection = engine.on("sectionChange", (occ) => {
      setActiveOccurrence(occ);
    });

    const unsubBeat = engine.on("beatTick", (pos) => {
      setBeatInfo({
        beat: pos.beat,
        beatsPerBar: pos.occurrence?.beatsPerBar || pos.beatsPerBar || 4,
        barInSection: pos.barInSection,
        totalBar: pos.totalBar,
        isCountIn: Boolean(pos.isCountIn),
        fraction: pos.fraction,
      });

      // Trigger beat pulse animation momentarily
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 140);
    });

    return () => {
      unsubConnection();
      unsubRoster();
      unsubState();
      unsubSection();
      unsubBeat();
      engine.disconnect();
    };
  }, []);

  // Update timeline when song or expandRepeats changes
  useEffect(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.setTimeline(timeline);
      if (playbackState.status === "stopped" && timeline.occurrences[0]) {
        setActiveOccurrence(timeline.occurrences[0]);
      }
    }
  }, [selectedSongId, expandRepeats]);

  // Update format on sync engine when changed
  useEffect(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.setMusicianFormat(musicianFormat);
    }
  }, [musicianFormat]);

  // Handle Auto-Scroll to Active Section
  useEffect(() => {
    if (!autoScrollEnabled || isManualScrolled || !activeOccurrence) return;

    const el = sectionRefs.current[activeOccurrence.occurrenceId];
    if (el) {
      isAutoScrollingRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 600);
    }
  }, [activeOccurrence?.occurrenceId, autoScrollEnabled, isManualScrolled]);

  // Detect Manual User Scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (isAutoScrollingRef.current) return;
      if (playbackState.status === "playing" && !isManualScrolled) {
        setIsManualScrolled(true);
      }
    };

    window.addEventListener("wheel", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [playbackState.status, isManualScrolled]);

  // Toggle Performance Mode class on body
  useEffect(() => {
    if (performanceMode) {
      document.body.classList.add("performance-mode-active");
    } else {
      document.body.classList.remove("performance-mode-active");
    }
    return () => {
      document.body.classList.remove("performance-mode-active");
    };
  }, [performanceMode]);

  // Return to Live Auto-Scroll Handler
  const handleReturnToLive = () => {
    setIsManualScrolled(false);
    if (activeOccurrence) {
      const el = sectionRefs.current[activeOccurrence.occurrenceId];
      if (el) {
        isAutoScrollingRef.current = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 500);
      }
    }
  };

  // Master Playback Actions
  const handlePlayPause = () => {
    if (!syncEngineRef.current || role !== "master") return;
    if (playbackState.status === "playing") {
      syncEngineRef.current.pause();
    } else if (playbackState.status === "paused") {
      syncEngineRef.current.resume();
    } else {
      syncEngineRef.current.play();
    }
  };

  const handleStop = () => {
    if (!syncEngineRef.current || role !== "master") return;
    syncEngineRef.current.stop();
    setIsManualScrolled(false);
  };

  const handlePrev = () => {
    if (!syncEngineRef.current || role !== "master") return;
    syncEngineRef.current.prevSection();
  };

  const handleNext = () => {
    if (!syncEngineRef.current || role !== "master") return;
    syncEngineRef.current.nextSection();
  };

  const handleBpmChange = (delta) => {
    if (!syncEngineRef.current || role !== "master") return;
    const current = Number(playbackState.bpm) || 120;
    syncEngineRef.current.updateBpm(current + delta);
  };

  const handleCountInChange = (bars) => {
    if (!syncEngineRef.current || role !== "master") return;
    syncEngineRef.current.updateCountIn(bars);
  };

  const handleRoleToggle = (newRole) => {
    setRole(newRole);
    if (syncEngineRef.current) {
      syncEngineRef.current.setRole(newRole);
    }
  };

  const handleSessionChange = (newCode) => {
    setSessionCode(newCode);
    if (syncEngineRef.current) {
      syncEngineRef.current.setSessionCode(newCode);
    }
  };

  const handleSyncModeChange = (newMode, url = wsUrl) => {
    setSyncMode(newMode);
    if (url) setWsUrl(url);
    if (syncEngineRef.current) {
      syncEngineRef.current.setSyncMode(newMode, url);
    }
  };

  // Status dot color mapping
  const getStatusDotClass = () => {
    switch (connectionStatus) {
      case CONNECTION_STATUS.CONNECTED: return "connected";
      case CONNECTION_STATUS.SYNCHRONIZING: return "synchronizing";
      case CONNECTION_STATUS.RECONNECTING: return "reconnecting";
      default: return "disconnected";
    }
  };

  const activeOccIndex = activeOccurrence?.index ?? 0;
  const currentOcc = timeline.occurrences[activeOccIndex] || timeline.occurrences[0];

  return (
    <div className="sheet-workspace">
      <div className="sheet-frame">
        {/* ── Top Bar / Header Area ─────────────────────────────────── */}
        <header className="sheet-top-bar">
          <div className="sheet-title-group">
            <h1>Musician's Sheet</h1>
            <p>Song reference system for musicians • Multi-instrument synchronized live performance.</p>
          </div>

          <div className="sheet-top-actions">
            {/* Session Identifier & Role Badge */}
            <div className={`sheet-badge ${role === "master" ? "badge-role-master" : "badge-role-participant"}`}>
              <span>Session: <strong>{sessionCode}</strong></span>
              <span>•</span>
              <span>{role === "master" ? "Master (Controls Live)" : "Participant (Synced)"}</span>
            </div>

            {/* Connection Status Badge */}
            <div className="sheet-badge" title={latencyMs > 0 ? `Latency: ${latencyMs}ms` : ""}>
              <span className={`status-dot ${getStatusDotClass()}`} />
              <span>{connectionStatus}</span>
              {latencyMs > 0 && <span style={{ opacity: 0.6 }}>({latencyMs}ms)</span>}
            </div>

            {/* Connected Devices Count */}
            <div className="sheet-badge">
              <Users size={14} />
              <span>{connectedDevices.length > 0 ? `${connectedDevices.length} Connected` : "1 Device"}</span>
            </div>

            {/* Performance Mode Button */}
            <button
              type="button"
              className="sheet-badge"
              style={{ cursor: "pointer", background: "rgba(216, 168, 93, 0.15)", color: "var(--sheet-gold-bright)" }}
              onClick={() => setPerformanceMode(true)}
              title="Enter distraction-free full-screen stage mode"
            >
              <Maximize2 size={13} />
              <span>Performance Mode</span>
            </button>

            {/* Sync Settings Dialog Toggle */}
            <button
              type="button"
              className="sheet-badge"
              style={{ cursor: "pointer" }}
              onClick={() => setShowSettingsModal(true)}
              title="Connection & Sync Settings"
            >
              <Settings size={13} />
              <span>Sync Settings</span>
            </button>
          </div>
        </header>

        {/* ── Main Layout: Sidebar & Content ────────────────────────── */}
        <div className="sheet-layout">
          {/* ── Left Sidebar (Controls & Roster) ────────────────────── */}
          <aside className="sheet-sidebar">
            {/* Song Selector & Metadata Card */}
            <section className="sheet-panel-card" aria-labelledby="song-select-heading">
              <div className="sheet-panel-title" id="song-select-heading">
                <span>Song Selection</span>
                <Music size={14} />
              </div>

              <select
                className="sheet-select"
                value={selectedSongId}
                onChange={(e) => {
                  setSelectedSongId(e.target.value);
                  if (role === "master" && syncEngineRef.current) {
                    syncEngineRef.current.stop();
                  }
                }}
                aria-label="Select song from library"
              >
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.metadata.title} — {song.metadata.key} ({song.metadata.bpm} BPM)
                  </option>
                ))}
              </select>

              <div className="sheet-meta-grid">
                <div className="sheet-meta-item">
                  <span className="meta-label">Artist</span>
                  <span className="meta-val" style={{ fontSize: "0.82rem" }}>{activeSong.metadata.artist}</span>
                </div>
                <div className="sheet-meta-item">
                  <span className="meta-label">Key</span>
                  <span className="meta-val">{activeSong.metadata.key}</span>
                </div>
                <div className="sheet-meta-item">
                  <span className="meta-label">Tempo</span>
                  <span className="meta-val">{playbackState.bpm || activeSong.metadata.bpm} BPM</span>
                </div>
                <div className="sheet-meta-item">
                  <span className="meta-label">Meter</span>
                  <span className="meta-val">
                    {activeSong.metadata.timeSignature.numerator}/{activeSong.metadata.timeSignature.denominator}
                  </span>
                </div>
              </div>

              {activeSong.metadata.notes && (
                <div className="sheet-meta-notes">
                  {activeSong.metadata.notes}
                </div>
              )}
            </section>

            {/* Performance Controls (Master Controls vs Participant Follower) */}
            <section className="sheet-panel-card" aria-labelledby="playback-controls-heading">
              <div className="sheet-panel-title" id="playback-controls-heading">
                <span>{role === "master" ? "Master Performance Controls" : "Live Synchronization"}</span>
                <Radio size={14} />
              </div>

              {role === "master" ? (
                <>
                  {/* Transport Buttons: Play/Pause, Stop */}
                  <div className="sheet-transport-grid">
                    <button
                      type="button"
                      className={`transport-btn ${playbackState.status === "playing" ? "btn-pause" : "btn-play"}`}
                      onClick={handlePlayPause}
                      aria-label={playbackState.status === "playing" ? "Pause playback" : "Start playback"}
                    >
                      {playbackState.status === "playing" ? (
                        <>
                          <Pause size={16} />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          <span>{playbackState.status === "paused" ? "Resume" : "Play"}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="transport-btn btn-stop"
                      onClick={handleStop}
                      disabled={playbackState.status === "stopped"}
                      aria-label="Stop playback"
                    >
                      <Square size={15} />
                      <span>Stop</span>
                    </button>
                  </div>

                  {/* Section Jump Controls */}
                  <div className="transport-nav-row">
                    <button
                      type="button"
                      className="transport-btn"
                      onClick={handlePrev}
                      title="Jump to previous section"
                    >
                      <Rewind size={14} />
                      <span>Prev Section</span>
                    </button>

                    <button
                      type="button"
                      className="transport-btn"
                      onClick={handleNext}
                      title="Jump to next section"
                    >
                      <span>Next Section</span>
                      <FastForward size={14} />
                    </button>
                  </div>

                  {/* BPM Adjustment */}
                  <div className="sheet-param-row">
                    <label>Tempo (BPM):</label>
                    <div className="param-controls">
                      <button
                        type="button"
                        className="param-btn"
                        onClick={() => handleBpmChange(-2)}
                        aria-label="Decrease tempo"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        className="param-val-input"
                        value={playbackState.bpm || 120}
                        onChange={(e) => syncEngineRef.current?.updateBpm(e.target.value)}
                        aria-label="Current BPM"
                      />
                      <button
                        type="button"
                        className="param-btn"
                        onClick={() => handleBpmChange(2)}
                        aria-label="Increase tempo"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Count-in Selector */}
                  <div className="sheet-param-row">
                    <label>Count-in:</label>
                    <select
                      className="param-select"
                      value={playbackState.countInBars ?? 1}
                      onChange={(e) => handleCountInChange(e.target.value)}
                      aria-label="Count-in bars"
                    >
                      <option value={0}>No count-in</option>
                      <option value={1}>1 Bar Count-in</option>
                      <option value={2}>2 Bars Count-in</option>
                      <option value={4}>4 Bars Count-in</option>
                    </select>
                  </div>
                </>
              ) : (
                /* Participant View: Readonly Sync Follower status */
                <div style={{ padding: "0.5rem 0", color: "var(--sheet-text-secondary)", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <span className={`status-dot ${getStatusDotClass()}`} />
                    <span><strong>Following Master Timeline</strong></span>
                  </div>
                  <p style={{ margin: "0.2rem 0", fontSize: "0.78rem", color: "var(--sheet-text-muted)" }}>
                    Playback is controlled exclusively by the Master device. Your sheet follows automatically.
                  </p>
                  <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                    <div>Current: <strong>{currentOcc?.displayName || "—"}</strong></div>
                    <div style={{ fontSize: "0.78rem", color: "var(--sheet-text-muted)", marginTop: "0.2rem" }}>
                      Bar {beatInfo.barInSection} / {currentOcc?.bars || "—"} • Beat {beatInfo.beat} / {beatInfo.beatsPerBar}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Scroll Toggle */}
              <div className="toggle-switch-row">
                <span>Auto-Scroll Following</span>
                <input
                  type="checkbox"
                  checked={autoScrollEnabled}
                  onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                  aria-label="Toggle auto-scrolling"
                />
              </div>

              {/* Visual Counter Toggle */}
              <div className="toggle-switch-row">
                <span>Floating Beat Counter</span>
                <input
                  type="checkbox"
                  checked={visualCounterEnabled}
                  onChange={(e) => setVisualCounterEnabled(e.target.checked)}
                  aria-label="Toggle visual beat counter"
                />
              </div>

              {/* Expand Repeats Toggle (Main Artist) */}
              <div className="toggle-switch-row">
                <span>Expand Repeats (Main Artist)</span>
                <input
                  type="checkbox"
                  checked={expandRepeats}
                  onChange={(e) => setExpandRepeats(e.target.checked)}
                  aria-label="Toggle expanded repeats for main artist"
                />
              </div>
            </section>

            {/* Connected Devices Roster */}
            <section className="sheet-panel-card" aria-labelledby="roster-heading">
              <div className="sheet-panel-title" id="roster-heading">
                <span>Connected Devices</span>
                <Users size={14} />
              </div>

              <div className="roster-header">
                <span>Session: <strong>{sessionCode}</strong></span>
                <span>{connectedDevices.length > 0 ? `${connectedDevices.length} Devices` : "1 Device"}</span>
              </div>

              <div className="roster-list">
                {connectedDevices.length > 0 ? (
                  connectedDevices.map((dev) => (
                    <div className="roster-item" key={dev.deviceId}>
                      <div className="roster-item-info">
                        <span className="status-dot connected" />
                        <span><strong>{dev.musicianFormat ? dev.musicianFormat.toUpperCase() : "DEVICE"}</strong></span>
                      </div>
                      <span className="roster-role-badge">
                        {dev.role === "master" ? "Master" : "Synced"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="roster-item">
                    <div className="roster-item-info">
                      <span className={`status-dot ${getStatusDotClass()}`} />
                      <span><strong>{musicianFormat.toUpperCase()}</strong> (This device)</span>
                    </div>
                    <span className="roster-role-badge">{role}</span>
                  </div>
                )}
              </div>
            </section>
          </aside>

          {/* ── Main Content Area ───────────────────────────────────── */}
          <main className="sheet-main-content">
            {/* Musician Format Selector (Segmented Horizontal Bar) */}
            <nav className="sheet-format-selector" aria-label="Musician format selector">
              {MUSICIAN_FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const isActive = musicianFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    className={`format-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => setMusicianFormat(fmt.id)}
                    aria-pressed={isActive}
                  >
                    <Icon size={16} />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Song Document Viewer (Chronological Section Progression) */}
            <div className="sheet-document">
              {timeline.occurrences.map((occ, idx) => {
                const isActive = currentOcc?.occurrenceId === occ.occurrenceId && playbackState.status !== "stopped";
                const isUpcoming = idx === activeOccIndex + 1 && playbackState.status === "playing";
                const viewData = occ.views[musicianFormat];

                return (
                  <article
                    key={occ.occurrenceId}
                    id={`section-${occ.occurrenceId}`}
                    ref={(el) => (sectionRefs.current[occ.occurrenceId] = el)}
                    className={`sheet-section-block ${isActive ? "is-active" : ""} ${isUpcoming ? "is-upcoming" : ""}`}
                    onClick={() => {
                      if (role === "master") {
                        syncEngineRef.current?.jumpToOccurrence(occ.occurrenceId);
                      }
                    }}
                    style={{ cursor: role === "master" ? "pointer" : "default" }}
                    title={role === "master" ? "Click to jump playback to this section" : ""}
                  >
                    {isActive && (
                      <div className="section-active-indicator">
                        <span className="status-dot connected" />
                        <span>LIVE NOW</span>
                      </div>
                    )}

                    <div className="section-header-row">
                      <h2 className="section-title">
                        <span>{occ.displayName.toUpperCase()}</span>
                        {occ.isRepeat && <span className="section-repeat-tag">Repeat</span>}
                      </h2>

                      <div className="section-meta-pills">
                        <span className="section-meta-pill">{occ.bars ? `${occ.bars} Bars` : "Free Meter"}</span>
                        <span className="section-meta-pill">{occ.bpm} BPM</span>
                        <span className="section-meta-pill">{occ.timeSignature.numerator}/{occ.timeSignature.denominator}</span>
                      </div>
                    </div>

                    {/* Format-Specific Content */}
                    {musicianFormat === "drums" && (
                      <div className="view-drums">
                        <p className="view-drums-notes">{viewData.notes || "Maintain groove, dynamic support."}</p>
                        {viewData.cues?.length > 0 && (
                          <div className="view-drums-cues">
                            {viewData.cues.map((cue, i) => (
                              <span key={i} className="drum-cue-tag">{cue}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {musicianFormat === "guitar" && (
                      <div className="view-guitar">
                        <div className="view-guitar-chords">{viewData.chords || "—"}</div>
                        {viewData.notes && <p className="view-guitar-notes">{viewData.notes}</p>}
                      </div>
                    )}

                    {musicianFormat === "bass" && (
                      <div className="view-bass">
                        <div className="view-bass-roots">Root Notes: {viewData.rootNotes || "—"}</div>
                        <div className="view-bass-progression">Progression: {viewData.progression || "—"}</div>
                        {viewData.rhythm && <p className="view-bass-rhythm">Rhythm: {viewData.rhythm}</p>}
                        {viewData.notes && <p className="view-bass-notes">{viewData.notes}</p>}
                      </div>
                    )}

                    {musicianFormat === "main-artist" && (
                      <div className="view-main-artist">
                        {viewData.isInstrumental ? (
                          <div className="view-artist-instrumental">
                            <Music size={18} />
                            <span>{viewData.cue || "Instrumental Section — Instrumental Lead"}</span>
                          </div>
                        ) : (
                          <>
                            <div className="view-artist-lyrics">{viewData.lyrics}</div>
                            {viewData.cue && <div className="view-artist-cue">Performance note: {viewData.cue}</div>}
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </main>
        </div>

        {/* ── VISUAL-ONLY FLOATING BEAT COUNTER (STRICT NO AUDIO CLICK) ── */}
        {visualCounterEnabled && (
          <aside className="floating-beat-counter" aria-label="Visual beat counter">
            <div className="counter-header-row">
              <span className="counter-bpm-label">{playbackState.bpm || 120} BPM</span>
              <span className="counter-meter-label">
                {currentOcc?.timeSignature?.numerator || 4}/{currentOcc?.timeSignature?.denominator || 4}
              </span>
            </div>

            {beatInfo.isCountIn ? (
              <div className="counter-countin-badge">
                COUNT-IN
              </div>
            ) : null}

            <div className="counter-beat-display">
              <span className={`counter-beat-number ${beatPulse ? "pulse-beat" : ""}`}>
                {beatInfo.beat} / {beatInfo.beatsPerBar}
              </span>
              <span className="counter-sub-label">BEAT</span>
            </div>

            <div className="counter-footer-row">
              <span>Bar {String(beatInfo.barInSection).padStart(2, "0")} / {String(currentOcc?.bars || 1).padStart(2, "0")}</span>
              <span style={{ opacity: 0.6 }}>Total {beatInfo.totalBar}</span>
            </div>
          </aside>
        )}

        {/* ── Return to Live Floating Button (Manual Scroll Override) ── */}
        {isManualScrolled && (
          <button
            type="button"
            className="floating-return-live"
            onClick={handleReturnToLive}
            aria-label="Return to live playback position"
          >
            <span className="live-indicator-dot" />
            <span>Return to Live ({currentOcc?.displayName || "Playing"})</span>
          </button>
        )}

        {/* ── Full-Screen Performance Mode Exit Bar ──────────────────── */}
        {performanceMode && (
          <div className="performance-exit-bar">
            {role === "master" && (
              <button
                type="button"
                className="performance-exit-btn"
                style={{ background: "rgba(216, 168, 93, 0.25)", color: "var(--sheet-gold-bright)" }}
                onClick={handlePlayPause}
              >
                {playbackState.status === "playing" ? "Pause" : "Play"}
              </button>
            )}
            <button
              type="button"
              className="performance-exit-btn"
              onClick={() => setPerformanceMode(false)}
            >
              <Minimize2 size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
              Exit Performance Mode
            </button>
          </div>
        )}

        {/* ── Sync Settings Modal / Panel ───────────────────────────── */}
        {showSettingsModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={() => setShowSettingsModal(false)}
          >
            <div
              style={{
                background: "#0b151d",
                border: "1px solid var(--sheet-gold-border)",
                borderRadius: "16px",
                padding: "1.75rem",
                maxWidth: "480px",
                width: "100%",
                color: "var(--sheet-text-primary)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <h3 style={{ margin: 0, fontFamily: "Cormorant Garamond", fontSize: "1.6rem" }}>
                  Synchronization Settings
                </h3>
                <button
                  type="button"
                  style={{ background: "transparent", border: 0, color: "var(--sheet-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
                  onClick={() => setShowSettingsModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Role Selection */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--sheet-text-muted)", marginBottom: "0.4rem" }}>
                  DEVICE ROLE
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className={`transport-btn ${role === "master" ? "btn-play" : ""}`}
                    onClick={() => handleRoleToggle("master")}
                  >
                    Master (Controls Timeline)
                  </button>
                  <button
                    type="button"
                    className={`transport-btn ${role === "participant" ? "btn-play" : ""}`}
                    onClick={() => handleRoleToggle("participant")}
                  >
                    Participant (Follower)
                  </button>
                </div>
              </div>

              {/* Session Code */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--sheet-text-muted)", marginBottom: "0.4rem" }}>
                  SESSION CODE
                </label>
                <input
                  type="text"
                  className="param-val-input"
                  style={{ width: "100%", textAlign: "left", padding: "0.6rem 0.8rem", fontSize: "1rem" }}
                  value={sessionCode}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  placeholder="e.g. BAND01"
                />
              </div>

              {/* Sync Adapter Mode */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--sheet-text-muted)", marginBottom: "0.4rem" }}>
                  SYNC ARCHITECTURE
                </label>
                <select
                  className="sheet-select"
                  value={syncMode}
                  onChange={(e) => handleSyncModeChange(e.target.value)}
                >
                  <option value={SYNC_MODES.WEBSOCKET}>Network WebSocket Relay (Multi-Device Wi-Fi / LAN)</option>
                  <option value={SYNC_MODES.BROADCAST_CHANNEL}>Local Browser Tab Sync (Testing Mode)</option>
                </select>
              </div>

              {syncMode === SYNC_MODES.WEBSOCKET && (
                <div style={{ marginBottom: "1.2rem" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--sheet-text-muted)", marginBottom: "0.4rem" }}>
                    WEBSOCKET SERVER URL
                  </label>
                  <input
                    type="text"
                    className="param-val-input"
                    style={{ width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                    value={wsUrl}
                    onChange={(e) => {
                      setWsUrl(e.target.value);
                      handleSyncModeChange(SYNC_MODES.WEBSOCKET, e.target.value);
                    }}
                    placeholder="ws://localhost:8765"
                  />
                  <small style={{ display: "block", marginTop: "0.4rem", color: "var(--sheet-text-muted)", fontSize: "0.74rem" }}>
                    To sync across physical phones/tablets over local Wi-Fi, run <code>npm run sync-server</code> on your rehearsal machine and enter <code>ws://&lt;your-local-ip&gt;:8765</code>.
                  </small>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="transport-btn btn-play"
                  style={{ padding: "0.6rem 1.4rem" }}
                  onClick={() => setShowSettingsModal(false)}
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
