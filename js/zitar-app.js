/**
 * Zitar Tone Reference – UI Controller & Renderer
 * Multi-amplifier precision tone visualisation & preset browser.
 * Loads amplifier configurations and presets dynamically from external JSON.
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
  var activeSuggestionIndex = -1;
  var eventsInitialized = false;
  var dataUrlLoaded = "data/amplifier-presets.json";

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
   * Cache DOM Elements
   */
  function cacheElements() {
    elements.ampSelect = document.getElementById("ampSelect");
    elements.patchSearchInput = document.getElementById("patchSearchInput");
    elements.searchClearBtn = document.getElementById("searchClearBtn");
    elements.searchSuggestionsDropdown = document.getElementById("searchSuggestionsDropdown");
    elements.sidebarSearchWrapper = document.getElementById("sidebarSearchWrapper");
    elements.sidebarPatchListScroll = document.getElementById("sidebarPatchListScroll");
    elements.noPatchesNotice = document.getElementById("noPatchesNotice");
    elements.sidebarSearchFocusBtn = document.getElementById("sidebarSearchFocusBtn");
    elements.patchSelect = document.getElementById("patchSelect");
    elements.patchRibbon = document.getElementById("patchRibbon");

    // Patch header bar elements (main view)
    elements.infoPatchNumber = document.getElementById("infoPatchNumber");
    elements.infoPatchName = document.getElementById("infoPatchName");
    elements.infoCategory = document.getElementById("infoCategory");
    elements.infoCharacter = document.getElementById("infoCharacter");

    // About Button & Modal
    elements.aboutPatchBtn = document.getElementById("aboutPatchBtn");
    elements.aboutModal = document.getElementById("aboutModal");
    elements.closeAboutModalBtn = document.getElementById("closeAboutModalBtn");
    elements.closeModalBottomBtn = document.getElementById("closeModalBottomBtn");
    elements.modalPatchNumber = document.getElementById("modalPatchNumber");
    elements.modalPatchName = document.getElementById("modalPatchName");
    elements.modalCategory = document.getElementById("modalCategory");
    elements.modalCharacter = document.getElementById("modalCharacter");
    elements.infoDescription = document.getElementById("infoDescription");
    elements.infoApplicationsList = document.getElementById("infoApplicationsList");
    elements.infoTechniquesList = document.getElementById("infoTechniquesList");
    elements.infoNoteBox = document.getElementById("infoNoteBox");
    elements.infoNoteText = document.getElementById("infoNoteText");

    // Amp control panel elements
    elements.ampControlPanel = document.getElementById("ampControlPanel");
  }

  /**
   * Initialize Zitar Tone Reference Application.
   * Loads data asynchronously from external JSON database.
   *
   * @param {string} [dataUrl="data/amplifier-presets.json"]
   * @returns {Promise<{ success: boolean, errors?: Array<string> }>}
   */
  function init(dataUrl) {
    cacheElements();

    if (dataUrl) {
      dataUrlLoaded = dataUrl;
    }

    if (!elements.ampSelect || !elements.ampControlPanel) {
      console.warn("ZitarApp: Required DOM container elements not found.");
      return Promise.resolve({ success: false, errors: ["DOM elements missing"] });
    }

    // If a specific dataUrl is provided or data is not yet loaded, load from dataUrl
    var loadPromise;
    if (!dataUrl && ZitarData.isLoaded()) {
      loadPromise = Promise.resolve({ success: true, amplifiers: ZitarData.AMPLIFIERS });
    } else {
      loadPromise = ZitarData.load(dataUrlLoaded);
    }

    return loadPromise
      .then(function (result) {
        if (!result.success) {
          renderLoadError(result.errors || ["Unknown error loading preset database."]);
          return { success: false, errors: result.errors };
        }

        // Remove any existing error banner
        clearLoadError();

        // Determine current amplifier key
        var availableAmps = Object.keys(ZitarData.AMPLIFIERS);
        if (availableAmps.length === 0) {
          renderLoadError(["No amplifier models found in database."]);
          return { success: false, errors: ["No amplifiers found"] };
        }

        if (availableAmps.indexOf(currentAmpKey) === -1) {
          currentAmpKey = availableAmps[0];
        }

        populateAmpDropdown();
        setupControlsMarkup();
        populateSidebarPatchList();

        if (!eventsInitialized) {
          setupEventListeners();
          eventsInitialized = true;
        }

        // Select first preset of active amplifier
        var firstPreset = ZitarData.getFirstPreset(currentAmpKey);
        if (firstPreset) {
          selectPatch(firstPreset.id);
        }

        return { success: true };
      })
      .catch(function (fatalErr) {
        var msg = "Initialization failed: " + fatalErr.message;
        console.error("[ZitarApp]", fatalErr);
        renderLoadError([msg]);
        return { success: false, errors: [msg] };
      });
  }

  /**
   * Retry loading the preset database
   */
  function retryLoad() {
    clearLoadError();
    return init(dataUrlLoaded);
  }

  /**
   * Renders an accessible error banner if the JSON database fails to load
   */
  function renderLoadError(errors) {
    if (elements.ampControlPanel) {
      var errorList = errors && errors.length ? errors.join("<br>") : "Unable to load presets from database.";
      elements.ampControlPanel.innerHTML =
        '<div class="zitar-error-banner" role="alert" aria-live="assertive">' +
          '<div class="error-banner-icon">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="12" cy="12" r="10"></circle>' +
              '<line x1="12" y1="8" x2="12" y2="12"></line>' +
              '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
            '</svg>' +
          '</div>' +
          '<div class="error-banner-content">' +
            '<h3 class="error-banner-title">Unable to Load Preset Database</h3>' +
            '<p class="error-banner-msg">' + errorList + '</p>' +
            '<button type="button" class="error-retry-btn" id="zitarRetryBtn">Retry Loading</button>' +
          '</div>' +
        '</div>';

      var retryBtn = document.getElementById("zitarRetryBtn");
      if (retryBtn) {
        retryBtn.addEventListener("click", retryLoad);
      }
    }

    if (elements.sidebarPatchListScroll) {
      elements.sidebarPatchListScroll.innerHTML =
        '<div class="sidebar-load-error">Preset library currently unavailable.</div>';
    }
  }

  /**
   * Clears error banner
   */
  function clearLoadError() {
    // Handled dynamically when setupControlsMarkup runs
  }

  /**
   * Populate Amp Selection Dropdown dynamically from ZitarData.AMPLIFIERS
   */
  function populateAmpDropdown() {
    if (!elements.ampSelect) return;
    elements.ampSelect.innerHTML = "";
    var amps = ZitarData.AMPLIFIERS;
    for (var key in amps) {
      if (Object.prototype.hasOwnProperty.call(amps, key)) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = amps[key].displayName || amps[key].name;
        elements.ampSelect.appendChild(opt);
      }
    }
    elements.ampSelect.value = currentAmpKey;
  }

  /**
   * Builds the chassis header and control markup dynamically for current amplifier
   */
  function setupControlsMarkup() {
    var amp = ZitarData.getAmplifier(currentAmpKey);
    if (!amp || !amp.controls || !elements.ampControlPanel) return;

    var container = elements.ampControlPanel;
    container.innerHTML = "";

    // Build chassis indicators dynamically from amplifier switch controls
    var indicatorsHtml = '<div class="chassis-indicators">';
    amp.controls.forEach(function (ctrl) {
      if (ctrl.type === "switch") {
        var badgeId = ctrl.key === "overdrive" ? "ampChannelBadge" :
                      ctrl.key === "reverb" ? "ampReverbBadge" :
                      ("ampBadge_" + ctrl.key);
        var defaultClass = ctrl.key === "overdrive" ? "chassis-indicator-badge is-clean" :
                           ctrl.key === "reverb" ? "chassis-indicator-badge is-reverb" :
                           "chassis-indicator-badge";
        var defaultText = ctrl.key === "overdrive" ? "CLEAN CHANNEL" :
                          ctrl.key === "reverb" ? "REVERB: ON" :
                          (ctrl.label.toUpperCase() + ": OFF");
        indicatorsHtml += '<div id="' + badgeId + '" class="' + defaultClass + '">' + defaultText + '</div>';
      }
    });
    indicatorsHtml += '</div>';

    // Header strip for amp
    var headerStrip = document.createElement("div");
    headerStrip.className = "amp-chassis-header";
    headerStrip.innerHTML =
      '<div class="chassis-brand">' +
        '<span class="chassis-model-name">' + (amp.displayName || amp.name) + '</span>' +
        '<span class="chassis-tag">' + (amp.subtitle || "PRECISION TONE REFERENCE") + '</span>' +
      '</div>' +
      indicatorsHtml;
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
              '<circle cx="50" cy="31" r="31" class="dial-knob-inset" />' +
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
   * Populate Categorised Left Sidebar Patch List
   */
  function populateSidebarPatchList(filteredPresets) {
    var amp = ZitarData.getAmplifier(currentAmpKey);
    if (!amp || !amp.presets || !elements.sidebarPatchListScroll) return;

    var list = filteredPresets || amp.presets;
    elements.sidebarPatchListScroll.innerHTML = "";

    // Sync legacy/compat elements if present
    if (elements.patchSelect) {
      elements.patchSelect.innerHTML = "";
      list.forEach(function (preset) {
        var opt = document.createElement("option");
        opt.value = preset.id;
        opt.textContent = preset.patchNumber + " — " + preset.name;
        elements.patchSelect.appendChild(opt);
      });
      elements.patchSelect.value = currentPresetId;
    }

    if (elements.patchRibbon) {
      elements.patchRibbon.innerHTML = "";
      list.forEach(function (preset) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "patch-ribbon-item" + (preset.id === currentPresetId ? " is-active" : "");
        item.setAttribute("data-preset-id", preset.id);
        elements.patchRibbon.appendChild(item);
      });
    }

    if (list.length === 0) {
      if (elements.noPatchesNotice) elements.noPatchesNotice.style.display = "block";
      return;
    }
    if (elements.noPatchesNotice) elements.noPatchesNotice.style.display = "none";

    // Standard category sequence, augmented dynamically by any categories present in the data
    var definedOrder = [
      "Classical and Indian Music",
      "Cinematic and Atmospheric",
      "Rock and Fusion",
      "Experimental and Special-Purpose"
    ];

    var detectedCats = [];
    list.forEach(function (p) {
      if (p.category && detectedCats.indexOf(p.category) === -1) {
        detectedCats.push(p.category);
      }
    });

    var categoryOrder = [];
    definedOrder.forEach(function (cat) {
      if (detectedCats.indexOf(cat) !== -1) categoryOrder.push(cat);
    });
    detectedCats.forEach(function (cat) {
      if (categoryOrder.indexOf(cat) === -1) categoryOrder.push(cat);
    });

    // Group items by category
    var grouped = {};
    categoryOrder.forEach(function (cat) { grouped[cat] = []; });
    list.forEach(function (p) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    // Render grouped categories
    categoryOrder.forEach(function (cat) {
      var items = grouped[cat];
      if (!items || items.length === 0) return;

      var groupSection = document.createElement("div");
      groupSection.className = "sidebar-category-group";

      var header = document.createElement("div");
      header.className = "sidebar-category-header";
      header.innerHTML =
        '<span class="category-name">' + cat + '</span>' +
        '<span class="category-count">' + items.length + '</span>';
      groupSection.appendChild(header);

      var listContainer = document.createElement("div");
      listContainer.className = "sidebar-category-items";

      items.forEach(function (preset) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sidebar-patch-item" + (preset.id === currentPresetId ? " is-active" : "");
        btn.setAttribute("data-preset-id", preset.id);
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", preset.id === currentPresetId ? "true" : "false");
        btn.innerHTML =
          '<span class="patch-item-num">' + preset.patchNumber + '</span>' +
          '<span class="patch-item-name">' + preset.name + '</span>';

        btn.addEventListener("click", function () {
          selectPatch(preset.id);
          hideSuggestions();
        });

        listContainer.appendChild(btn);
      });

      groupSection.appendChild(listContainer);
      elements.sidebarPatchListScroll.appendChild(groupSection);
    });
  }

  /**
   * Search Suggestions: Displays dropdown beneath search input opening DOWNWARDS
   */
  function showSuggestions(query) {
    if (!elements.searchSuggestionsDropdown) return;

    var matches = ZitarData.searchPresets(query, currentAmpKey);
    elements.searchSuggestionsDropdown.innerHTML = "";
    activeSuggestionIndex = -1;

    if (matches.length === 0) {
      var emptyEl = document.createElement("div");
      emptyEl.className = "suggestion-empty";
      emptyEl.textContent = "No matching patches found.";
      elements.searchSuggestionsDropdown.appendChild(emptyEl);
      elements.searchSuggestionsDropdown.style.display = "block";
      return;
    }

    // Limit to top 8 suggestions for a clean dropdown
    var displayedMatches = matches.slice(0, 8);
    displayedMatches.forEach(function (preset, index) {
      var row = document.createElement("div");
      row.className = "suggestion-item";
      row.setAttribute("role", "option");
      row.setAttribute("data-preset-id", preset.id);
      row.setAttribute("data-index", index);
      row.innerHTML =
        '<span class="sugg-num">' + preset.patchNumber + '</span>' +
        '<div class="sugg-details">' +
          '<span class="sugg-name">' + preset.name + '</span>' +
          '<span class="sugg-cat">' + preset.category + '</span>' +
        '</div>';

      row.addEventListener("mousedown", function (e) {
        e.preventDefault(); // Prevent input blur before click registers
        selectPatch(preset.id);
        hideSuggestions();
      });

      elements.searchSuggestionsDropdown.appendChild(row);
    });

    elements.searchSuggestionsDropdown.style.display = "block";
  }

  /**
   * Hide Search Suggestions
   */
  function hideSuggestions() {
    if (elements.searchSuggestionsDropdown) {
      elements.searchSuggestionsDropdown.style.display = "none";
      activeSuggestionIndex = -1;
    }
  }

  /**
   * Modal Open/Close handlers
   */
  function openAboutModal() {
    if (!elements.aboutModal) return;
    var preset = ZitarData.getPresetById(currentPresetId, currentAmpKey);
    if (preset) {
      updateModalContent(preset);
    }
    elements.aboutModal.style.display = "flex";
    document.body.classList.add("modal-open");
    if (elements.aboutPatchBtn) {
      elements.aboutPatchBtn.setAttribute("aria-expanded", "true");
    }
    if (elements.closeAboutModalBtn && typeof elements.closeAboutModalBtn.focus === "function") {
      elements.closeAboutModalBtn.focus();
    }
  }

  function closeAboutModal() {
    if (!elements.aboutModal) return;
    elements.aboutModal.style.display = "none";
    document.body.classList.remove("modal-open");
    if (elements.aboutPatchBtn) {
      elements.aboutPatchBtn.setAttribute("aria-expanded", "false");
      if (typeof elements.aboutPatchBtn.focus === "function") {
        elements.aboutPatchBtn.focus();
      }
    }
  }

  /**
   * Updates About Modal content with preset details
   */
  function updateModalContent(preset) {
    if (elements.modalPatchNumber) elements.modalPatchNumber.textContent = "PATCH " + preset.patchNumber;
    if (elements.modalPatchName) elements.modalPatchName.textContent = preset.name;
    if (elements.modalCategory) elements.modalCategory.textContent = preset.category;
    if (elements.modalCharacter) elements.modalCharacter.textContent = preset.character;
    if (elements.infoDescription) elements.infoDescription.textContent = preset.description;

    // Applications List
    if (elements.infoApplicationsList) {
      elements.infoApplicationsList.innerHTML = "";
      if (preset.applications && preset.applications.length) {
        preset.applications.forEach(function (app) {
          var li = document.createElement("li");
          li.textContent = app;
          elements.infoApplicationsList.appendChild(li);
        });
      }
    }

    // Techniques List
    if (elements.infoTechniquesList) {
      elements.infoTechniquesList.innerHTML = "";
      if (preset.techniques && preset.techniques.length) {
        preset.techniques.forEach(function (tech) {
          var li = document.createElement("li");
          li.textContent = tech;
          elements.infoTechniquesList.appendChild(li);
        });
      }
    }

    // Technical Note
    if (elements.infoNoteBox && elements.infoNoteText) {
      if (preset.note) {
        elements.infoNoteText.textContent = preset.note;
        elements.infoNoteBox.style.display = "block";
      } else {
        elements.infoNoteBox.style.display = "none";
      }
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Amp change
    if (elements.ampSelect) {
      elements.ampSelect.addEventListener("change", function (e) {
        currentAmpKey = e.target.value;
        setupControlsMarkup();
        filterPatches(currentSearchQuery);
        var firstPreset = ZitarData.getFirstPreset(currentAmpKey);
        if (firstPreset) {
          selectPatch(firstPreset.id);
        }
      });
    }

    // Search input typing & focus
    if (elements.patchSearchInput) {
      elements.patchSearchInput.addEventListener("input", function (e) {
        var q = e.target.value;
        currentSearchQuery = q;
        if (elements.searchClearBtn) {
          elements.searchClearBtn.style.display = q ? "block" : "none";
        }
        filterPatches(q);
        showSuggestions(q);
      });

      elements.patchSearchInput.addEventListener("focus", function () {
        showSuggestions(elements.patchSearchInput.value);
      });

      // Keyboard navigation in search suggestions
      elements.patchSearchInput.addEventListener("keydown", function (e) {
        if (!elements.searchSuggestionsDropdown || elements.searchSuggestionsDropdown.style.display === "none") {
          if (e.key === "ArrowDown") {
            showSuggestions(elements.patchSearchInput.value);
            e.preventDefault();
          }
          return;
        }

        var items = elements.searchSuggestionsDropdown.querySelectorAll(".suggestion-item");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
          items.forEach(function (el, idx) {
            el.classList.toggle("is-focused", idx === activeSuggestionIndex);
          });
          if (items[activeSuggestionIndex].scrollIntoView) {
            items[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
          items.forEach(function (el, idx) {
            el.classList.toggle("is-focused", idx === activeSuggestionIndex);
          });
          if (items[activeSuggestionIndex].scrollIntoView) {
            items[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
            var id = parseInt(items[activeSuggestionIndex].getAttribute("data-preset-id"), 10);
            selectPatch(id);
            hideSuggestions();
          }
        } else if (e.key === "Escape") {
          hideSuggestions();
        }
      });
    }

    // Clear search button
    if (elements.searchClearBtn) {
      elements.searchClearBtn.addEventListener("click", function () {
        if (elements.patchSearchInput) {
          elements.patchSearchInput.value = "";
          elements.patchSearchInput.focus();
        }
        currentSearchQuery = "";
        elements.searchClearBtn.style.display = "none";
        filterPatches("");
        hideSuggestions();
      });
    }

    // Bottom "Search Presets" button
    if (elements.sidebarSearchFocusBtn) {
      elements.sidebarSearchFocusBtn.addEventListener("click", function () {
        if (elements.patchSearchInput) {
          elements.patchSearchInput.focus();
          if (elements.patchSearchInput.scrollIntoView) {
            elements.patchSearchInput.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          showSuggestions(elements.patchSearchInput.value);
        }
      });
    }

    // Dismiss suggestions on outside click
    document.addEventListener("click", function (e) {
      if (
        elements.sidebarSearchWrapper &&
        !elements.sidebarSearchWrapper.contains(e.target) &&
        elements.sidebarSearchFocusBtn &&
        !elements.sidebarSearchFocusBtn.contains(e.target)
      ) {
        hideSuggestions();
      }
    });

    // About Modal Triggers
    if (elements.aboutPatchBtn) {
      elements.aboutPatchBtn.addEventListener("click", openAboutModal);
    }
    if (elements.closeAboutModalBtn) {
      elements.closeAboutModalBtn.addEventListener("click", closeAboutModal);
    }
    if (elements.closeModalBottomBtn) {
      elements.closeModalBottomBtn.addEventListener("click", closeAboutModal);
    }

    // Close modal on backdrop click
    if (elements.aboutModal) {
      elements.aboutModal.addEventListener("click", function (e) {
        if (e.target === elements.aboutModal) {
          closeAboutModal();
        }
      });
    }

    // Close modal on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (elements.aboutModal && elements.aboutModal.style.display === "flex") {
          closeAboutModal();
        }
        hideSuggestions();
      }
    });
  }

  /**
   * Filters patches dynamically as user types
   */
  function filterPatches(query) {
    var matches = ZitarData.searchPresets(query, currentAmpKey);
    populateSidebarPatchList(matches);

    if (matches.length > 0) {
      var stillSelected = matches.some(function (p) {
        return p.id === currentPresetId;
      });

      if (stillSelected) {
        selectPatch(currentPresetId);
      } else {
        selectPatch(matches[0].id);
      }
    } else {
      if (elements.noPatchesNotice) {
        elements.noPatchesNotice.style.display = "block";
      }
    }
  }

  /**
   * Select a Patch and Update UI
   * @param {number|string} patchId
   */
  function selectPatch(patchId) {
    var preset = ZitarData.getPresetById(patchId, currentAmpKey);
    if (!preset) return;

    currentPresetId = preset.id;

    // Update legacy compatibility elements
    if (elements.patchSelect) elements.patchSelect.value = preset.id;

    // Update active highlight in sidebar list
    if (elements.sidebarPatchListScroll) {
      var items = elements.sidebarPatchListScroll.querySelectorAll(".sidebar-patch-item");
      items.forEach(function (btn) {
        var id = parseInt(btn.getAttribute("data-preset-id"), 10);
        var isSelected = id === preset.id;
        btn.classList.toggle("is-active", isSelected);
        btn.setAttribute("aria-selected", isSelected ? "true" : "false");
        if (isSelected && btn.scrollIntoView) {
          btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }

    // Update main view header
    renderPatchHeader(preset);

    // Update modal content if open or for next open
    updateModalContent(preset);

    // Update physical dials
    renderAmpControls(preset);
  }

  /**
   * Render Selected Patch Header on Main View
   */
  function renderPatchHeader(preset) {
    if (elements.infoPatchNumber) elements.infoPatchNumber.textContent = "PATCH " + preset.patchNumber;
    if (elements.infoPatchName) elements.infoPatchName.textContent = preset.name;
    if (elements.infoCategory) elements.infoCategory.textContent = preset.category;
    if (elements.infoCharacter) elements.infoCharacter.textContent = preset.character;
  }

  /**
   * Render Amplifier Controls based on Selected Preset Settings
   */
  function renderAmpControls(preset) {
    var amp = ZitarData.getAmplifier(currentAmpKey);
    if (!amp || !amp.controls || !elements.ampControlPanel) return;

    var s = preset.settings;

    // Update Chassis Indicators for any switch control in this amplifier
    amp.controls.forEach(function (ctrl) {
      if (ctrl.type === "switch") {
        var isOn = s[ctrl.key] === true;
        var badgeId = ctrl.key === "overdrive" ? "ampChannelBadge" :
                      ctrl.key === "reverb" ? "ampReverbBadge" :
                      ("ampBadge_" + ctrl.key);
        var badgeEl = document.getElementById(badgeId);
        if (badgeEl) {
          if (ctrl.key === "overdrive") {
            badgeEl.textContent = isOn ? "OVERDRIVE CHANNEL" : "CLEAN CHANNEL";
            badgeEl.className = "chassis-indicator-badge " + (isOn ? "is-drive" : "is-clean");
          } else if (ctrl.key === "reverb") {
            badgeEl.textContent = isOn ? "REVERB: ON" : "REVERB: OFF";
            badgeEl.className = "chassis-indicator-badge " + (isOn ? "is-reverb" : "is-reverb-off");
          } else {
            badgeEl.textContent = ctrl.label.toUpperCase() + ": " + (isOn ? "ON" : "OFF");
            badgeEl.className = "chassis-indicator-badge " + (isOn ? "is-on" : "is-off");
          }
        }
      }
    });

    // Update each control unit in the grid
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

        var isDisabled = false;
        if (ctrl.dependsOn && !s[ctrl.dependsOn]) {
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
            pointer.style.transform = "rotate(-150deg)";
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

          var deg = ZitarData.parseClockToDegrees(clockVal, preset, ctrl.key);
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

  function getCurrentAmpKey() {
    return currentAmpKey;
  }

  function getCurrentPresetId() {
    return currentPresetId;
  }

  return {
    init: init,
    retryLoad: retryLoad,
    selectPatch: selectPatch,
    filterPatches: filterPatches,
    showSuggestions: showSuggestions,
    hideSuggestions: hideSuggestions,
    openAboutModal: openAboutModal,
    closeAboutModal: closeAboutModal,
    describeArc: describeArc,
    getCurrentAmpKey: getCurrentAmpKey,
    getCurrentPresetId: getCurrentPresetId
  };
});
