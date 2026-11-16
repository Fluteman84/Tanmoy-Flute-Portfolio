export function StandaloneWorkspace() {
  return (
    <main className="taal-app" id="tablaTaalEngineApp">
      <header className="app-header">
        <svg
          className="header-decor-mandala"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="35" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="2" />
          <path d="M100 5 L104 35 L100 55 L96 35 Z" fill="currentColor" opacity="0.4" />
          <path d="M100 195 L104 165 L100 145 L96 165 Z" fill="currentColor" opacity="0.4" />
          <path d="M5 100 L35 104 L55 100 L35 96 Z" fill="currentColor" opacity="0.4" />
          <path d="M195 100 L165 104 L145 100 L165 96 Z" fill="currentColor" opacity="0.4" />
          <path d="M33 33 L55 52 L69 69 L52 55 Z" fill="currentColor" opacity="0.4" />
          <path d="M167 167 L145 148 L131 131 L148 145 Z" fill="currentColor" opacity="0.4" />
          <path d="M33 167 L55 148 L69 131 L52 145 Z" fill="currentColor" opacity="0.4" />
          <path d="M167 33 L145 52 L131 69 L148 55 Z" fill="currentColor" opacity="0.4" />
        </svg>
        <div className="header-content">
          <div className="header-tabla-graphic" aria-hidden="true">
            <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="dayanWood" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4A1E0D" />
                  <stop offset="25%" stopColor="#7B3E1C" />
                  <stop offset="50%" stopColor="#9E5325" />
                  <stop offset="85%" stopColor="#6B3315" />
                  <stop offset="100%" stopColor="#3A1508" />
                </linearGradient>
                <radialGradient id="bayanMetal" cx="40%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="#D9A873" />
                  <stop offset="45%" stopColor="#9C6B38" />
                  <stop offset="80%" stopColor="#623F1C" />
                  <stop offset="100%" stopColor="#3D220E" />
                </radialGradient>
                <radialGradient id="syahiShine" cx="45%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="#2C2B2A" />
                  <stop offset="55%" stopColor="#141312" />
                  <stop offset="100%" stopColor="#080706" />
                </radialGradient>
                <radialGradient id="puriSkin" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF8EE" />
                  <stop offset="75%" stopColor="#EADBCC" />
                  <stop offset="100%" stopColor="#C7B29B" />
                </radialGradient>
                <linearGradient id="biraVelvet" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#73151D" />
                  <stop offset="50%" stopColor="#A82834" />
                  <stop offset="100%" stopColor="#540D14" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="100" rx="42" ry="14" fill="url(#biraVelvet)" stroke="#D4AF37" strokeWidth="1.8" />
              <path
                d="M14 62 C14 96, 32 102, 50 102 C68 102, 86 96, 86 62 C86 52, 14 52, 14 62 Z"
                fill="url(#bayanMetal)"
                stroke="#2B1508"
                strokeWidth="1.2"
              />
              <ellipse cx="50" cy="54" rx="36" ry="14" fill="url(#puriSkin)" stroke="#6E5642" strokeWidth="2" />
              <ellipse cx="50" cy="54" rx="33" ry="12.5" fill="none" stroke="#A89480" strokeWidth="1" />
              <ellipse cx="56" cy="54" rx="14" ry="7.5" fill="url(#syahiShine)" stroke="#38332E" strokeWidth="0.8" />
              <ellipse cx="114" cy="102" rx="34" ry="12" fill="url(#biraVelvet)" stroke="#D4AF37" strokeWidth="1.8" />
              <path
                d="M88 56 L94 98 C94 102, 134 102, 134 98 L140 56 Z"
                fill="url(#dayanWood)"
                stroke="#240D05"
                strokeWidth="1.2"
              />
              <rect x="91" y="70" width="8" height="5" rx="1.5" fill="#C29B38" stroke="#5E430B" strokeWidth="0.8" />
              <rect x="93" y="79" width="8" height="5" rx="1.5" fill="#C29B38" stroke="#5E430B" strokeWidth="0.8" />
              <rect x="130" y="73" width="8" height="5" rx="1.5" fill="#C29B38" stroke="#5E430B" strokeWidth="0.8" />
              <line x1="96" y1="56" x2="98" y2="98" stroke="#2B1508" strokeWidth="1" />
              <line x1="108" y1="56" x2="108" y2="100" stroke="#2B1508" strokeWidth="1" />
              <line x1="120" y1="56" x2="120" y2="100" stroke="#2B1508" strokeWidth="1" />
              <line x1="132" y1="56" x2="130" y2="98" stroke="#2B1508" strokeWidth="1" />
              <ellipse cx="114" cy="54" rx="26" ry="11" fill="url(#puriSkin)" stroke="#523924" strokeWidth="2" />
              <ellipse cx="114" cy="54" rx="23" ry="9.5" fill="none" stroke="#8A7662" strokeWidth="0.8" />
              <ellipse cx="114" cy="54" rx="11" ry="5.8" fill="url(#syahiShine)" stroke="#302C28" strokeWidth="0.8" />
            </svg>
          </div>
          <div className="header-titles">
            <h1 className="app-title">Tabla Taal Engine</h1>
            <div className="app-subtitle-wrap">
              <span className="subtitle-dash" aria-hidden="true"></span>
              <p className="app-subtitle">Metronome-based Tabla Beat Counting</p>
              <span className="subtitle-dash" aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <div className="header-wave-separator" aria-hidden="true">
          <svg viewBox="0 0 740 22" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 0 C 180 20, 360 8, 540 18 C 640 22, 700 12, 740 6 L740 22 L0 22 Z"
              fill="#FFFDF9"
            />
            <path
              d="M0 0 C 180 20, 360 8, 540 18 C 640 22, 700 12, 740 6"
              stroke="#D4AF37"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      </header>
      <div id="taalStatusNotice" className="taal-status-notice" role="status" aria-live="polite"></div>
      <section className="controls-section" aria-label="Taal and Tempo Controls">
        <div className="controls-row">
          <div className="taal-select-group">
            <label className="control-label" htmlFor="taalSelect">Select Taal</label>
            <div className="select-wrapper">
              <select className="taal-dropdown" id="taalSelect" name="taalSelect" aria-label="Select Taal">
                <option value="">Loading Taals...</option>
              </select>
              <span className="select-arrow" aria-hidden="true">
                <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L7 7.5L13 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
          <div className="tempo-control-group">
            <label className="control-label" htmlFor="tempoInput">Tempo</label>
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
            <label className="control-label">Playback</label>
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
      <div className="section-divider" role="separator" aria-hidden="true"></div>
      <section className="beat-display-section" aria-label="Beat Counting Display">
        <div id="playbackInfoBar" className="playback-info-bar" role="status" aria-live="polite"></div>
        <div className="beat-grid-card">
          <div className="beat-grid" id="beatGrid" role="region" aria-label="Beat Grid">
          </div>
        </div>
      </section>
    </main>
  );
}
