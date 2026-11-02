/* ================================================================
   Swaralipi — Editor Controller
   Cursor, input handling, rendering, selection, undo / redo,
   section management, copy / paste, and the main app bootstrap.
   ================================================================ */
(function (S) {
  "use strict";
  if (!S) throw new Error("Swaralipi engine must be loaded first.");

  /* ──────────────────────────────────────────────── *
   *  UNDO MANAGER
   * ──────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────── *
   *  MAIN EDITOR CLASS
   * ──────────────────────────────────────────────── */
  function SwaralipiEditor(rootEl) {
    this.root = rootEl;
    this.song = S.createSong();
    this.activeSectionIdx = 0;
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.groupMode = false;
    this.inputBuffer = "";
    this.undoMgr = new UndoManager();
    this.selection = null;         // {startPos, startOff, endPos, endOff}
    this.clipboard = null;         // {positions: [...]}
    this.savedSong = null;         // for dirty check
    this._cursorEl = null;
    this._bufferEl = null;
    this._popupEl = null;
    this._contextEl = null;
    this._toastEl = null;
    this._modalEl = null;
    this._printEl = null;
    this._groupToggle = null;
    this._sectionEls = [];
    this._typingTimer = null;

    this._build();
    this._bindGlobal();
    this.savedSong = S.cloneSong(this.song);
    this._saveSnapshot();
    this.render();
  }

  var P = SwaralipiEditor.prototype;

  /* ═══════════════ UI BUILD ═══════════════ */
  P._build = function () {
    var self = this;
    var h = "";
    // Hero
    h += '<section class="swaralipi-hero"><div class="container">';
    h += '<p class="eyebrow">Tools / Notation</p>';
    h += '<h1>Swar<span>alipi</span></h1>';
    h += '<p class="notes-subtitle">Compose · Edit · Export — Hindustani Classical Notation</p>';
    h += '</div></section>';

    // Song info
    h += '<div class="container"><div class="song-info-bar">';
    h += '<div class="song-info-field"><label for="swSongName">Song Name</label>';
    h += '<input id="swSongName" type="text" placeholder="Untitled Composition" autocomplete="off" spellcheck="false" /></div>';
    h += '<div class="song-info-field"><label for="swScale">Scale (Sa)</label>';
    h += '<select id="swScale">';
    S.SCALES.forEach(function (s) { h += '<option value="' + s + '">' + s + '</option>'; });
    h += '</select></div>';
    h += '<div class="song-info-field"><label for="swTime">Music Bars</label>';
    h += '<select id="swTime">';
    S.TIME_SIGNATURES.forEach(function (t) { h += '<option value="' + t + '"' + (t === "4/4" ? ' selected' : '') + '>' + t + '</option>'; });
    h += '</select></div>';
    h += '</div>';

    // Controls
    h += '<div class="project-controls-bar">';
    h += '<button class="sw-btn" data-action="undo" title="Undo (Ctrl+Z)">↶ Undo</button>';
    h += '<button class="sw-btn" data-action="redo" title="Redo (Ctrl+Y)">↷ Redo</button>';
    h += '<button class="sw-btn sw-btn--accent" data-action="export-swar" title="Export .swar project file">⬇ Export Project</button>';
    h += '<button class="sw-btn" data-action="import-swar" title="Import .swar project file">⬆ Import Project</button>';
    h += '<button class="sw-btn" data-action="export-txt" title="Export plain text">📄 Export TXT</button>';
    h += '<button class="sw-btn" data-action="export-pdf" title="Preview / print PDF">🖨 PDF Preview</button>';
    h += '<button class="sw-btn sw-btn--danger" data-action="reset" title="Reset composition">⟲ Reset</button>';
    h += '<input type="file" id="swFileInput" accept=".swar" style="display:none" />';
    h += '</div>';

    // Sections container
    h += '<div class="swaralipi-sections" id="swSections"></div>';

    // Add section button
    h += '<button class="add-section-btn" data-action="add-section">+ Add Section</button>';

    h += '</div>'; // end container

    // Floating elements
    h += '<div class="sw-cursor" id="swCursor"></div>';
    h += '<div class="input-buffer" id="swBuffer"></div>';
    h += '<div class="selection-popup is-hidden" id="swPopup"></div>';
    h += '<div class="sw-context-menu is-hidden" id="swContext"></div>';
    h += '<button class="group-mode-toggle" id="swGroupToggle" title="Group Mode (CapsLock)">GRP</button>';
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
    this._groupToggle = document.getElementById("swGroupToggle");
    this._toastEl = document.getElementById("swToast");
    this._modalEl = document.getElementById("swModal");
    this._printEl = document.getElementById("swPrint");
    this._fileInput = document.getElementById("swFileInput");
  };

  /* ═══════════════ EVENT BINDING ═══════════════ */
  P._bindGlobal = function () {
    var self = this;

    // Song info fields
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

    // Button actions
    this.root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (btn) {
        self._handleAction(btn.dataset.action, e);
        return;
      }
      // Section ctrl buttons
      var ctrl = e.target.closest("[data-section-action]");
      if (ctrl) {
        var idx = Number(ctrl.dataset.sectionIndex);
        self._handleSectionAction(ctrl.dataset.sectionAction, idx);
        return;
      }
    });

    // Keyboard events on document (capture notation input when a notation-area is focused)
    document.addEventListener("keydown", function (e) { self._onKeyDown(e); });
    document.addEventListener("keyup", function (e) { self._onKeyUp(e); });

    // CapsLock sync via keyup
    document.addEventListener("keyup", function (e) {
      if (e.key === "CapsLock") {
        self._setGroupMode(e.getModifierState("CapsLock"));
      }
    });

    // Group toggle button
    this._groupToggle.addEventListener("click", function () {
      self._setGroupMode(!self.groupMode);
    });

    // Click on notation area
    document.addEventListener("click", function (e) {
      self._hideContextMenu();
      var posEl = e.target.closest(".sw-position");
      if (posEl) {
        var area = posEl.closest(".notation-area");
        if (area) {
          self._setActiveSectionByArea(area);
          self._handlePositionClick(posEl, e);
          return;
        }
      }
      var area = e.target.closest(".notation-area");
      if (area) {
        self._setActiveSectionByArea(area);
        self._clickedEmptyArea(area, e);
        return;
      }
      // Click outside notation areas
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

    // File import
    this._fileInput.addEventListener("change", function () {
      if (this.files.length) self._importFile(this.files[0]);
      this.value = "";
    });

    // Hide context/popup on scroll
    window.addEventListener("scroll", function () {
      self._hidePopup();
      self._hideContextMenu();
      self._repositionCursor();
    }, { passive: true });

    window.addEventListener("resize", function () { self._repositionCursor(); });
  };

  /* ═══════════════ ACTIONS ═══════════════ */
  P._handleAction = function (action) {
    var self = this;
    switch (action) {
      case "undo": this._undo(); break;
      case "redo": this._redo(); break;
      case "reset": this._confirmReset(); break;
      case "export-swar": this._exportSwar(); break;
      case "import-swar": this._fileInput.click(); break;
      case "export-txt": this._exportTxt(); break;
      case "export-pdf": this._showPdfPreview(); break;
      case "add-section": this._addSection(); break;
    }
  };

  /* ═══════════════ SECTION MANAGEMENT ═══════════════ */
  P._addSection = function () {
    var names = S.DEFAULT_SECTIONS.filter(function (n) {
      return !this.song.sections.some(function (s) { return s.name === n; });
    }.bind(this));
    var name = names.length ? names[0] : "Section " + (this.song.sections.length + 1);
    this.song.sections.push(S.createSection(name));
    this.activeSectionIdx = this.song.sections.length - 1;
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  P._handleSectionAction = function (action, idx) {
    var secs = this.song.sections;
    if (idx < 0 || idx >= secs.length) return;

    switch (action) {
      case "delete":
        if (secs.length <= 1) { this._toast("Cannot delete the last section."); return; }
        secs.splice(idx, 1);
        if (this.activeSectionIdx >= secs.length) this.activeSectionIdx = secs.length - 1;
        break;
      case "move-up":
        if (idx === 0) return;
        var tmp = secs[idx]; secs[idx] = secs[idx - 1]; secs[idx - 1] = tmp;
        if (this.activeSectionIdx === idx) this.activeSectionIdx--;
        else if (this.activeSectionIdx === idx - 1) this.activeSectionIdx++;
        break;
      case "move-down":
        if (idx >= secs.length - 1) return;
        var tmp2 = secs[idx]; secs[idx] = secs[idx + 1]; secs[idx + 1] = tmp2;
        if (this.activeSectionIdx === idx) this.activeSectionIdx++;
        else if (this.activeSectionIdx === idx + 1) this.activeSectionIdx--;
        break;
    }
    this.cursor = { posIndex: 0, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  P._setActiveSectionByArea = function (areaEl) {
    var idx = Number(areaEl.dataset.sectionIndex);
    if (!isNaN(idx) && idx !== this.activeSectionIdx) {
      this._commitBuffer();
      this.activeSectionIdx = idx;
      this.cursor = { posIndex: 0, charOffset: 0 };
      this.selection = null;
    }
  };

  P._activeSection = function () {
    return this.song.sections[this.activeSectionIdx] || this.song.sections[0];
  };

  /* ═══════════════ RENDERING ═══════════════ */
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
    var h = '<div class="swaralipi-section' + (isActive ? ' is-active' : '') + '">';
    h += '<div class="section-header">';
    h += '<input class="section-name-input" value="' + this._escAttr(sec.name) + '" data-section-index="' + si + '" spellcheck="false" />';
    h += '<div class="section-controls">';
    h += '<button class="section-ctrl-btn" data-section-action="move-up" data-section-index="' + si + '" title="Move up">▲</button>';
    h += '<button class="section-ctrl-btn" data-section-action="move-down" data-section-index="' + si + '" title="Move down">▼</button>';
    h += '<button class="section-ctrl-btn" data-section-action="delete" data-section-index="' + si + '" title="Delete section">✕</button>';
    h += '</div></div>';

    h += '<div class="notation-area" tabindex="0" data-section-index="' + si + '">';
    h += this._renderNotation(sec);
    h += '</div>';

    // Status bar
    var ppm = S.getPositionsPerMeasure(this.song.timeSignature);
    var measures = S.buildMeasures(sec.positions, this.song.timeSignature);
    h += '<div class="swaralipi-status">';
    h += '<span class="status-item">Positions: ' + sec.positions.length + '</span>';
    h += '<span class="status-item">Measures: ' + measures.length + '</span>';
    h += '<span class="status-item">Time: ' + this.song.timeSignature + '</span>';
    h += '</div>';

    h += '</div>';
    return h;
  };

  P._renderNotation = function (sec) {
    if (sec.positions.length === 0) {
      return '<div class="notation-empty">Click here and start typing swaras…</div>';
    }

    var measures = S.buildMeasures(sec.positions, this.song.timeSignature);
    var blocks = S.buildBlocks(measures);
    var h = "";

    for (var bi = 0; bi < blocks.length; bi++) {
      h += '<div class="four-bar-block">';
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

  /* ═══════════════ CURSOR ═══════════════ */
  P._repositionCursor = function () {
    var sec = this._activeSection();
    var area = this._sectionsEl.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (!area) { this._cursorEl.style.display = "none"; return; }

    // If no positions, place cursor at beginning of area
    if (sec.positions.length === 0) {
      var areaRect = area.getBoundingClientRect();
      this._cursorEl.style.display = "block";
      this._cursorEl.style.left = (areaRect.left + 16 + window.scrollX) + "px";
      this._cursorEl.style.top = (areaRect.top + 12 + window.scrollY) + "px";
      this._cursorEl.style.height = "1.5em";
      this._bufferEl.style.display = this.inputBuffer ? "block" : "none";
      if (this.inputBuffer) {
        this._bufferEl.textContent = this.inputBuffer;
        this._bufferEl.style.left = (areaRect.left + 18 + window.scrollX) + "px";
        this._bufferEl.style.top = (areaRect.top + 12 + window.scrollY) + "px";
      }
      return;
    }

    // Find the position element
    var posIdx = Math.min(this.cursor.posIndex, sec.positions.length);
    var targetEl, cursorX;

    if (posIdx < sec.positions.length) {
      var posEl = area.querySelector('.sw-position[data-pos-index="' + posIdx + '"]');
      if (!posEl) { this._cursorEl.style.display = "none"; return; }

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
      this._cursorEl.style.left = cursorX + "px";
      this._cursorEl.style.top = (posRect.top + window.scrollY) + "px";
      this._cursorEl.style.height = posRect.height + "px";
    } else {
      // Cursor at end
      var lastPosEl = area.querySelector('.sw-position[data-pos-index="' + (sec.positions.length - 1) + '"]');
      if (lastPosEl) {
        var lr = lastPosEl.getBoundingClientRect();
        this._cursorEl.style.left = (lr.right + 2 + window.scrollX) + "px";
        this._cursorEl.style.top = (lr.top + window.scrollY) + "px";
        this._cursorEl.style.height = lr.height + "px";
      }
    }
    this._cursorEl.style.display = "block";

    // Buffer indicator
    if (this.inputBuffer) {
      this._bufferEl.textContent = this.inputBuffer;
      this._bufferEl.style.display = "block";
      var cx = parseFloat(this._cursorEl.style.left) + 3;
      this._bufferEl.style.left = cx + "px";
      this._bufferEl.style.top = this._cursorEl.style.top;
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
      // Determine if click is on left or right half of char
      var r = charEl.getBoundingClientRect();
      charOff = (e.clientX > r.left + r.width / 2) ? off + 1 : off;
    }

    this._commitBuffer();
    this.cursor = { posIndex: posIdx, charOffset: charOff };
    this.selection = null;
    this._hidePopup();
    this._repositionCursor();
    this._focusActiveArea();
  };

  P._clickedEmptyArea = function (areaEl, e) {
    var sec = this._activeSection();
    this._commitBuffer();
    this.cursor = { posIndex: sec.positions.length, charOffset: 0 };
    this.selection = null;
    this._repositionCursor();
    this._focusActiveArea();
  };

  P._focusActiveArea = function () {
    var area = this._sectionsEl.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (area) area.focus();
  };

  /* ═══════════════ KEYBOARD INPUT ═══════════════ */
  P._onKeyDown = function (e) {
    // Only process if a notation area is focused (or the document, not inputs)
    var activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
      if (!activeEl.classList.contains("section-name-input")) return;
      if (activeEl.classList.contains("section-name-input")) return; // let normal input work
    }

    var area = document.querySelector('.notation-area[data-section-index="' + this.activeSectionIdx + '"]');
    if (!area) return;

    // Sync CapsLock state on non-CapsLock keys
    if (e.key !== "CapsLock" && e.key.length === 1) {
      var caps = e.getModifierState && e.getModifierState("CapsLock");
      if (caps !== undefined && caps !== this.groupMode) {
        this._setGroupMode(caps);
      }
    }

    var ctrl = e.ctrlKey || e.metaKey;

    // Ctrl shortcuts
    if (ctrl) {
      switch (e.key.toLowerCase()) {
        case "z": e.preventDefault(); this._undo(); return;
        case "y": e.preventDefault(); this._redo(); return;
        case "c": e.preventDefault(); this._copy(); return;
        case "v": e.preventDefault(); this._paste(); return;
        case "a": e.preventDefault(); this._selectAll(); return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this._hidePopup();
      this._hideContextMenu();
      if (this.selection) { this.selection = null; this.render(); }
      return;
    }

    // Arrow keys
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

    // Character input
    if (e.key.length === 1 && !ctrl) {
      e.preventDefault();
      this._handleCharInput(e.key);
      return;
    }
  };

  P._onKeyUp = function (e) {
    if (e.key === "CapsLock") {
      var newState = e.getModifierState ? e.getModifierState("CapsLock") : this.groupMode;
      this._setGroupMode(newState);
    }
  };

  /* ═══════════════ GROUP MODE ═══════════════ */
  P._setGroupMode = function (on) {
    var wasOn = this.groupMode;
    this.groupMode = !!on;
    this._updateGroupToggleUI();

    // If turning OFF and buffer has content, commit the group
    if (wasOn && !this.groupMode && this.inputBuffer) {
      this._commitBuffer();
    }
  };

  P._updateGroupToggleUI = function () {
    if (this._groupToggle) {
      this._groupToggle.classList.toggle("is-active", this.groupMode);
      this._groupToggle.textContent = this.groupMode ? "GRP ●" : "GRP";
    }
  };

  /* ═══════════════ INPUT HANDLING ═══════════════ */
  P._handleCharInput = function (ch) {
    // Delete any selection first
    if (this.selection) {
      this._deleteSelection();
    }

    if (ch === " ") {
      if (this.groupMode) return; // spaces ignored in group mode
      this._commitBuffer();
      return;
    }

    if (S.isSwara(ch)) {
      if (this.groupMode) {
        // Group mode: accumulate
        this.inputBuffer += ch;
        this._repositionCursor();
      } else {
        // Normal mode: if buffer already has a swara, commit it first
        if (S.bufferHasSwara(this.inputBuffer)) {
          this._commitBuffer();
        }
        this.inputBuffer += ch;
        this._repositionCursor();
      }
      return;
    }

    if (S.isModifier(ch)) {
      this.inputBuffer += ch;
      this._repositionCursor();
      return;
    }

    // Invalid character
    this._toast("Invalid character: " + ch);
  };

  P._commitBuffer = function () {
    if (!this.inputBuffer) return;
    if (!S.bufferHasSwara(this.inputBuffer)) {
      // Buffer has only modifiers, cannot commit
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

    // If cursor is inside an existing position and group mode is OFF, insert after current position
    if (this.cursor.charOffset > 0 && insertIdx < sec.positions.length) {
      insertIdx++;
    }

    sec.positions.splice(insertIdx, 0, pos);
    this.cursor = { posIndex: insertIdx + 1, charOffset: 0 };
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  P._handleBackspace = function () {
    if (this.selection) {
      this._deleteSelection();
      return;
    }

    // If buffer has content, remove last char from buffer
    if (this.inputBuffer) {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this._repositionCursor();
      return;
    }

    var sec = this._activeSection();
    if (sec.positions.length === 0) return;

    if (this.cursor.posIndex === 0 && this.cursor.charOffset === 0) return;

    // Delete character before cursor
    var posIdx, charOff;
    if (this.cursor.charOffset > 0) {
      posIdx = this.cursor.posIndex;
      charOff = this.cursor.charOffset;
    } else {
      // Move to end of previous position
      posIdx = this.cursor.posIndex - 1;
      if (posIdx < 0) return;
      charOff = S.positionCharCount(sec.positions[posIdx]);
    }

    if (posIdx >= sec.positions.length) {
      // Delete last position entirely
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
      // Delete entire position
      sec.positions.splice(posIdx, 1);
      this.cursor = { posIndex: posIdx, charOffset: 0 };
      this._saveSnapshot();
      this.render();
      return;
    }

    // Remove the character at charOff - 1
    var newText = text.slice(0, charOff - 1) + text.slice(charOff);
    var reparsed = S.parsePositionText(newText);
    if (reparsed.valid) {
      pos.tokens = reparsed.tokens;
      this.cursor = { posIndex: posIdx, charOffset: charOff - 1 };
    } else {
      // The deletion made it invalid — remove the entire position
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

    if (charOff >= text.length) {
      // At end of position — nothing, or merge with next? For now, nothing.
      return;
    }

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

  /* ═══════════════ CURSOR MOVEMENT ═══════════════ */
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

  /* ═══════════════ SELECTION ═══════════════ */
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
    // Move focus left
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
  };

  P._getSelectionRange = function () {
    if (!this.selection) return null;
    var a = this.selection.anchorPos * 10000 + this.selection.anchorOff;
    var f = this.selection.focusPos * 10000 + this.selection.focusOff;
    if (a <= f) {
      return { startPos: this.selection.anchorPos, startOff: this.selection.anchorOff,
               endPos: this.selection.focusPos, endOff: this.selection.focusOff };
    } else {
      return { startPos: this.selection.focusPos, startOff: this.selection.focusOff,
               endPos: this.selection.anchorPos, endOff: this.selection.anchorOff };
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
    var posPerRow = ppm * S.BARS_PER_ROW;
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
    // Delete positions from startPos to endPos
    var delStart = range.startPos;
    var delEnd = range.endPos;
    sec.positions.splice(delStart, delEnd - delStart + 1);
    this.cursor = { posIndex: delStart, charOffset: 0 };
    this.selection = null;
    this.inputBuffer = "";
    this._saveSnapshot();
    this.render();
  };

  /* ═══════════════ COPY / PASTE ═══════════════ */
  P._copy = function () {
    var range = this._getSelectionRange();
    if (!range) { this._toast("Nothing selected."); return; }
    var sec = this._activeSection();
    var copied = [];
    for (var i = range.startPos; i <= range.endPos && i < sec.positions.length; i++) {
      copied.push(S.clonePosition(sec.positions[i]));
    }
    this.clipboard = { positions: copied };

    // Also copy text to system clipboard
    var text = copied.map(S.positionToText).join(" ");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    this._toast("Copied " + copied.length + " position(s).");
  };

  P._paste = function () {
    var self = this;
    if (this.selection) this._deleteSelection();

    // Try internal clipboard first
    if (this.clipboard && this.clipboard.positions.length) {
      this._pastePositions(this.clipboard.positions.map(S.clonePosition));
      return;
    }

    // Try system clipboard
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.readText().then(function (text) {
        if (text) self._pasteText(text);
      }).catch(function () {});
    }
  };

  P._pasteText = function (text) {
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

  /* ═══════════════ SELECTION POPUP ═══════════════ */
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
      '<button class="popup-btn" data-popup="select-bar">Select Bar</button>' +
      '<button class="popup-btn" data-popup="select-row">Select Row</button>' +
      '<button class="popup-btn" data-popup="select-section">Select Section</button>';

    this._popupEl.classList.remove("is-hidden");
    this._popupEl.style.left = rect.left + "px";
    this._popupEl.style.top = (rect.top - 44) + "px";

    this._popupEl.onclick = function (e) {
      var btn = e.target.closest("[data-popup]");
      if (!btn) return;
      switch (btn.dataset.popup) {
        case "copy": self._copy(); break;
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

  /* ═══════════════ CONTEXT MENU ═══════════════ */
  P._showContextMenu = function (x, y) {
    var self = this;
    var h = '';
    h += '<button class="context-menu-item" data-ctx="copy">Copy</button>';
    h += '<button class="context-menu-item" data-ctx="paste">Paste</button>';
    h += '<div class="context-menu-divider"></div>';
    h += '<button class="context-menu-item" data-ctx="select-bar">Select Bar</button>';
    h += '<button class="context-menu-item" data-ctx="select-row">Select Row</button>';
    h += '<button class="context-menu-item" data-ctx="select-all">Select All</button>';
    h += '<div class="context-menu-divider"></div>';
    h += '<button class="context-menu-item" data-ctx="repeat-bar">Repeat Bar</button>';

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
        case "select-bar": self._selectMeasure(); break;
        case "select-row": self._selectRow(); break;
        case "select-all": self._selectAll(); break;
        case "repeat-bar": self._repeatMeasure(); break;
      }
      self._hideContextMenu();
    };
  };

  P._hideContextMenu = function () {
    if (this._contextEl) this._contextEl.classList.add("is-hidden");
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
    // Insert after the current measure
    for (var j = 0; j < copied.length; j++) {
      sec.positions.splice(endPos + j, 0, copied[j]);
    }
    this.cursor = { posIndex: endPos + copied.length, charOffset: 0 };
    this._saveSnapshot();
    this.render();
    this._toast("Measure repeated.");
  };

  /* ═══════════════ UNDO / REDO ═══════════════ */
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
    }, 500);
  };

  P._restoreSnapshot = function (snap) {
    this.song = S.cloneSong(snap.song);
    this.cursor = { posIndex: snap.cursor.posIndex, charOffset: snap.cursor.charOffset };
    this.activeSectionIdx = snap.activeSectionIdx;
    this.selection = null;
    this.inputBuffer = "";
    this.render();
  };

  P._undo = function () {
    var snap = this.undoMgr.undo();
    if (snap) this._restoreSnapshot(snap);
    else this._toast("Nothing to undo.");
  };

  P._redo = function () {
    var snap = this.undoMgr.redo();
    if (snap) this._restoreSnapshot(snap);
    else this._toast("Nothing to redo.");
  };

  /* ═══════════════ RESET ═══════════════ */
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

  /* ═══════════════ MODAL ═══════════════ */
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
      var btn = e.target.closest("[data-modal-btn]");
      if (btn) {
        var idx = Number(btn.dataset.modalBtn);
        if (buttons[idx] && buttons[idx].action) buttons[idx].action();
      }
    };

    this._modalEl.classList.remove("is-hidden");
    this._modalEl.querySelector(".sw-modal").onclick = function (e) { e.stopPropagation(); };
    // Allow overlay click to cancel if first button is Cancel
    this._modalEl.onclick = function () {
      self._hideModal();
    };
    // Re-bind inner modal to stop propagation
    var innerModal = this._modalEl.querySelector(".sw-modal");
    innerModal.onclick = function (e) {
      e.stopPropagation();
      var btn = e.target.closest("[data-modal-btn]");
      if (btn) {
        var idx = Number(btn.dataset.modalBtn);
        if (buttons[idx] && buttons[idx].action) buttons[idx].action();
      }
    };
  };

  P._hideModal = function () {
    this._modalEl.classList.add("is-hidden");
  };

  /* ═══════════════ TOAST ═══════════════ */
  P._toast = function (msg) {
    var el = this._toastEl;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2200);
  };

  /* ═══════════════ IMPORT / EXPORT ═══════════════ */
  P._exportSwar = function () {
    var data = S.serialize(this.song);
    var json = JSON.stringify(data, null, 2);
    var filename = (this.song.name || "untitled").replace(/[^a-zA-Z0-9_-]/g, "_") + ".swar";
    this._downloadFile(json, filename, "application/json");
    this.savedSong = S.cloneSong(this.song);
    this._toast("Project exported: " + filename);
  };

  P._importFile = function (file) {
    var self = this;
    if (!file.name.endsWith(".swar")) {
      this._toast("Only .swar files are supported.");
      return;
    }

    // Warn if unsaved changes
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
          self._toast("Import failed: Invalid file format.");
        }
      };
      reader.readAsText(file);
    };

    if (isDirty) {
      this._showModal(
        "Unsaved Changes",
        "You have unsaved changes. Importing a project will replace your current work. Continue?",
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
    var text = S.toTxt(this.song);
    var filename = (this.song.name || "untitled").replace(/[^a-zA-Z0-9_-]/g, "_") + ".txt";
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

  /* ═══════════════ PDF PREVIEW ═══════════════ */
  P._showPdfPreview = function () {
    this._commitBuffer();
    var song = this.song;
    var ppm = S.getPositionsPerMeasure(song.timeSignature);
    var self = this;

    var h = '<button class="sw-print-close" id="swPrintClose">&times;</button>';
    h += '<div class="sw-print-sheet">';
    h += '<h2>' + this._escHtml(song.name || "Untitled Composition") + '</h2>';
    h += '<div class="print-meta">';
    h += '<span>Scale: ' + song.scale + '</span>';
    h += '<span>Music Bars: ' + song.timeSignature + '</span>';
    h += '</div>';

    for (var si = 0; si < song.sections.length; si++) {
      var sec = song.sections[si];
      h += '<div class="print-section-name">' + this._escHtml(sec.name) + '</div>';

      if (sec.positions.length === 0) {
        h += '<div style="color:#999; font-style:italic; margin:0.5rem 0;">(empty)</div>';
        continue;
      }

      var measures = S.buildMeasures(sec.positions, song.timeSignature);
      var blocks = S.buildBlocks(measures);

      for (var bi = 0; bi < blocks.length; bi++) {
        for (var ri = 0; ri < blocks[bi].rows.length; ri++) {
          h += '<div class="print-notation-row">';
          var rowMeasures = blocks[bi].rows[ri];
          for (var mi = 0; mi < rowMeasures.length; mi++) {
            if (mi > 0) h += '<div class="print-barline"></div>';
            h += '<div class="print-measure">';
            var measure = rowMeasures[mi];
            for (var pi = 0; pi < measure.positions.length; pi++) {
              h += '<span class="print-position">' + this._escHtml(S.positionToText(measure.positions[pi])) + '</span>';
            }
            // Fill remaining positions with sustain placeholders
            for (var fi = measure.positions.length; fi < ppm; fi++) {
              h += '<span class="print-position" style="color:#bbb">-</span>';
            }
            h += '</div>';
          }
          h += '</div>';
        }
      }
    }

    h += '</div>';
    h += '<div class="sw-print-actions">';
    h += '<button class="sw-btn sw-btn--accent" id="swPrintBtn">🖨 Print / Save PDF</button>';
    h += '<button class="sw-btn" id="swPrintCloseBtn">Close Preview</button>';
    h += '</div>';

    this._printEl.innerHTML = h;
    this._printEl.classList.remove("is-hidden");

    document.getElementById("swPrintClose").onclick = function () { self._hidePdfPreview(); };
    document.getElementById("swPrintCloseBtn").onclick = function () { self._hidePdfPreview(); };
    document.getElementById("swPrintBtn").onclick = function () { window.print(); };
  };

  P._hidePdfPreview = function () {
    this._printEl.classList.add("is-hidden");
  };

  /* ═══════════════ HELPERS ═══════════════ */
  P._escHtml = function (s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  };

  P._escAttr = function (s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* ═══════════════ EXPORT ═══════════════ */
  S.Editor = SwaralipiEditor;

})(window.Swaralipi);
