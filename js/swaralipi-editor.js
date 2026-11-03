/* ================================================================
   Swaralipi — Hindustani Classical Music Notation Editor
   Controller, input handling, proxy caret trap for desktop & mobile,
   rendering, selection, undo / redo, section management, and exports.
   ================================================================ */
(function (S) {
  "use strict";
  if (!S) throw new Error("Swaralipi engine must be loaded first.");

  /* ──────────────────────────────────────────────────────────── *
   *  UNDO MANAGER
   * ──────────────────────────────────────────────────────────── */
  function UndoManager(maxSize) {
    this._undo = [];
    this._redo = [];
    this._max = maxSize || 150;
  }
  UndoManager.prototype.push = function (snapshot) {
    this._undo.push(snapshot);
    this._redo = [];
    if (this._undo.length > this._max) this._undo.shift();
  };
  UndoManager.prototype.undo = function () {
    if (this._undo.length <= 1) return null;
    this._redo.push(this._undo.pop());
    return this._undo[this._undo.length - 1];
  };
  UndoManager.prototype.redo = function () {
    if (!this._redo.length) return null;
    var s = this._redo.pop();
    this._undo.push(s);
    return s;
  };
  UndoManager.prototype.clear = function () {
    this._undo = [];
    this._redo = [];
  };
  UndoManager.prototype.canUndo = function () { return this._undo.length > 1; };
  UndoManager.prototype.canRedo = function () { return this._redo.length > 0; };

  /* ──────────────────────────────────────────────────────────── *
   *  MAIN EDITOR CLASS
   * ──────────────────────────────────────────────────────────── */
  function SwaralipiEditor(rootEl) {
    this.root = rootEl;
    this.song = S.createSong();
    this.activeSectionIdx = 0;
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.groupMode = false;
    this.inputBuffer = "";
    this.undoMgr = new UndoManager();
    this.selection = null;         // {anchorPos, anchorOff, focusPos, focusOff}
    this.clipboard = null;         // {positions: [...]}
    this.savedSong = null;         // for dirty check
    this._pdfBarsPerRow = 4;       // 4 or 2
    this.barsPerRow = 4;           // 4 bars per row default for desktop editing

    // DOM caches
    this._songNameEl = null;
    this._scaleEl = null;
    this._timeEl = null;
    this._sectionsEl = null;
    this._cursorEl = null;
    this._bufferEl = null;
    this._popupEl = null;
    this._contextEl = null;
    this._toastEl = null;
    this._modalEl = null;
    this._printEl = null;
    this._groupToggle = null;
    this._fileInput = null;
    this._proxyInput = null;
    this._typingTimer = null;

    this._build();
    this._bindEvents();
    this.savedSong = S.cloneSong(this.song);
    this._saveSnapshot();
    this.render();
  }

  var P = SwaralipiEditor.prototype;

  /* ════════════════════════════════════════════════════════════ *
   *  DOM SHELL GENERATION
   * ════════════════════════════════════════════════════════════ */
  P._build = function () {
    var h = "";

    // Hero title
    h += '<section class="swaralipi-hero">';
    h += '<p class="eyebrow">Tools / Notation Editor</p>';
    h += '<h1>Swar<span>alipi</span></h1>';
    h += '<p class="notes-subtitle">Hindustani Classical Music Notation Editor</p>';
    h += '</section>';

    // Song info header
    h += '<div class="song-info-bar">';
    h += '<div class="song-info-field">';
    h += '<label for="swSongName">Song Name</label>';
    h += '<input id="swSongName" type="text" placeholder="Raag Yaman - Bandish" autocomplete="off" spellcheck="false" />';
    h += '</div>';

    h += '<div class="song-info-field">';
    h += '<label for="swScale">Scale (Sa)</label>';
    h += '<select id="swScale">';
    S.SCALES.forEach(function (s) {
      h += '<option value="' + s + '">' + s + '</option>';
    });
    h += '</select>';
    h += '</div>';

    h += '<div class="song-info-field">';
    h += '<label for="swTime">Music Bars</label>';
    h += '<select id="swTime">';
    S.TIME_SIGNATURES.forEach(function (t) {
      h += '<option value="' + t + '"' + (t === "4/4" ? ' selected' : '') + '>' + t + '</option>';
    });
    h += '</select>';
    h += '</div>';
    h += '</div>';

    // Project controls bar
    h += '<div class="project-controls-bar">';
    h += '<button class="sw-btn" data-action="undo" title="Undo (Ctrl+Z)">↶ Undo</button>';
    h += '<button class="sw-btn" data-action="redo" title="Redo (Ctrl+Y)">↷ Redo</button>';
    h += '<button class="sw-btn" data-action="toggle-bars" id="swBarsToggle" title="Toggle between 4 bars and 2 bars per row">4 Bars / Row</button>';
    h += '<button class="sw-btn sw-btn--accent" data-action="export-swar" title="Export .swar project file">⬇ Export Project (.swar)</button>';
    h += '<button class="sw-btn" data-action="import-swar" title="Import .swar project file">⬆ Import Project</button>';
    h += '<button class="sw-btn" data-action="export-txt" title="Export plain text">📄 Export TXT</button>';
    h += '<button class="sw-btn" data-action="export-pdf" title="Print or preview PDF">🖨 PDF Preview</button>';
    h += '<button class="sw-btn sw-btn--danger" data-action="reset" title="Reset composition">⟲ Reset</button>';
    h += '<input type="file" id="swFileInput" accept=".swar" style="display:none" />';
    h += '</div>';

    // Sections container
    h += '<div class="swaralipi-sections" id="swSections"></div>';

    // Add Section button
    h += '<button class="add-section-btn" data-action="add-section" style="margin-top:1.5rem;">+ Add Section</button>';

    // Hidden proxy caret trap for desktop & mobile virtual keyboard
    h += '<input type="text" id="swProxyInput" class="sw-proxy-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-hidden="true" style="position:fixed; opacity:0; width:1px; height:1px; top:0; left:0; border:0; padding:0; pointer-events:none; z-index:-1;" />';

    // Floating UI Elements
    h += '<div class="sw-cursor" id="swCursor"></div>';
    h += '<div class="input-buffer" id="swBuffer"></div>';
    h += '<div class="selection-popup is-hidden" id="swPopup"></div>';
    h += '<div class="sw-context-menu is-hidden" id="swContext"></div>';
    h += '<div class="sw-toast" id="swToast"></div>';
    h += '<div class="sw-modal-overlay is-hidden" id="swModal"><div class="sw-modal"></div></div>';
    h += '<div class="sw-print-overlay is-hidden" id="swPrint"></div>';

    this.root.innerHTML = h;

    // Cache elements
    this._songNameEl = document.getElementById("swSongName");
    this._scaleEl = document.getElementById("swScale");
    this._timeEl = document.getElementById("swTime");
    this._sectionsEl = document.getElementById("swSections");
    this._cursorEl = document.getElementById("swCursor");
    this._bufferEl = document.getElementById("swBuffer");
    this._popupEl = document.getElementById("swPopup");
    this._contextEl = document.getElementById("swContext");
    this._toastEl = document.getElementById("swToast");
    this._modalEl = document.getElementById("swModal");
    this._printEl = document.getElementById("swPrint");
    this._fileInput = document.getElementById("swFileInput");
    this._proxyInput = document.getElementById("swProxyInput");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  EVENT ATTACHMENTS
   * ════════════════════════════════════════════════════════════ */
  P._bindEvents = function () {
    var self = this;

    // Song info changes
    this._songNameEl.addEventListener("input", function () {
      self.song.name = this.value;
      self._saveSnapshotDebounced();
    });
    this._scaleEl.addEventListener("change", function () {
      self.song.scale = this.value;
      self._saveSnapshot();
    });
    this._timeEl.addEventListener("change", function () {
      self.song.timeSignature = this.value;
      self._saveSnapshot();
      self.render();
    });

    // Button clicks inside root
    this.root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (btn) {
        self._handleAction(btn.dataset.action, e);
        return;
      }
      var ctrl = e.target.closest("[data-section-action]");
      if (ctrl) {
        var idx = Number(ctrl.dataset.sectionIndex);
        self._handleSectionAction(ctrl.dataset.sectionAction, idx);
        return;
      }
    });

    // Proxy Input keyboard events
    this._proxyInput.addEventListener("keydown", function (e) {
      self._onKeyDown(e);
    });
    this._proxyInput.addEventListener("keyup", function (e) {
      self._onKeyUp(e);
    });
    this._proxyInput.addEventListener("input", function (e) {
      if (self._proxyInput.value) {
        var val = self._proxyInput.value;
        self._proxyInput.value = "";
        for (var ci = 0; ci < val.length; ci++) {
          self._handleCharInput(val[ci]);
        }
      }
    });

    // Global keyboard listener for shortcut fallback
    document.addEventListener("keydown", function (e) {
      var active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA")) {
        if (active !== self._proxyInput) return;
      }
      if (active !== self._proxyInput) {
        self._onKeyDown(e);
      }
    });

    // Notation area clicks, section switching & selection
    document.addEventListener("click", function (e) {
      self._hideContextMenu();

      var posEl = e.target.closest(".sw-position");
      if (posEl) {
        var area = posEl.closest(".notation-area");
        if (area) {
          var areaIdx = Number(area.dataset.sectionIndex);
          if (!isNaN(areaIdx) && areaIdx !== self.activeSectionIdx) {
            self._switchActiveSection(areaIdx);
          }
          self._handlePositionClick(posEl, e);
          return;
        }
      }

      var area = e.target.closest(".notation-area");
      if (area) {
        var areaIdx2 = Number(area.dataset.sectionIndex);
        if (!isNaN(areaIdx2) && areaIdx2 !== self.activeSectionIdx) {
          self._switchActiveSection(areaIdx2);
        }
        self._clickedEmptyArea(area, e);
        return;
      }

      var secEl = e.target.closest(".swaralipi-section");
      if (secEl) {
        var secIdx = Number(secEl.dataset.sectionIndex);
        if (!isNaN(secIdx) && secIdx !== self.activeSectionIdx) {
          self._switchActiveSection(secIdx);
        }
      }

      if (!e.target.closest(".selection-popup") && !e.target.closest(".sw-context-menu")) {
        self._hidePopup();
      }
    });

    // Right-click context menu
    document.addEventListener("contextmenu", function (e) {
      var area = e.target.closest(".notation-area");
      if (area) {
        e.preventDefault();
        self._setActiveSectionByArea(area);
        self._showContextMenu(e.clientX, e.clientY);
      }
    });

    // File input change
    this._fileInput.addEventListener("change", function () {
      if (this.files.length) self._importFile(this.files[0]);
      this.value = "";
    });

    // Drag and drop for .swar files
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        var file = e.dataTransfer.files[0];
        if (file.name.endsWith(".swar")) {
          self._importFile(file);
        }
      }
    });

    // Viewport resize & scroll
    window.addEventListener("scroll", function () {
      self._hidePopup();
      self._hideContextMenu();
      self._repositionCursor();
    }, { passive: true });

    window.addEventListener("resize", function () {
      self._repositionCursor();
    });
  };

  /* ════════════════════════════════════════════════════════════ *
   *  PROXY INPUT FOCUS
   * ════════════════════════════════════════════════════════════ */
  P._focusProxy = function () {
    if (this._proxyInput) {
      this._proxyInput.value = "";
      this._proxyInput.focus({ preventScroll: true });
    }
  };

  /* ════════════════════════════════════════════════════════════ *
   *  ACTIONS DISPATCHER
   * ════════════════════════════════════════════════════════════ */
  P._handleAction = function (action) {
    switch (action) {
      case "undo": this._undo(); break;
      case "redo": this._redo(); break;
      case "toggle-bars":
        this.barsPerRow = (this.barsPerRow === 4) ? 2 : 4;
        var btn = document.getElementById("swBarsToggle");
        if (btn) btn.textContent = this.barsPerRow + " Bars / Row";
        this.render();
        this._toast("Displaying " + this.barsPerRow + " bars per row.");
        break;
      case "reset": this._confirmReset(); break;
      case "export-swar": this._exportSwar(); break;
      case "import-swar": this._fileInput.click(); break;
      case "export-txt": this._exportTxt(); break;
      case "export-pdf": this._showPdfPreview(); break;
      case "add-section": this._addSection(); break;
    }
  };

  /* ════════════════════════════════════════════════════════════ *
   *  SECTION MANAGEMENT
   * ════════════════════════════════════════════════════════════ */
  P._addSection = function () {
    var self = this;
    var usedNames = this.song.sections.map(function (s) { return s.name; });
    var candidate = S.DEFAULT_SECTIONS.find(function (n) { return usedNames.indexOf(n) === -1; });
    var name = candidate || ("Section " + (this.song.sections.length + 1));

    this.song.sections.push(S.createSection(name));
    this.activeSectionIdx = this.song.sections.length - 1;
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
    this._focusProxy();
  };

  P._handleSectionAction = function (action, idx) {
    var secs = this.song.sections;
    if (idx < 0 || idx >= secs.length) return;

    switch (action) {
      case "toggle-group":
        this._setGroupMode(!this.groupMode);
        this._focusProxy();
        return;
      case "delete":
        if (secs.length <= 1) {
          this._toast("Cannot delete the only section.");
          return;
        }
        secs.splice(idx, 1);
        if (this.activeSectionIdx >= secs.length) {
          this.activeSectionIdx = secs.length - 1;
        }
        break;
      case "move-up":
        if (idx === 0) return;
        var tmp = secs[idx];
        secs[idx] = secs[idx - 1];
        secs[idx - 1] = tmp;
        if (this.activeSectionIdx === idx) this.activeSectionIdx--;
        else if (this.activeSectionIdx === idx - 1) this.activeSectionIdx++;
        break;
      case "move-down":
        if (idx >= secs.length - 1) return;
        var tmp2 = secs[idx];
        secs[idx] = secs[idx + 1];
        secs[idx + 1] = tmp2;
        if (this.activeSectionIdx === idx) this.activeSectionIdx++;
        else if (this.activeSectionIdx === idx + 1) this.activeSectionIdx--;
        break;
    }
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
    this._focusProxy();
  };

  P._switchActiveSection = function (newIdx) {
    if (newIdx === this.activeSectionIdx || newIdx < 0 || newIdx >= this.song.sections.length) return;
    this._commitBuffer();

    var prevSec = this.song.sections[this.activeSectionIdx];
    if (prevSec) {
      prevSec.groupMode = this.groupMode;
    }

    this.activeSectionIdx = newIdx;
    var nextSec = this.song.sections[newIdx];
    this.groupMode = nextSec && typeof nextSec.groupMode === "boolean" ? nextSec.groupMode : false;
    this.cursor = { posIndex: nextSec ? nextSec.positions.length : 0, charOffset: 0 };
    this.selection = null;
    this.render();
    this._focusProxy();
  };

  P._setActiveSectionByArea = function (areaEl) {
    var idx = Number(areaEl.dataset.sectionIndex);
    if (!isNaN(idx) && idx !== this.activeSectionIdx) {
      this._switchActiveSection(idx);
    }
  };

  P._activeSection = function () {
    return this.song.sections[this.activeSectionIdx] || this.song.sections[0];
  };

  /* ════════════════════════════════════════════════════════════ *
   *  RENDERING
   * ════════════════════════════════════════════════════════════ */
  P.render = function () {
    var self = this;
    var secs = this.song.sections;
    var html = "";

    for (var si = 0; si < secs.length; si++) {
      html += this._renderSection(secs[si], si);
    }
    this._sectionsEl.innerHTML = html;

    // Bind section name inputs
    var nameInputs = this._sectionsEl.querySelectorAll(".section-name-input");
    nameInputs.forEach(function (inp) {
      inp.addEventListener("input", function () {
        var idx = Number(this.dataset.sectionIndex);
        if (!isNaN(idx) && secs[idx]) {
          secs[idx].name = this.value || "Untitled";
          self._saveSnapshotDebounced();
        }
      });
    });

    this._syncSongInfo();
    this._repositionCursor();
    this._updateGroupToggleUI();
    this._hidePopup();
  };

  P._renderSection = function (sec, si) {
    var isActive = si === this.activeSectionIdx;
    var h = '<div class="swaralipi-section' + (isActive ? ' is-active' : '') + '" data-section-index="' + si + '">';
    h += '<div class="section-header">';
    h += '<input class="section-name-input" value="' + this._escAttr(sec.name) + '" data-section-index="' + si + '" spellcheck="false" />';
    h += '<div class="section-controls">';
    if (isActive) {
      h += '<button class="section-ctrl-btn group-btn' + (this.groupMode ? ' is-active' : '') + '" id="swGroupToggle" data-section-action="toggle-group" data-section-index="' + si + '" title="Toggle Group Mode">' + (this.groupMode ? 'Group ●' : 'Group') + '</button>';
    }
    h += '<button class="section-ctrl-btn" data-section-action="move-up" data-section-index="' + si + '" title="Move section up">▲</button>';
    h += '<button class="section-ctrl-btn" data-section-action="move-down" data-section-index="' + si + '" title="Move section down">▼</button>';
    h += '<button class="section-ctrl-btn" data-section-action="delete" data-section-index="' + si + '" title="Delete section">✕</button>';
    h += '</div></div>';

    h += '<div class="notation-area" tabindex="0" data-section-index="' + si + '" style="overflow-x:auto;">';
    h += this._renderNotation(sec);
    h += '</div>';

    // Status footer
    var ppm = S.getPositionsPerMeasure(this.song.timeSignature);
    var measures = S.buildMeasures(sec.positions, this.song.timeSignature);
    h += '<div class="swaralipi-status">';
    h += '<span class="status-item">Positions: ' + sec.positions.length + '</span>';
    h += '<span class="status-item">Measures: ' + measures.length + '</span>';
    h += '<span class="status-item">Time: ' + this.song.timeSignature + ' (' + ppm + ' pos/bar)</span>';
    h += '</div>';

    h += '</div>';
    return h;
  };

  P._renderNotation = function (sec) {
    if (sec.positions.length === 0) {
      return '<div class="notation-empty">Click here and start typing swaras (e.g. S R G M)…</div>';
    }

    var measures = S.buildMeasures(sec.positions, this.song.timeSignature);
    var bpr = this.barsPerRow || 4;
    var blocks = S.buildBlocks(measures, bpr);
    var h = "";

    for (var bi = 0; bi < blocks.length; bi++) {
      h += '<div class="four-bar-block bars-per-row-' + bpr + '">';
      for (var ri = 0; ri < blocks[bi].rows.length; ri++) {
        h += '<div class="notation-row">';
        var rowMeasures = blocks[bi].rows[ri];
        for (var mi = 0; mi < rowMeasures.length; mi++) {
          if (mi > 0) h += '<div class="sw-barline"></div>';
          h += '<div class="sw-measure">';
          var measure = rowMeasures[mi];
          for (var pi = 0; pi < measure.positions.length; pi++) {
            var pos = measure.positions[pi];
            var absIdx = measure.startIndex + pi;
            var selected = this._isPosSelected(absIdx);
            h += '<span class="sw-position' + (selected ? ' is-selected' : '') + '" data-pos-index="' + absIdx + '">';
            var text = S.positionToText(pos);
            for (var ci = 0; ci < text.length; ci++) {
              h += '<span class="pos-char" data-char-offset="' + ci + '">' + this._escHtml(text[ci]) + '</span>';
            }
            h += '</span>';
          }
          h += '</div>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
    return h;
  };

  P._syncSongInfo = function () {
    if (this._songNameEl.value !== this.song.name) this._songNameEl.value = this.song.name;
    if (this._scaleEl.value !== this.song.scale) this._scaleEl.value = this.song.scale;
    if (this._timeEl.value !== this.song.timeSignature) this._timeEl.value = this.song.timeSignature;
  };

  /* ════════════════════════════════════════════════════════════ *
   *  CURSOR POSITIONING & DISPLAY
   * ════════════════════════════════════════════════════════════ */
  P._repositionCursor = function () {
    var sec = this._activeSection();
    var area = this._sectionsEl.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (!area) {
      this._cursorEl.style.display = "none";
      this._bufferEl.style.display = "none";
      return;
    }

    if (sec.positions.length === 0) {
      var areaRect = area.getBoundingClientRect();
      var cLeft = areaRect.left + 16 + window.scrollX;
      var cTop = areaRect.top + 14 + window.scrollY;
      this._cursorEl.style.display = "block";
      this._cursorEl.style.left = cLeft + "px";
      this._cursorEl.style.top = cTop + "px";
      this._cursorEl.style.height = "1.5em";

      if (this.inputBuffer) {
        this._bufferEl.textContent = this.inputBuffer;
        this._bufferEl.style.display = "block";
        this._bufferEl.style.left = (cLeft + 3) + "px";
        this._bufferEl.style.top = cTop + "px";
      } else {
        this._bufferEl.style.display = "none";
      }
      return;
    }

    var posIdx = Math.min(this.cursor.posIndex, sec.positions.length);
    var cursorX, cursorY, cursorH;

    if (posIdx < sec.positions.length) {
      var posEl = area.querySelector('.sw-position[data-pos-index="' + posIdx + '"]');
      if (!posEl) {
        this._cursorEl.style.display = "none";
        this._bufferEl.style.display = "none";
        return;
      }

      var charEls = posEl.querySelectorAll(".pos-char");
      if (this.cursor.charOffset > 0 && this.cursor.charOffset <= charEls.length) {
        var charEl = charEls[this.cursor.charOffset - 1];
        var r = charEl.getBoundingClientRect();
        cursorX = r.right + window.scrollX;
      } else {
        var r2 = posEl.getBoundingClientRect();
        cursorX = r2.left + window.scrollX;
      }
      var posRect = posEl.getBoundingClientRect();
      cursorY = posRect.top + window.scrollY;
      cursorH = posRect.height;
    } else {
      var lastPosEl = area.querySelector('.sw-position[data-pos-index="' + (sec.positions.length - 1) + '"]');
      if (lastPosEl) {
        var lr = lastPosEl.getBoundingClientRect();
        cursorX = lr.right + 2 + window.scrollX;
        cursorY = lr.top + window.scrollY;
        cursorH = lr.height;
      } else {
        var ar = area.getBoundingClientRect();
        cursorX = ar.left + 16 + window.scrollX;
        cursorY = ar.top + 14 + window.scrollY;
        cursorH = 24;
      }
    }

    this._cursorEl.style.display = "block";
    this._cursorEl.style.left = cursorX + "px";
    this._cursorEl.style.top = cursorY + "px";
    this._cursorEl.style.height = cursorH + "px";

    if (this.inputBuffer) {
      this._bufferEl.textContent = this.inputBuffer;
      this._bufferEl.style.display = "block";
      this._bufferEl.style.left = (cursorX + 3) + "px";
      this._bufferEl.style.top = cursorY + "px";
    } else {
      this._bufferEl.style.display = "none";
    }
  };

  P._handlePositionClick = function (posEl, e) {
    var posIdx = Number(posEl.dataset.posIndex);
    var charEl = e.target.closest(".pos-char");
    var charOff = 0;

    if (charEl) {
      var off = Number(charEl.dataset.charOffset);
      var r = charEl.getBoundingClientRect();
      charOff = (e.clientX > r.left + r.width / 2) ? off + 1 : off;
    }

    this._commitBuffer();
    this.cursor = { posIndex: posIdx, charOffset: charOff };
    this.selection = null;
    this._hidePopup();
    this._repositionCursor();
    this._focusProxy();
  };

  P._clickedEmptyArea = function (areaEl, e) {
    var sec = this._activeSection();
    this._commitBuffer();
    this.cursor = { posIndex: sec.positions.length, charOffset: 0 };
    this.selection = null;
    this._repositionCursor();
    this._focusProxy();
  };

  /* ════════════════════════════════════════════════════════════ *
   *  KEYBOARD INPUT HANDLER
   * ════════════════════════════════════════════════════════════ */
  P._onKeyDown = function (e) {
    var area = document.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (!area) return;

    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl) {
      var k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) this._redo();
        else this._undo();
        return;
      }
      if (k === "y") {
        e.preventDefault();
        this._redo();
        return;
      }
      if (k === "c") {
        e.preventDefault();
        this._copy();
        return;
      }
      if (k === "v") {
        e.preventDefault();
        this._paste();
        return;
      }
      if (k === "a") {
        e.preventDefault();
        this._selectAll();
        return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this._hidePopup();
      this._hideContextMenu();
      if (this.selection) {
        this.selection = null;
        this.render();
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      this._commitBuffer();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) this._extendSelectionLeft();
      else this._moveCursorLeft();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) this._extendSelectionRight();
      else this._moveCursorRight();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      this._handleBackspace();
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      this._handleDelete();
      return;
    }

    // Printable character
    if (e.key.length === 1 && !ctrl) {
      e.preventDefault();
      this._handleCharInput(e.key);
      return;
    }
  };

  P._onKeyUp = function (e) {};

  /* ════════════════════════════════════════════════════════════ *
   *  GROUP MODE MANAGEMENT
   * ════════════════════════════════════════════════════════════ */
  P._setGroupMode = function (on) {
    var wasOn = this.groupMode;
    this.groupMode = !!on;
    var sec = this._activeSection();
    if (sec) {
      sec.groupMode = this.groupMode;
    }
    this._updateGroupToggleUI();

    // If turning OFF and buffer has content, commit the group
    if (wasOn && !this.groupMode && this.inputBuffer) {
      this._commitBuffer();
    }
  };

  P._updateGroupToggleUI = function () {
    var toggle = document.getElementById("swGroupToggle");
    if (toggle) {
      toggle.classList.toggle("is-active", this.groupMode);
      toggle.textContent = this.groupMode ? "Group ●" : "Group";
    }
  };

  /* ════════════════════════════════════════════════════════════ *
   *  INPUT DISPATCH & BUFFER COMMIT
   * ════════════════════════════════════════════════════════════ */
  P._handleCharInput = function (ch) {
    ch = S.normalizeSwara(ch);

    if (this.selection) {
      this._deleteSelection();
    }

    clearTimeout(this._bufferTimer);

    // Space handling
    if (ch === " ") {
      if (this.groupMode) return; // Spaces ignored in Group Mode (Rule 5.2.2)
      this._commitBuffer();
      return;
    }

    // Base Swara Input
    if (S.isSwara(ch)) {
      if (this.groupMode) {
        // Accumulate into group buffer
        this.inputBuffer += ch;
        this._repositionCursor();
      } else {
        // Normal Mode (Caps Lock OFF)
        if (S.bufferHasSwara(this.inputBuffer)) {
          // If buffer already held a completed swara (e.g. S'), commit it first
          this._commitBuffer();
        }
        this.inputBuffer += ch;
        this._repositionCursor();
        this._startBufferTimer();
      }
      return;
    }

    // Modifier Input (-, ', ,, :)
    if (S.isModifier(ch)) {
      this.inputBuffer += ch;
      this._repositionCursor();
      if (!this.groupMode && S.bufferHasSwara(this.inputBuffer)) {
        this._startBufferTimer();
      }
      return;
    }

    // Invalid character
    this._toast("Invalid character: " + ch + " (use S,r,R,g,G,M,m,P,d,D,n,N or - ' , :)");
  };

  P._startBufferTimer = function () {
    var self = this;
    clearTimeout(this._bufferTimer);
    this._bufferTimer = setTimeout(function () {
      if (!self.groupMode && S.bufferHasSwara(self.inputBuffer)) {
        self._commitBuffer();
      }
    }, 400);
  };

  P._commitBuffer = function () {
    clearTimeout(this._bufferTimer);
    if (!this.inputBuffer) return;

    if (!S.bufferHasSwara(this.inputBuffer)) {
      // Standalone modifiers cannot become a position (B09/B10)
      this._toast("Modifier requires an associated swara.");
      this.inputBuffer = "";
      this._repositionCursor();
      return;
    }

    var parsed = S.parsePositionText(this.inputBuffer);
    if (!parsed.valid) {
      this._toast(parsed.error);
      this.inputBuffer = "";
      this._repositionCursor();
      return;
    }

    var pos = S.createPosition(parsed.tokens);
    var sec = this._activeSection();
    var insertIdx = Math.min(this.cursor.posIndex, sec.positions.length);

    // Requirement 10.5: If cursor was inside an existing group, preserve group and insert as separate position
    if (this.cursor.charOffset > 0 && insertIdx < sec.positions.length) {
      insertIdx++;
    }

    sec.positions.splice(insertIdx, 0, pos);
    this.cursor = { posIndex: insertIdx + 1, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  /* ════════════════════════════════════════════════════════════ *
   *  DELETION (BACKSPACE / DELETE)
   * ════════════════════════════════════════════════════════════ */
  P._handleBackspace = function () {
    if (this.selection) {
      this._deleteSelection();
      return;
    }

    if (this.inputBuffer) {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this._repositionCursor();
      return;
    }

    var sec = this._activeSection();
    if (sec.positions.length === 0) return;
    if (this.cursor.posIndex === 0 && this.cursor.charOffset === 0) return;

    var posIdx, charOff;
    if (this.cursor.charOffset > 0) {
      posIdx = this.cursor.posIndex;
      charOff = this.cursor.charOffset;
    } else {
      posIdx = this.cursor.posIndex - 1;
      if (posIdx < 0) return;
      charOff = S.positionCharCount(sec.positions[posIdx]);
    }

    if (posIdx >= sec.positions.length) {
      posIdx = sec.positions.length - 1;
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
      this._saveSnapshot();
      this.render();
      return;
    }

    var pos = sec.positions[posIdx];
    var text = S.positionToText(pos);

    if (text.length <= 1) {
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
      this._saveSnapshot();
      this.render();
      return;
    }

    var newText = text.slice(0, charOff - 1) + text.slice(charOff);
    var reparsed = S.parsePositionText(newText);
    if (reparsed.valid) {
      pos.tokens = reparsed.tokens;
      this.cursor = { posIndex: posIdx, charOffset: charOff - 1 };
    } else {
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
    }
    this._saveSnapshot();
    this.render();
  };

  P._handleDelete = function () {
    if (this.selection) {
      this._deleteSelection();
      return;
    }

    var sec = this._activeSection();
    if (sec.positions.length === 0) return;

    var posIdx = this.cursor.posIndex;
    var charOff = this.cursor.charOffset;
    if (posIdx >= sec.positions.length) return;

    var pos = sec.positions[posIdx];
    var text = S.positionToText(pos);
    if (charOff >= text.length) return;

    if (text.length <= 1) {
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
      this._saveSnapshot();
      this.render();
      return;
    }

    var newText = text.slice(0, charOff) + text.slice(charOff + 1);
    var reparsed = S.parsePositionText(newText);
    if (reparsed.valid) {
      pos.tokens = reparsed.tokens;
    } else {
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
    }
    this._saveSnapshot();
    this.render();
  };

  /* ════════════════════════════════════════════════════════════ *
   *  ARROW NAVIGATION
   * ════════════════════════════════════════════════════════════ */
  P._moveCursorLeft = function () {
    this._commitBuffer();
    this.selection = null;
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;

    if (this.cursor.charOffset > 0) {
      this.cursor.charOffset--;
    } else if (this.cursor.posIndex > 0) {
      this.cursor.posIndex--;
      this.cursor.charOffset = S.positionCharCount(sec.positions[this.cursor.posIndex]);
    }
    this._repositionCursor();
  };

  P._moveCursorRight = function () {
    this._commitBuffer();
    this.selection = null;
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;

    if (this.cursor.posIndex < sec.positions.length) {
      var posLen = S.positionCharCount(sec.positions[this.cursor.posIndex]);
      if (this.cursor.charOffset < posLen) {
        this.cursor.charOffset++;
      } else if (this.cursor.posIndex < sec.positions.length - 1) {
        this.cursor.posIndex++;
        this.cursor.charOffset = 0;
      } else {
        this.cursor.posIndex = sec.positions.length;
        this.cursor.charOffset = 0;
      }
    }
    this._repositionCursor();
  };

  /* ════════════════════════════════════════════════════════════ *
   *  SELECTION SYSTEM
   * ════════════════════════════════════════════════════════════ */
  P._extendSelectionLeft = function () {
    this._commitBuffer();
    if (!this.selection) {
      this.selection = {
        anchorPos: this.cursor.posIndex,
        anchorOff: this.cursor.charOffset,
        focusPos: this.cursor.posIndex,
        focusOff: this.cursor.charOffset
      };
    }
    var sec = this._activeSection();
    if (this.selection.focusOff > 0) {
      this.selection.focusOff--;
    } else if (this.selection.focusPos > 0) {
      this.selection.focusPos--;
      this.selection.focusOff = S.positionCharCount(sec.positions[this.selection.focusPos]);
    }
    this.cursor.posIndex = this.selection.focusPos;
    this.cursor.charOffset = this.selection.focusOff;
    this.render();
    this._showSelectionPopup();
  };

  P._extendSelectionRight = function () {
    this._commitBuffer();
    if (!this.selection) {
      this.selection = {
        anchorPos: this.cursor.posIndex,
        anchorOff: this.cursor.charOffset,
        focusPos: this.cursor.posIndex,
        focusOff: this.cursor.charOffset
      };
    }
    var sec = this._activeSection();
    if (this.selection.focusPos < sec.positions.length) {
      var posLen = S.positionCharCount(sec.positions[this.selection.focusPos]);
      if (this.selection.focusOff < posLen) {
        this.selection.focusOff++;
      } else if (this.selection.focusPos < sec.positions.length - 1) {
        this.selection.focusPos++;
        this.selection.focusOff = 0;
      }
    }
    this.cursor.posIndex = this.selection.focusPos;
    this.cursor.charOffset = this.selection.focusOff;
    this.render();
    this._showSelectionPopup();
  };

  P._getSelectionRange = function () {
    if (!this.selection) return null;
    var a = this.selection.anchorPos * 10000 + this.selection.anchorOff;
    var f = this.selection.focusPos * 10000 + this.selection.focusOff;
    if (a <= f) {
      return {
        startPos: this.selection.anchorPos, startOff: this.selection.anchorOff,
        endPos: this.selection.focusPos, endOff: this.selection.focusOff
      };
    } else {
      return {
        startPos: this.selection.focusPos, startOff: this.selection.focusOff,
        endPos: this.selection.anchorPos, endOff: this.selection.anchorOff
      };
    }
  };

  P._isPosSelected = function (posIdx) {
    var range = this._getSelectionRange();
    if (!range) return false;
    return posIdx >= range.startPos && posIdx <= range.endPos;
  };

  P._selectAll = function () {
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;
    this.selection = {
      anchorPos: 0, anchorOff: 0,
      focusPos: sec.positions.length - 1,
      focusOff: S.positionCharCount(sec.positions[sec.positions.length - 1])
    };
    this.render();
    this._showSelectionPopup();
  };

  P._selectMeasure = function () {
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;
    var ppm = S.getPositionsPerMeasure(this.song.timeSignature);
    var measureIdx = Math.floor(this.cursor.posIndex / ppm);
    var startPos = measureIdx * ppm;
    var endPos = Math.min(startPos + ppm - 1, sec.positions.length - 1);
    this.selection = {
      anchorPos: startPos, anchorOff: 0,
      focusPos: endPos, focusOff: S.positionCharCount(sec.positions[endPos])
    };
    this.render();
    this._showSelectionPopup();
  };

  P._selectRow = function () {
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;
    var ppm = S.getPositionsPerMeasure(this.song.timeSignature);
    var bpr = this.barsPerRow || S.BARS_PER_ROW || 4;
    var posPerRow = ppm * bpr;
    var rowIdx = Math.floor(this.cursor.posIndex / posPerRow);
    var startPos = rowIdx * posPerRow;
    var endPos = Math.min(startPos + posPerRow - 1, sec.positions.length - 1);
    this.selection = {
      anchorPos: startPos, anchorOff: 0,
      focusPos: endPos, focusOff: S.positionCharCount(sec.positions[endPos])
    };
    this.render();
    this._showSelectionPopup();
  };

  P._selectSection = function () {
    this._selectAll();
  };

  P._deleteSelection = function () {
    var range = this._getSelectionRange();
    if (!range) return;
    var sec = this._activeSection();
    var delStart = range.startPos;
    var delEnd = range.endPos;
    sec.positions.splice(delStart, delEnd - delStart + 1);
    this.cursor = { posIndex: delStart, charOffset: 0 };
    this.selection = null;
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  /* ════════════════════════════════════════════════════════════ *
   *  COPY, PASTE & REPETITION
   * ════════════════════════════════════════════════════════════ */
  P._copy = function () {
    var range = this._getSelectionRange();
    if (!range) {
      this._toast("Nothing selected to copy.");
      return;
    }
    var sec = this._activeSection();
    var copied = [];
    for (var i = range.startPos; i <= range.endPos && i < sec.positions.length; i++) {
      copied.push(S.clonePosition(sec.positions[i]));
    }
    this.clipboard = { positions: copied };

    var text = copied.map(S.positionToText).join(" ");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    this._toast("Copied " + copied.length + " position(s).");
  };

  P._paste = function () {
    var self = this;
    if (this.selection) this._deleteSelection();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.readText().then(function (text) {
        if (text) {
          self._pasteText(text);
        } else if (self.clipboard && self.clipboard.positions.length) {
          self._pastePositions(self.clipboard.positions.map(S.clonePosition));
        }
      }).catch(function () {
        if (self.clipboard && self.clipboard.positions.length) {
          self._pastePositions(self.clipboard.positions.map(S.clonePosition));
        }
      });
    } else if (this.clipboard && this.clipboard.positions.length) {
      this._pastePositions(this.clipboard.positions.map(S.clonePosition));
    }
  };

  P._pasteText = function (text) {
    text = S.normalizeNotationText(text);
    var result = S.parseNotationString(text);
    if (!result.valid) {
      this._toast("Paste rejected: " + result.error);
      return;
    }
    if (result.positions.length === 0) return;
    this._pastePositions(result.positions);
  };

  P._pastePositions = function (positions) {
    var sec = this._activeSection();
    var insertIdx = Math.min(this.cursor.posIndex, sec.positions.length);
    for (var i = 0; i < positions.length; i++) {
      sec.positions.splice(insertIdx + i, 0, positions[i]);
    }
    this.cursor = { posIndex: insertIdx + positions.length, charOffset: 0 };
    this._saveSnapshot();
    this.render();
    this._toast("Pasted " + positions.length + " position(s).");
  };

  // Repetition operations (Requirement 11.6)
  P._repeatSelection = function () {
    var range = this._getSelectionRange();
    if (!range) {
      this._repeatMeasure();
      return;
    }
    var sec = this._activeSection();
    var copied = [];
    for (var i = range.startPos; i <= range.endPos && i < sec.positions.length; i++) {
      copied.push(S.clonePosition(sec.positions[i]));
    }
    var insertIdx = range.endPos + 1;
    for (var j = 0; j < copied.length; j++) {
      sec.positions.splice(insertIdx + j, 0, copied[j]);
    }
    this.cursor = { posIndex: insertIdx + copied.length, charOffset: 0 };
    this.selection = null;
    this._saveSnapshot();
    this.render();
    this._toast("Selection repeated.");
  };

  P._repeatMeasure = function () {
    var sec = this._activeSection();
    if (sec.positions.length === 0) return;
    var ppm = S.getPositionsPerMeasure(this.song.timeSignature);
    var measureIdx = Math.floor(this.cursor.posIndex / ppm);
    var startPos = measureIdx * ppm;
    var endPos = Math.min(startPos + ppm, sec.positions.length);
    var copied = [];
    for (var i = startPos; i < endPos; i++) {
      copied.push(S.clonePosition(sec.positions[i]));
    }
    for (var j = 0; j < copied.length; j++) {
      sec.positions.splice(endPos + j, 0, copied[j]);
    }
    this.cursor = { posIndex: endPos + copied.length, charOffset: 0 };
    this._saveSnapshot();
    this.render();
    this._toast("Measure repeated.");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  CONTEXTUAL SELECTION POPUP & RIGHT CLICK
   * ════════════════════════════════════════════════════════════ */
  P._showSelectionPopup = function () {
    var range = this._getSelectionRange();
    if (!range) return;
    var area = this._sectionsEl.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (!area) return;

    var startEl = area.querySelector('.sw-position[data-pos-index="' + range.startPos + '"]');
    if (!startEl) return;

    var rect = startEl.getBoundingClientRect();
    var self = this;
    this._popupEl.innerHTML =
      '<button class="popup-btn" data-popup="copy">Copy</button>' +
      '<button class="popup-btn" data-popup="repeat">Repeat</button>' +
      '<button class="popup-btn" data-popup="select-bar">Select Bar</button>' +
      '<button class="popup-btn" data-popup="select-row">Select Row</button>' +
      '<button class="popup-btn" data-popup="select-section">Select Section</button>';

    this._popupEl.classList.remove("is-hidden");
    var popLeft = Math.max(10, rect.left);
    var popTop = Math.max(10, rect.top - 46);
    this._popupEl.style.left = popLeft + "px";
    this._popupEl.style.top = popTop + "px";

    this._popupEl.onclick = function (e) {
      var btn = e.target.closest("[data-popup]");
      if (!btn) return;
      switch (btn.dataset.popup) {
        case "copy": self._copy(); break;
        case "repeat": self._repeatSelection(); break;
        case "select-bar": self._selectMeasure(); break;
        case "select-row": self._selectRow(); break;
        case "select-section": self._selectSection(); break;
      }
      self._hidePopup();
    };
  };

  P._hidePopup = function () {
    if (this._popupEl) this._popupEl.classList.add("is-hidden");
  };

  P._showContextMenu = function (x, y) {
    var self = this;
    var h = '';
    h += '<button class="context-menu-item" data-ctx="copy">Copy</button>';
    h += '<button class="context-menu-item" data-ctx="paste">Paste</button>';
    h += '<div class="context-menu-divider"></div>';
    h += '<button class="context-menu-item" data-ctx="repeat">Repeat Selection / Bar</button>';
    h += '<button class="context-menu-item" data-ctx="select-bar">Select Bar</button>';
    h += '<button class="context-menu-item" data-ctx="select-row">Select Row</button>';
    h += '<button class="context-menu-item" data-ctx="select-all">Select Section</button>';

    this._contextEl.innerHTML = h;
    this._contextEl.classList.remove("is-hidden");
    this._contextEl.style.left = x + "px";
    this._contextEl.style.top = y + "px";

    this._contextEl.onclick = function (e) {
      var btn = e.target.closest("[data-ctx]");
      if (!btn) return;
      switch (btn.dataset.ctx) {
        case "copy": self._copy(); break;
        case "paste": self._paste(); break;
        case "repeat":
          if (self.selection) self._repeatSelection();
          else self._repeatMeasure();
          break;
        case "select-bar": self._selectMeasure(); break;
        case "select-row": self._selectRow(); break;
        case "select-all": self._selectAll(); break;
      }
      self._hideContextMenu();
    };
  };

  P._hideContextMenu = function () {
    if (this._contextEl) this._contextEl.classList.add("is-hidden");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  UNDO / REDO
   * ════════════════════════════════════════════════════════════ */
  P._saveSnapshot = function () {
    var snap = {
      song: S.cloneSong(this.song),
      cursor: { posIndex: this.cursor.posIndex, charOffset: this.cursor.charOffset },
      activeSectionIdx: this.activeSectionIdx
    };
    this.undoMgr.push(snap);
  };

  P._saveSnapshotDebounced = function () {
    var self = this;
    clearTimeout(this._typingTimer);
    this._typingTimer = setTimeout(function () {
      self._saveSnapshot();
    }, 450);
  };

  P._restoreSnapshot = function (snap) {
    this.song = S.cloneSong(snap.song);
    this.cursor = { posIndex: snap.cursor.posIndex, charOffset: snap.cursor.charOffset };
    this.activeSectionIdx = Math.min(snap.activeSectionIdx, this.song.sections.length - 1);
    this.selection = null;
    this.inputBuffer = "";
    this.render();
  };

  P._undo = function () {
    var snap = this.undoMgr.undo();
    if (snap) {
      this._restoreSnapshot(snap);
      this._toast("Undo");
    } else {
      this._toast("Nothing to undo.");
    }
  };

  P._redo = function () {
    var snap = this.undoMgr.redo();
    if (snap) {
      this._restoreSnapshot(snap);
      this._toast("Redo");
    } else {
      this._toast("Nothing to redo.");
    }
  };

  /* ════════════════════════════════════════════════════════════ *
   *  RESET COMPOSITION (Requirement 14)
   * ════════════════════════════════════════════════════════════ */
  P._confirmReset = function () {
    var self = this;
    this._showModal(
      "Reset Composition",
      "Are you sure you want to reset this composition? All current notation and section data will be cleared.",
      [
        { label: "Cancel", cls: "", action: function () { self._hideModal(); } },
        { label: "Confirm Reset", cls: "sw-btn--danger", action: function () { self._doReset(); self._hideModal(); } }
      ]
    );
  };

  P._doReset = function () {
    this.song = S.createSong();
    this.activeSectionIdx = 0;
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.groupMode = false;
    this.inputBuffer = "";
    this.selection = null;
    this.undoMgr.clear();
    this.savedSong = S.cloneSong(this.song);
    this._saveSnapshot();
    this.render();
    this._toast("Composition reset.");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  MODAL & TOAST
   * ════════════════════════════════════════════════════════════ */
  P._showModal = function (title, message, buttons) {
    var modal = this._modalEl.querySelector(".sw-modal");
    var h = '<h3>' + this._escHtml(title) + '</h3>';
    h += '<p>' + this._escHtml(message) + '</p>';
    h += '<div class="sw-modal-actions">';
    buttons.forEach(function (b, i) {
      h += '<button class="sw-btn ' + (b.cls || '') + '" data-modal-btn="' + i + '">' + b.label + '</button>';
    });
    h += '</div>';
    modal.innerHTML = h;

    var self = this;
    modal.onclick = function (e) {
      e.stopPropagation();
      var btn = e.target.closest("[data-modal-btn]");
      if (btn) {
        var idx = Number(btn.dataset.modalBtn);
        if (buttons[idx] && buttons[idx].action) buttons[idx].action();
      }
    };

    this._modalEl.classList.remove("is-hidden");
    this._modalEl.onclick = function () {
      self._hideModal();
    };
  };

  P._hideModal = function () {
    this._modalEl.classList.add("is-hidden");
  };

  P._toast = function (msg) {
    var el = this._toastEl;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2400);
  };

  /* ════════════════════════════════════════════════════════════ *
   *  IMPORT / EXPORT (.swar & TXT)
   * ════════════════════════════════════════════════════════════ */
  P._exportSwar = function () {
    this._commitBuffer();
    var data = S.serialize(this.song);
    var json = JSON.stringify(data, null, 2);
    var filename = (this.song.name || "MySong").replace(/[^a-zA-Z0-9_-]/g, "_") + ".swar";
    this._downloadFile(json, filename, "application/json");
    this.savedSong = S.cloneSong(this.song);
    this._toast("Project exported: " + filename);
  };

  P._importFile = function (file) {
    var self = this;
    if (!file.name.endsWith(".swar")) {
      this._toast("Invalid file: only .swar project files are supported.");
      return;
    }

    var isDirty = !S.songsEqual(this.song, this.savedSong);

    var doImport = function () {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          var result = S.deserialize(data);
          if (!result.valid) {
            self._toast("Import failed: " + result.error);
            return;
          }
          self.song = result.song;
          self.activeSectionIdx = 0;
          self.cursor = { posIndex: 0, charOffset: 0 };
          self.selection = null;
          self.inputBuffer = "";
          self.groupMode = false;
          self.undoMgr.clear();
          self.savedSong = S.cloneSong(self.song);
          self._saveSnapshot();
          self.render();
          self._toast("Project imported successfully.");
        } catch (err) {
          self._toast("Import failed: corrupted or invalid file.");
        }
      };
      reader.readAsText(file);
    };

    if (isDirty) {
      this._showModal(
        "Unsaved Changes",
        "You have unsaved changes in your current composition. Importing will replace your current work. Continue?",
        [
          { label: "Cancel", cls: "", action: function () { self._hideModal(); } },
          { label: "Import Anyway", cls: "sw-btn--accent", action: function () { self._hideModal(); doImport(); } }
        ]
      );
    } else {
      doImport();
    }
  };

  P._exportTxt = function () {
    this._commitBuffer();
    var text = S.toTxt(this.song, this.barsPerRow || 4);
    var filename = (this.song.name || "MySong").replace(/[^a-zA-Z0-9_-]/g, "_") + ".txt";
    this._downloadFile(text, filename, "text/plain;charset=utf-8");
    this._toast("TXT exported: " + filename);
  };

  P._downloadFile = function (content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ════════════════════════════════════════════════════════════ *
   *  PDF PREVIEW & PRINT (Part 15.3 & 16)
   * ════════════════════════════════════════════════════════════ */
  P._showPdfPreview = function () {
    this._commitBuffer();
    var song = this.song;
    var ppm = S.getPositionsPerMeasure(song.timeSignature);
    var self = this;
    var bpr = this._pdfBarsPerRow; // 4 or 2

    var h = '<button class="sw-print-close" id="swPrintClose" aria-label="Close preview">&times;</button>';
    h += '<div class="sw-print-sheet" id="swPrintSheet">';
    h += '<h2>' + this._escHtml(song.name || "Untitled Composition") + '</h2>';
    h += '<div class="print-meta">';
    h += '<span><strong>Scale:</strong> Sa = ' + song.scale + '</span>';
    h += '<span><strong>Music Bars:</strong> ' + song.timeSignature + '</span>';
    h += '<span><strong>Sections:</strong> ' + song.sections.length + '</span>';
    h += '</div>';

    for (var si = 0; si < song.sections.length; si++) {
      var sec = song.sections[si];
      h += '<div class="print-section-name">' + this._escHtml(sec.name) + '</div>';

      if (sec.positions.length === 0) {
        h += '<div style="color:#888; font-style:italic; margin:0.4rem 0;">(No notes entered)</div>';
        continue;
      }

      var measures = S.buildMeasures(sec.positions, song.timeSignature);

      // Group into rows of bpr measures
      for (var mi = 0; mi < measures.length; mi += bpr) {
        var rowMeasures = measures.slice(mi, mi + bpr);

        // Check if any measure in this row has unusually long groups
        var isCrowded = rowMeasures.some(function (m) {
          return m.positions.some(function (p) { return S.positionCharCount(p) > 6; });
        });

        // Adaptive split if 4-bar is crowded and bpr is 4
        var subRows = (bpr === 4 && isCrowded)
          ? [rowMeasures.slice(0, 2), rowMeasures.slice(2, 4)]
          : [rowMeasures];

        for (var sri = 0; sri < subRows.length; sri++) {
          var sub = subRows[sri];
          if (!sub.length) continue;
          h += '<div class="print-notation-row">';
          for (var smi = 0; smi < sub.length; smi++) {
            if (smi > 0) h += '<div class="print-barline"></div>';
            h += '<div class="print-measure">';
            var measure = sub[smi];
            for (var pi = 0; pi < measure.positions.length; pi++) {
              h += '<span class="print-position">' + this._escHtml(S.positionToText(measure.positions[pi])) + '</span>';
            }
            h += '</div>';
          }
          h += '</div>';
        }
      }
    }

    h += '</div>'; // end sheet

    // Preview action buttons
    h += '<div class="sw-print-actions">';
    h += '<button class="sw-btn" id="swPdfToggleBars">' + (bpr === 4 ? 'Switch to 2 Bars/Row' : 'Switch to 4 Bars/Row') + '</button>';
    h += '<button class="sw-btn sw-btn--accent" id="swPrintBtn">🖨 Print / Save as PDF</button>';
    h += '<button class="sw-btn" id="swPrintCloseBtn">Close Preview</button>';
    h += '</div>';

    this._printEl.innerHTML = h;
    this._printEl.classList.remove("is-hidden");

    document.getElementById("swPrintClose").onclick = function () { self._hidePdfPreview(); };
    document.getElementById("swPrintCloseBtn").onclick = function () { self._hidePdfPreview(); };
    document.getElementById("swPrintBtn").onclick = function () { window.print(); };
    document.getElementById("swPdfToggleBars").onclick = function () {
      self._pdfBarsPerRow = (self._pdfBarsPerRow === 4) ? 2 : 4;
      self._showPdfPreview();
    };
  };

  P._hidePdfPreview = function () {
    this._printEl.classList.add("is-hidden");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  HELPERS
   * ════════════════════════════════════════════════════════════ */
  P._escHtml = function (s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  };

  P._escAttr = function (s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* ════════════════════════════════════════════════════════════ *
   *  EXPOSE
   * ════════════════════════════════════════════════════════════ */
  S.Editor = SwaralipiEditor;

})(window.Swaralipi);
