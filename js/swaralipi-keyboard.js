/* ══════════════════════════════════════════════════════════════════════════ *
 *  SWARALIPI — CUSTOM MOBILE MUSICAL KEYBOARD
 *  Component: Swaralipi.MobileKeyboard
 *
 *  Provides a dedicated 5-row on-screen musical keyboard overlay exclusively
 *  for mobile devices (screen width <= 760px).
 *
 *  Row 1 (6 keys): S | r | R | g | G | M
 *  Row 2 (6 keys): m | P | d | D | n | N
 *  Row 3 (5 keys): - | : | ' | , | Backspace
 *  Row 4 (5 keys): Undo | Redo | ← | → | Delete
 *  Row 5 (2 keys): SPACE / NEXT POSITION | GROUP
 *
 *  Height: strictly 30–35% of visible screen height (target: ~33%).
 * ══════════════════════════════════════════════════════════════════════════ */

(function (window) {
  "use strict";

  if (!window.Swaralipi) {
    window.Swaralipi = {};
  }

  function MobileKeyboard(editor, options) {
    this.editor = editor;
    this.options = options || {};
    this.isExpanded = false;

    this.rootEl = null;
    this.toolbarEl = null;
    this.chevronEl = null;
    this.bodyEl = null;
    this.groupKeyEl = null;

    this._boundOnPointerDown = this._onPointerDown.bind(this);
    this._boundOnPointerUp = this._onPointerUp.bind(this);
    this._boundOnPointerCancel = this._onPointerCancel.bind(this);
    this._boundOnClick = this._onClick.bind(this);
    this._lastPointerTime = 0;

    this._init();
  }

  var K = MobileKeyboard.prototype;

  K._init = function () {
    this._build();
    this._bindEvents();
    if (this.editor) {
      this.editor._mobileKeyboard = this;
      this.updateGroupState(this.editor.groupMode);
    }
  };

  K._build = function () {
    var container = document.createElement("div");
    container.className = "sw-mobile-kbd";
    container.id = "swMobileKbd";

    // ── Compact Toolbar (Collapsed Header) ─────────────────────
    var toolbar = document.createElement("div");
    toolbar.className = "sw-mobile-kbd-toolbar";
    toolbar.setAttribute("role", "button");
    toolbar.setAttribute("aria-expanded", "false");
    toolbar.setAttribute("aria-label", "Toggle Musical Keyboard");
    toolbar.setAttribute("tabindex", "0");

    var iconSpan = document.createElement("span");
    iconSpan.className = "sw-mobile-kbd-icon";
    iconSpan.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>';

    var titleSpan = document.createElement("span");
    titleSpan.className = "sw-mobile-kbd-title";
    titleSpan.textContent = "Musical Keyboard";

    var chevronSpan = document.createElement("span");
    chevronSpan.className = "sw-mobile-kbd-chevron";
    chevronSpan.setAttribute("aria-hidden", "true");
    chevronSpan.textContent = "▲"; // Points up when collapsed

    toolbar.appendChild(iconSpan);
    toolbar.appendChild(titleSpan);
    toolbar.appendChild(chevronSpan);

    // ── Keyboard Body (5 Rows) ─────────────────────────────────
    var body = document.createElement("div");
    body.className = "sw-mobile-kbd-body";

    // Row 1: S | r | R | g | G | M (6 keys)
    var row1 = document.createElement("div");
    row1.className = "sw-kbd-row sw-kbd-row--6";
    var row1Keys = ["S", "r", "R", "g", "G", "M"];
    for (var i = 0; i < row1Keys.length; i++) {
      row1.appendChild(this._createKey(row1Keys[i], { swara: row1Keys[i] }));
    }

    // Row 2: m | P | d | D | n | N (6 keys)
    var row2 = document.createElement("div");
    row2.className = "sw-kbd-row sw-kbd-row--6";
    var row2Keys = ["m", "P", "d", "D", "n", "N"];
    for (var j = 0; j < row2Keys.length; j++) {
      row2.appendChild(this._createKey(row2Keys[j], { swara: row2Keys[j] }));
    }

    // Row 3: - | : | ' | , | Backspace (5 keys)
    var row3 = document.createElement("div");
    row3.className = "sw-kbd-row sw-kbd-row--5";
    row3.appendChild(this._createKey("-", { char: "-" }));
    row3.appendChild(this._createKey(":", { char: ":" }));
    row3.appendChild(this._createKey("'", { char: "'" }));
    row3.appendChild(this._createKey(",", { char: "," }));
    var bkspKey = this._createKey("⌫ Backspace", { action: "backspace", extraClass: "sw-kbd-key--action" });
    row3.appendChild(bkspKey);

    // Row 4: Undo | Redo | ← | → | Delete (5 keys)
    var row4 = document.createElement("div");
    row4.className = "sw-kbd-row sw-kbd-row--5";
    row4.appendChild(this._createKey("Undo", { action: "undo", extraClass: "sw-kbd-key--action" }));
    row4.appendChild(this._createKey("Redo", { action: "redo", extraClass: "sw-kbd-key--action" }));
    row4.appendChild(this._createKey("←", { action: "left", extraClass: "sw-kbd-key--nav" }));
    row4.appendChild(this._createKey("→", { action: "right", extraClass: "sw-kbd-key--nav" }));
    row4.appendChild(this._createKey("Delete", { action: "delete", extraClass: "sw-kbd-key--action" }));

    // Row 5: SPACE / NEXT POSITION | GROUP (2 keys)
    var row5 = document.createElement("div");
    row5.className = "sw-kbd-row sw-kbd-row--2";
    var spaceKey = this._createKey("SPACE", { action: "space", extraClass: "sw-kbd-key--space" });
    var groupKey = this._createKey("GROUP", { action: "group", extraClass: "sw-kbd-key--group" });
    row5.appendChild(spaceKey);
    row5.appendChild(groupKey);

    this.groupKeyEl = groupKey;

    body.appendChild(row1);
    body.appendChild(row2);
    body.appendChild(row3);
    body.appendChild(row4);
    body.appendChild(row5);

    container.appendChild(toolbar);
    container.appendChild(body);

    // Attach to DOM
    var mountTarget = (this.editor && this.editor.root) ? this.editor.root : document.body;
    mountTarget.appendChild(container);

    this.rootEl = container;
    this.toolbarEl = toolbar;
    this.chevronEl = chevronSpan;
    this.bodyEl = body;
  };

  K._createKey = function (label, meta) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sw-kbd-key" + (meta.extraClass ? " " + meta.extraClass : "");
    btn.textContent = label;

    if (meta.swara) {
      btn.dataset.swara = meta.swara;
      btn.classList.add("sw-kbd-key--swara");
    } else if (meta.char) {
      btn.dataset.char = meta.char;
      btn.classList.add("sw-kbd-key--mod");
    } else if (meta.action) {
      btn.dataset.kbdAction = meta.action;
      btn.dataset.action = meta.action;
    }

    return btn;
  };

  K._bindEvents = function () {
    var self = this;

    // Toolbar toggle event (expand / collapse)
    function toggleHandler(e) {
      if (e.cancelable) e.preventDefault();
      self.toggle();
    }
    this.toolbarEl.addEventListener("click", toggleHandler);
    this.toolbarEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        self.toggle();
      }
    });

    // Keyboard body event delegation for keys
    this.bodyEl.addEventListener("pointerdown", this._boundOnPointerDown);
    this.bodyEl.addEventListener("pointerup", this._boundOnPointerUp);
    this.bodyEl.addEventListener("pointercancel", this._boundOnPointerCancel);
    this.bodyEl.addEventListener("pointerleave", this._boundOnPointerCancel);
    this.bodyEl.addEventListener("click", this._boundOnClick);
  };

  K._onPointerDown = function (e) {
    var key = e.target.closest(".sw-kbd-key");
    if (!key) return;

    // Prevent default and stop bubbling to avoid stealing focus or triggering root button handlers
    if (e.cancelable) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    this._lastPointerTime = Date.now();
    key.classList.add("is-pressed");
    this._executeKey(key);
  };

  K._onPointerUp = function (e) {
    var key = e.target.closest(".sw-kbd-key");
    if (key) {
      key.classList.remove("is-pressed");
    }
  };

  K._onPointerCancel = function (e) {
    var pressed = this.bodyEl.querySelectorAll(".sw-kbd-key.is-pressed");
    for (var i = 0; i < pressed.length; i++) {
      pressed[i].classList.remove("is-pressed");
    }
  };

  K._onClick = function (e) {
    var key = e.target.closest(".sw-kbd-key");
    if (!key) return;

    if (e.cancelable) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    // If pointerdown recently fired, ignore synthetic click to avoid duplicate entry
    if (Date.now() - this._lastPointerTime < 400) {
      return;
    }

    key.classList.add("is-pressed");
    setTimeout(function () {
      key.classList.remove("is-pressed");
    }, 120);

    this._executeKey(key);
  };

  K._executeKey = function (key) {
    if (!this.editor) return;

    // 1. Swara input
    if (key.dataset.swara) {
      this.editor._handleCharInput(key.dataset.swara);
      this._ensureCursorVisible();
      return;
    }

    // 2. Modifier input (-, :, ', ,)
    if (key.dataset.char) {
      this.editor._handleCharInput(key.dataset.char);
      this._ensureCursorVisible();
      return;
    }

    // 3. Actions
    var action = key.dataset.action;
    switch (action) {
      case "backspace":
        if (typeof this.editor._safeDelete === "function") {
          this.editor._safeDelete("mobile-kbd");
        } else {
          this.editor._handleBackspace();
        }
        break;

      case "delete":
        this.editor._handleDelete();
        break;

      case "undo":
        this.editor._undo();
        break;

      case "redo":
        this.editor._redo();
        break;

      case "left":
        this.editor._moveCursorLeft();
        break;

      case "right":
        this.editor._moveCursorRight();
        break;

      case "space":
        // SPACE / NEXT POSITION invokes standard space behavior
        this.editor._handleCharInput(" ");
        break;

      case "group":
        // Toggle Group Mode ON / OFF
        this.editor._setGroupMode(!this.editor.groupMode);
        this.updateGroupState(this.editor.groupMode);
        break;
    }

    this._ensureCursorVisible();
  };

  K._ensureCursorVisible = function () {
    if (!this.editor || !this.isExpanded) return;
    if (typeof this.editor._scrollCursorIntoView === "function") {
      this.editor._scrollCursorIntoView();
    }
  };

  K.toggle = function () {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  };

  K.expand = function () {
    this.isExpanded = true;
    if (this.rootEl) {
      this.rootEl.classList.add("is-expanded");
    }
    if (this.toolbarEl) {
      this.toolbarEl.setAttribute("aria-expanded", "true");
    }
    if (this.chevronEl) {
      this.chevronEl.textContent = "▼";
    }
    this._ensureCursorVisible();
  };

  K.collapse = function () {
    this.isExpanded = false;
    if (this.rootEl) {
      this.rootEl.classList.remove("is-expanded");
    }
    if (this.toolbarEl) {
      this.toolbarEl.setAttribute("aria-expanded", "false");
    }
    if (this.chevronEl) {
      this.chevronEl.textContent = "▲";
    }
  };

  K.updateGroupState = function (isOn) {
    if (!this.groupKeyEl) return;
    this.groupKeyEl.classList.toggle("sw-kbd-group-active", !!isOn);
    this.groupKeyEl.setAttribute("aria-pressed", String(!!isOn));
    this.groupKeyEl.textContent = isOn ? "GROUP ●" : "GROUP";
  };

  K.getHeight = function () {
    if (!this.rootEl) return 0;
    return this.rootEl.offsetHeight || 0;
  };

  K.destroy = function () {
    if (this.bodyEl) {
      this.bodyEl.removeEventListener("pointerdown", this._boundOnPointerDown);
      this.bodyEl.removeEventListener("pointerup", this._boundOnPointerUp);
      this.bodyEl.removeEventListener("pointercancel", this._boundOnPointerCancel);
      this.bodyEl.removeEventListener("pointerleave", this._boundOnPointerCancel);
      this.bodyEl.removeEventListener("click", this._boundOnClick);
    }
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    if (this.editor && this.editor._mobileKeyboard === this) {
      this.editor._mobileKeyboard = null;
    }
  };

  window.Swaralipi.MobileKeyboard = MobileKeyboard;

})(typeof window !== "undefined" ? window : global);
