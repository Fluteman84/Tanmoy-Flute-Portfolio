export function TablaWorkspace() {
  return (
    <main className="notes-main">
      <div className="taal-workspace" id="tablaTaalEngineApp">
        <header className="engine-compact-header">
          <p className="eyebrow">Tools / Rhythm Studio</p>
          <h1 className="engine-main-title">Tabla <span>Taal Engine</span></h1>
          <p className="engine-subtitle">Hindustani Classical &bull; Metronome &bull; Laya</p>
        </header>
        <div id="taalStatusNotice" className="taal-status-notice" role="status" aria-live="polite"></div>
        <section className="controls-section" aria-label="Taal and Tempo Controls">
          <div className="controls-row">
            <div className="taal-select-group">
              <label className="control-label" htmlFor="taalSelect">SELECT TAAL</label>
              <div className="select-wrapper">
                <select className="taal-dropdown" id="taalSelect" name="taalSelect" aria-label="Select Taal">
                  <option value="">Loading Taals...</option>
                </select>
                <span className="select-arrow" aria-hidden="true">&#9662;</span>
              </div>
            </div>
            <div className="tempo-control-group">
              <label className="control-label" htmlFor="tempoInput">TEMPO</label>
              <div className="tempo-controls-cluster">
                <div className="tempo-input-box">
                  <input
                    type="number"
                    className="tempo-input"
                    id="tempoInput"
                    name="tempoInput"
                    defaultValue="120"
                    min="20"
                    max="300"
                    step="1"
                    aria-label="Tempo in BPM"
                  />
                  <div className="tempo-steppers" aria-hidden="true">
                    <button type="button" className="stepper-arrow-btn" id="btnStepperUp" tabIndex="-1" aria-label="Increase tempo">&#9650;</button>
                    <button type="button" className="stepper-arrow-btn" id="btnStepperDown" tabIndex="-1" aria-label="Decrease tempo">&#9660;</button>
                  </div>
                  <span className="tempo-unit-badge">BPM</span>
                </div>
                <button
                  type="button"
                  className="tempo-btn-multiplier"
                  id="btnHalveTempo"
                  aria-label="Halve Tempo"
                  title="Halve Tempo (÷2)"
                >
                  &divide;2
                </button>
                <button
                  type="button"
                  className="tempo-btn-multiplier"
                  id="btnDoubleTempo"
                  aria-label="Double Tempo"
                  title="Double Tempo (×2)"
                >
                  &times;2
                </button>
              </div>
            </div>
            <div className="playback-controls-group">
              <label className="control-label">PLAYBACK</label>
              <div className="playback-buttons-cluster">
                <button type="button" className="btn-play" id="btnPlay" aria-label="Play Taal" aria-pressed="false">
                  <span className="btn-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 2.5L13.5 8L4 13.5V2.5Z" />
                    </svg>
                  </span>
                  <span className="btn-label">PLAY</span>
                </button>
                <button type="button" className="btn-stop-now" id="btnStopNow" aria-label="Stop Now" disabled>
                  <span className="btn-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="10" height="10" rx="1.5" />
                    </svg>
                  </span>
                  <span className="btn-label">STOP NOW</span>
                </button>
                <button type="button" className="btn-stop-cycle" id="btnStopCycle" aria-label="Stop After Cycle" disabled>
                  <span className="btn-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 3L9.5 8L2.5 13V3Z" />
                      <rect x="11.5" y="3" width="2" height="10" rx="0.5" />
                    </svg>
                  </span>
                  <span className="btn-label">STOP AFTER CYCLE</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        <div id="playbackInfoBar" className="playback-info-bar" role="status" aria-live="polite"></div>
        <section className="beat-display-section" aria-label="Beat Counting Display">
          <div className="beat-grid" id="beatGrid" role="region" aria-label="Beat Grid">
          </div>
        </section>
      </div>
    </main>
  );
}
