/**
 * Zitar Tone Reference – UI Controller & Renderer
 * Gretex GT-15FX Tone Visualisation & Preset Browser
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./zitar-data.js"));
  } else {
    root.ZitarApp = factory(root.ZitarData);
  }
})(typeof self !== "undefined" ? self : this, function (ZitarData) {
  "use strict";

  // App State
  var currentAmpKey = "gretexGT15FX";
  var currentPresetId = 1;
  var currentSearchQuery = "";

  // DOM Elements cache
  var elements = {};

  /**
   * Generates the SVG path for the active arc from -150 deg (7 o'clock) up to target angle
   * @param {number} angleDeg Target angle (-150 to +150 relative to 12:00)
   * @param {number} cx Center X
   * @param {number} cy Center Y
   * @param {number} r Radius
   * @returns {string} SVG Path d attribute
   */
  function describeArc(angleDeg, cx, cy, r) {
    var startAngle = -150; // 7 o'clock
    // Clamp target angle to min -150, max 150
    var target = Math.max(-150, Math.min(150, angleDeg));
    var sweepAngle = target - startAngle;

    if (sweepAngle <= 0.5) {
      return "";
    }

    var startRad = ((startAngle - 90) * Math.PI) / 180;
    var targetRad = ((target - 90) * Math.PI) / 180;

    var x1 = cx + r * Math.cos(startRad);
    var y1 = cy + r * Math.sin(startRad);
    var x2 = cx + r * Math.cos(targetRad);
    var y2 = cy + r * Math.sin(targetRad);

    var largeArcFlag = sweepAngle > 180 ? 1 : 0;
    return [
      "M", x1.toFixed(2), y1.toFixed(2),
      "A", r, r, 0, largeArcFlag, 1, x2.toFixed(2), y2.toFixed(2)
    ].join(" ");
  }

  /**
   * Generates static tick marks SVG strings at standard clock positions
   */
  function generateTicksSVG(cx, cy, rInner, rOuter) {
    var ticks = [-120, -90, -60, -30, 0, 30, 60, 90, 120]; // 8, 9, 10, 11, 12, 1, 2, 3, 4
    var s = "";
    for (var i = 0; i < ticks.length; i++) {
      var rad = ((ticks[i] - 90) * Math.PI) / 180;
      var x1 = (cx + rInner * Math.cos(rad)).toFixed(2);
      var y1 = (cy + rInner * Math.sin(rad)).toFixed(2);
      var x2 = (cx + rOuter * Math.cos(rad)).toFixed(2);
      var y2 = (cy + rOuter * Math.sin(rad)).toFixed(2);
      var isMajor = ticks[i] === 0 || ticks[i] === -90 || ticks[i] === 90;
      s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
           '" class="dial-tick' + (isMajor ? ' is-major' : '') + '" />';
    }
    return s;
  }

  /**
   * Initialize Zitar App
   */
  function init() {
    // Cache DOM Elements
    elements.ampSelect = document.getElementById("ampSelect");
    elements.patchSearchInput = document.getElementById("patchSearchInput");
    elements.searchClearBtn = document.getElementById("searchClearBtn");
    elements.patchSelect = document.getElementById("patchSelect");
    elements.patchRibbon = document.getElementById("patchRibbon");
    elements.noPatchesNotice = document.getElementById("noPatchesNotice");

    // Patch info panel elements
    elements.infoPatchNumber = document.getElementById("infoPatchNumber");
    elements.infoPatchName = document.getElementById("infoPatchName");
    elements.infoCategory = document.getElementById("infoCategory");
    elements.infoCharacter = document.getElementById("infoCharacter");
    elements.infoDescription = document.getElementById("infoDescription");
    elements.infoApplicationsList = document.getElementById("infoApplicationsList");
    elements.infoTechniquesList = document.getElementById("infoTechniquesList");
    elements.infoNoteBox = document.getElementById("infoNoteBox");
    elements.infoNoteText = document.getElementById("infoNoteText");

    // Amp control panel elements
    elements.ampControlPanel = document.getElementById("ampControlPanel");
    elements.ampChannelIndicator = document.getElementById("ampChannelIndicator");
    elements.ampReverbIndicator = document.getElementById("ampReverbIndicator");

    if (!elements.ampSelect || !elements.patchSelect) {
      console.warn("ZitarApp: Required DOM elements not found.");
      return;
    }

    populateAmpDropdown();
    setupControlsMarkup();
    populatePatchList();
    setupEventListeners();

    // Default selection: Preset 1
    selectPatch(1);
  }

  /**
   * Populate Amp Selection Dropdown
   */
  function populateAmpDropdown() {
    elements.ampSelect.innerHTML = "";
    var amps = ZitarData.AMPLIFIERS;
    for (var key in amps) {
      if (Object.prototype.hasOwnProperty.call(amps, key)) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = amps[key].name;
        elements.ampSelect.appendChild(opt);
      }
    }
    elements.ampSelect.value = currentAmpKey;
  }

  /**
   * Builds the static markup for the 9 amplifier controls
   */
  function setupControlsMarkup() {
    var amp = ZitarData.AMPLIFIERS[currentAmpKey];
    if (!amp || !amp.controls) return;

    var container = elements.ampControlPanel;
    container.innerHTML = "";

    // Header strip for amp
    var headerStrip = document.createElement("div");
    headerStrip.className = "amp-chassis-header";
    headerStrip.innerHTML =
      '<div class="chassis-brand">' +
        '<span class="chassis-model-name">' + amp.name + '</span>' +
        '<span class="chassis-tag">PRECISION TONE REFERENCE</span>' +
      '</div>' +
      '<div class="chassis-indicators">' +
        '<div id="ampChannelBadge" class="chassis-indicator-badge is-clean">CLEAN CHANNEL</div>' +
        '<div id="ampReverbBadge" class="chassis-indicator-badge is-reverb">REVERB: ON</div>' +
      '</div>';
    container.appendChild(headerStrip);

    // Controls Grid
    var grid = document.createElement("div");
    grid.className = "amp-controls-grid";

    // SVG Ticks template
    var ticksMarkup = generateTicksSVG(50, 50, 40, 44);

    amp.controls.forEach(function (ctrl) {
      var unit = document.createElement("div");
      unit.className = "control-unit " + (ctrl.type === "switch" ? "switch-unit" : "dial-unit");
      unit.setAttribute("data-control-key", ctrl.key);
      unit.setAttribute("data-group", ctrl.group || "");

      if (ctrl.type === "switch") {
        unit.innerHTML =
          '<div class="control-label">' + ctrl.label + '</div>' +
          '<div class="switch-housing">' +
            '<div class="digital-switch" id="switch_' + ctrl.key + '" aria-label="' + ctrl.label + ' switch">' +
              '<span class="switch-segment off-segment">OFF</span>' +
              '<span class="switch-segment on-segment">ON</span>' +
            '</div>' +
          '</div>' +
          '<div class="control-footer">' +
            '<span class="control-state-badge" id="state_' + ctrl.key + '">OFF</span>' +
          '</div>';
      } else {
        unit.innerHTML =
          '<div class="control-label">' + ctrl.label + '</div>' +
          '<div class="dial-housing">' +
            '<svg class="digital-dial" viewBox="0 0 100 100" width="88" height="88" aria-hidden="true">' +
              '<defs>' +
                '<radialGradient id="knobGrad_' + ctrl.key + '" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#2a3842" />' +
                  '<stop offset="70%" stop-color="#141d24" />' +
                  '<stop offset="100%" stop-color="#0a1015" />' +
                '</radialGradient>' +
              '</defs>' +
              '<circle cx="50" cy="50" r="44" class="dial-bezel" />' +
              '<path d="M 31 82.91 A 38 38 0 1 1 69 82.91" class="dial-scale-track" />' +
              '<g class="dial-ticks">' + ticksMarkup + '</g>' +
              '<path d="" class="dial-active-arc" id="arc_' + ctrl.key + '" />' +
              '<circle cx="50" cy="50" r="32" class="dial-knob-body" fill="url(#knobGrad_' + ctrl.key + ')" />' +
              '<circle cx="50" cy="50" r="31" class="dial-knob-inset" />' +
              '<g class="dial-pointer-group" id="pointer_' + ctrl.key + '" style="transform-origin: 50px 50px;">' +
                '<line x1="50" y1="30" x2="50" y2="13" class="dial-pointer-needle" />' +
                '<circle cx="50" cy="14" r="2.5" class="dial-pointer-dot" />' +
              '</g>' +
              '<circle cx="50" cy="50" r="7" class="dial-center-cap" />' +
            '</svg>' +
          '</div>' +
          '<div class="control-footer">' +
            '<span class="clock-badge" id="val_' + ctrl.key + '">12 o\'clock</span>' +
          '</div>';
      }

      grid.appendChild(unit);
    });

    container.appendChild(grid);
  }

  /**
   * Populate Patch Dropdown and Quick Select Ribbon
   */
  function populatePatchList(filteredPresets) {
    var amp = ZitarData.AMPLIFIERS[currentAmpKey];
    if (!amp || !amp.presets) return;

    var list = filteredPresets || amp.presets;

    // Dropdown
    elements.patchSelect.innerHTML = "";
    list.forEach(function (preset) {
      var opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.patchNumber + " — " + preset.name;
      elements.patchSelect.appendChild(opt);
    });

    // Ribbon
    elements.patchRibbon.innerHTML = "";
    list.forEach(function (preset) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "patch-ribbon-item" + (preset.id === currentPresetId ? " is-active" : "");
      item.setAttribute("data-preset-id", preset.id);
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", preset.id === currentPresetId ? "true" : "false");
      item.innerHTML =
        '<span class="ribbon-patch-num">' + preset.patchNumber + '</span>' +
        '<span class="ribbon-patch-name">' + preset.name + '</span>';

      item.addEventListener("click", function () {
        selectPatch(preset.id);
      });

      elements.patchRibbon.appendChild(item);
    });

    if (list.length === 0) {
      elements.noPatchesNotice.style.display = "block";
    } else {
      elements.noPatchesNotice.style.display = "none";
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Amp change
    elements.ampSelect.addEventListener("change", function (e) {
      currentAmpKey = e.target.value;
      setupControlsMarkup();
      filterPatches(currentSearchQuery);
      selectPatch(1);
    });

    // Patch dropdown change
    elements.patchSelect.addEventListener("change", function (e) {
      var id = parseInt(e.target.value, 10);
      if (!isNaN(id)) {
        selectPatch(id);
      }
    });

    // Search input
    elements.patchSearchInput.addEventListener("input", function (e) {
      var q = e.target.value;
      currentSearchQuery = q;
      elements.searchClearBtn.style.display = q ? "block" : "none";
      filterPatches(q);
    });

    // Clear search
    elements.searchClearBtn.addEventListener("click", function () {
      elements.patchSearchInput.value = "";
      currentSearchQuery = "";
      elements.searchClearBtn.style.display = "none";
      filterPatches("");
      elements.patchSearchInput.focus();
    });
  }

  /**
   * Filters patches dynamically as user types
   */
  function filterPatches(query) {
    var matches = ZitarData.searchPresets(query, currentAmpKey);
    populatePatchList(matches);

    if (matches.length > 0) {
      // Check if current selected preset is within matches
      var stillSelected = matches.some(function (p) {
        return p.id === currentPresetId;
      });

      if (stillSelected) {
        selectPatch(currentPresetId);
      } else {
        selectPatch(matches[0].id);
      }
    } else {
      // No matches found
      elements.patchSelect.innerHTML = '<option value="">No matching patches found.</option>';
      elements.noPatchesNotice.style.display = "block";
    }
  }

  /**
   * Select a Patch and Update UI
   * @param {number} patchId
   */
  function selectPatch(patchId) {
    var preset = ZitarData.getPresetById(patchId, currentAmpKey);
    if (!preset) return;

    currentPresetId = preset.id;

    // Update Dropdown selection
    elements.patchSelect.value = preset.id;

    // Update Ribbon active items
    var ribbonItems = elements.patchRibbon.querySelectorAll(".patch-ribbon-item");
    ribbonItems.forEach(function (btn) {
      var id = parseInt(btn.getAttribute("data-preset-id"), 10);
      var isSelected = id === preset.id;
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (isSelected) {
        // Scroll into view within horizontal ribbon container if needed
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    });

    renderPatchInfo(preset);
    renderAmpControls(preset);
  }

  /**
   * Render Selected Patch Information Panel
   */
  function renderPatchInfo(preset) {
    if (!elements.infoPatchNumber) return;

    elements.infoPatchNumber.textContent = "PATCH " + preset.patchNumber;
    elements.infoPatchName.textContent = preset.name;
    elements.infoCategory.textContent = preset.category;
    elements.infoCharacter.textContent = preset.character;
    elements.infoDescription.textContent = preset.description;

    // Applications List
    elements.infoApplicationsList.innerHTML = "";
    if (preset.applications && preset.applications.length) {
      preset.applications.forEach(function (app) {
        var li = document.createElement("li");
        li.textContent = app;
        elements.infoApplicationsList.appendChild(li);
      });
    }

    // Techniques List
    elements.infoTechniquesList.innerHTML = "";
    if (preset.techniques && preset.techniques.length) {
      preset.techniques.forEach(function (tech) {
        var li = document.createElement("li");
        li.textContent = tech;
        elements.infoTechniquesList.appendChild(li);
      });
    }

    // Special Note (Preset 10, etc.)
    if (preset.note) {
      elements.infoNoteText.textContent = preset.note;
      elements.infoNoteBox.style.display = "block";
    } else {
      elements.infoNoteBox.style.display = "none";
    }
  }

  /**
   * Render Amplifier Controls based on Selected Preset Settings
   */
  function renderAmpControls(preset) {
    var amp = ZitarData.AMPLIFIERS[currentAmpKey];
    if (!amp || !amp.controls) return;

    var s = preset.settings;

    // Update Chassis Indicators
    var channelBadge = document.getElementById("ampChannelBadge");
    var reverbBadge = document.getElementById("ampReverbBadge");

    if (channelBadge) {
      if (s.overdrive) {
        channelBadge.textContent = "OVERDRIVE CHANNEL";
        channelBadge.className = "chassis-indicator-badge is-drive";
      } else {
        channelBadge.textContent = "CLEAN CHANNEL";
        channelBadge.className = "chassis-indicator-badge is-clean";
      }
    }

    if (reverbBadge) {
      if (s.reverb) {
        reverbBadge.textContent = "REVERB: ON";
        reverbBadge.className = "chassis-indicator-badge is-reverb";
      } else {
        reverbBadge.textContent = "REVERB: OFF";
        reverbBadge.className = "chassis-indicator-badge is-reverb-off";
      }
    }

    // Update each of the 9 controls
    amp.controls.forEach(function (ctrl) {
      var unit = elements.ampControlPanel.querySelector('[data-control-key="' + ctrl.key + '"]');
      if (!unit) return;

      if (ctrl.type === "switch") {
        var isOn = s[ctrl.key] === true;
        var switchEl = unit.querySelector(".digital-switch");
        var stateBadge = unit.querySelector(".control-state-badge");

        if (switchEl) {
          switchEl.className = "digital-switch " + (isOn ? "is-on" : "is-off");
          var offSeg = switchEl.querySelector(".off-segment");
          var onSeg = switchEl.querySelector(".on-segment");
          if (offSeg) offSeg.classList.toggle("is-active", !isOn);
          if (onSeg) onSeg.classList.toggle("is-active", isOn);
        }

        if (stateBadge) {
          stateBadge.textContent = isOn ? "ON" : "OFF";
          stateBadge.className = "control-state-badge " + (isOn ? "is-on" : "is-off");
        }

        unit.classList.toggle("is-switch-on", isOn);
        unit.classList.toggle("is-switch-off", !isOn);
      } else {
        // Rotary Dial
        var pointer = unit.querySelector(".dial-pointer-group");
        var arc = unit.querySelector(".dial-active-arc");
        var valBadge = unit.querySelector(".clock-badge");

        // Check dependency:
        // Gain & Overdrive Volume depend on Overdrive
        // Reverb Amount depends on Reverb
        var isDisabled = false;
        if (ctrl.dependsOn === "overdrive" && !s.overdrive) {
          isDisabled = true;
        } else if (ctrl.dependsOn === "reverb" && !s.reverb) {
          isDisabled = true;
        }

        var clockVal = s[ctrl.key];

        if (isDisabled || clockVal === null || clockVal === undefined) {
          unit.classList.add("is-disabled");
          unit.classList.remove("is-active");

          if (valBadge) {
            valBadge.textContent = "N/A";
            valBadge.className = "clock-badge is-na";
          }

          if (pointer) {
            pointer.style.transform = "rotate(-150deg)"; // park at 7 o'clock
            pointer.classList.add("is-hidden");
          }

          if (arc) {
            arc.setAttribute("d", "");
          }
        } else {
          unit.classList.remove("is-disabled");
          unit.classList.add("is-active");

          if (valBadge) {
            valBadge.textContent = clockVal;
            valBadge.className = "clock-badge";
          }

          var deg = ZitarData.parseClockToDegrees(clockVal);
          if (deg === null) deg = 0;

          if (pointer) {
            pointer.classList.remove("is-hidden");
            pointer.style.transform = "rotate(" + deg + "deg)";
          }

          if (arc) {
            var arcPath = describeArc(deg, 50, 50, 38);
            arc.setAttribute("d", arcPath);
          }
        }
      }
    });
  }

  return {
    init: init,
    selectPatch: selectPatch,
    filterPatches: filterPatches,
    describeArc: describeArc
  };
});
