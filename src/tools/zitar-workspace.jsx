export function ZitarWorkspace() {
  return (
    <><main className="notes-main zitar-main">
      <section className="zitar-hero">
        <div className="container">
          <h1 className="zitar-title">Zitar <span>Tone Reference</span></h1>
          <p className="zitar-subtitle">Explore and recreate your favourite Zitar tones using your amplifier.</p>
        </div>
      </section>
      <section className="container zitar-workspace-container">
        <div className="zitar-workspace-grid">
          <aside className="zitar-sidebar" id="zitarSidebar" aria-label="Patch Library and Search">
            <div className="sidebar-search-wrapper" id="sidebarSearchWrapper">
              <label className="sr-only" htmlFor="patchSearchInput">Search Presets</label>
              <div className="search-input-box">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  id="patchSearchInput"
                  className="search-input"
                  placeholder="Search patches by name, category or sound..."
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search patches by name, category or sound"
                />
                <button type="button" id="searchClearBtn" className="search-clear-btn" aria-label="Clear search" style={{ display: "none" }}>&times;</button>
              </div>
              <div id="searchSuggestionsDropdown" className="search-suggestions-dropdown" style={{ display: "none" }} role="listbox" aria-label="Search Suggestions">
              </div>
            </div>
            <div className="sidebar-patch-list-scroll" id="sidebarPatchListScroll" role="tablist" aria-label="Tone Presets">
            </div>
            <div id="noPatchesNotice" className="no-patches-notice" style={{ display: "none" }} role="status">
              No matching patches found.
            </div>
            <select id="patchSelect" className="sr-only" aria-hidden="true"></select>
            <div id="patchRibbon" className="sr-only" aria-hidden="true"></div>
            <div className="sidebar-bottom-bar">
              <button type="button" id="sidebarSearchFocusBtn" className="sidebar-search-focus-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>Search Presets</span>
              </button>
            </div>
          </aside>
          <div className="zitar-main-content">
            <div className="selected-patch-header-bar">
              <div className="patch-header-main">
                <div className="patch-meta-row">
                  <span className="patch-number-badge" id="infoPatchNumber">PATCH 01</span>
                  <span className="patch-category-badge" id="infoCategory">Classical and Indian Music</span>
                </div>
                <div className="patch-title-row">
                  <h2 className="selected-patch-title" id="infoPatchName">Classical Clean Zitar</h2>
                  <button type="button" id="aboutPatchBtn" className="about-patch-btn" aria-haspopup="dialog" aria-expanded="false" title="View detailed patch information">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>About</span>
                  </button>
                </div>
                <div className="patch-character-row">
                  <span className="character-label">Character:</span>
                  <span className="character-value" id="infoCharacter">Pure, natural and articulate.</span>
                </div>
              </div>
              <div className="patch-header-amp">
                <label className="amp-select-label" htmlFor="ampSelect">SELECT AMPLIFIER</label>
                <div className="custom-select-wrapper">
                  <select id="ampSelect" className="zitar-select" aria-label="Select amplifier model">
                  </select>
                  <span className="select-arrow" aria-hidden="true">▾</span>
                </div>
              </div>
            </div>
            <section className="amp-control-panel" id="ampControlPanel" aria-label="Gretex GT-15FX Amplifier Controls">
            </section>
          </div>
        </div>
      </section>
    </main>
    <div id="aboutModal" className="about-modal-backdrop" style={{ display: "none" }} role="dialog" aria-modal="true" aria-labelledby="modalPatchName">
      <div className="about-modal-card">
        <div className="about-modal-header">
          <div className="modal-title-group">
            <div className="modal-meta-row">
              <span className="patch-number-badge" id="modalPatchNumber">PATCH 01</span>
              <span className="patch-category-badge" id="modalCategory">Classical and Indian Music</span>
            </div>
            <h3 className="modal-patch-title" id="modalPatchName">Classical Clean Zitar</h3>
          </div>
          <button type="button" id="closeAboutModalBtn" className="modal-close-btn" aria-label="Close dialog">&times;</button>
        </div>
        <div className="about-modal-body">
          <div className="modal-info-section">
            <span className="info-section-label">Tonal Character</span>
            <p className="info-character-text" id="modalCharacter">Pure, natural and articulate.</p>
          </div>
          <div className="modal-info-section">
            <span className="info-section-label">Sound Description</span>
            <p className="info-desc-text" id="infoDescription">
              A clean, pristine tone that preserves the natural acoustic resonance...
            </p>
          </div>
          <div className="modal-info-section">
            <span className="info-section-label">Recommended Applications</span>
            <ul className="info-bullet-list" id="infoApplicationsList">
            </ul>
          </div>
          <div className="modal-info-section">
            <span className="info-section-label">Recommended Playing Techniques</span>
            <ul className="info-bullet-list" id="infoTechniquesList">
            </ul>
          </div>
          <div className="info-note-box" id="infoNoteBox" style={{ display: "none" }}>
            <div className="info-note-label">Technical Note</div>
            <p id="infoNoteText"></p>
          </div>
        </div>
        <div className="about-modal-footer">
          <button type="button" id="closeModalBottomBtn" className="modal-footer-close-btn">Close</button>
        </div>
      </div>
    </div>
    </>
  );
}
