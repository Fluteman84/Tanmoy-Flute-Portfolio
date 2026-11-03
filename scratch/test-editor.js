const fs = require('fs');

// Create mock DOM for headless testing
function createMockElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) { this._classes.delete(c); return false; }
          else { this._classes.add(c); return true; }
        } else if (force) { this._classes.add(c); return true; }
        else { this._classes.delete(c); return false; }
      },
      contains: function(c) { return this._classes.has(c); }
    },
    dataset: {},
    children: [],
    innerHTML: '',
    value: '',
    _listeners: {},
    addEventListener: function(event, handler) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
    },
    dispatchEvent: function(event) {
      if (this._listeners[event.type]) {
        this._listeners[event.type].forEach(fn => fn(event));
      }
    },
    querySelector: function(sel) { return null; },
    querySelectorAll: function(sel) { return []; },
    closest: function() { return null; },
    getBoundingClientRect: function() { return { left: 50, top: 100, right: 80, bottom: 130, width: 30, height: 30 }; },
    focus: function() {},
    setAttribute: function() {},
    getAttribute: function() {}
  };
  return el;
}

const elementsById = {};
function getOrCreate(id, tag = 'div') {
  if (!elementsById[id]) {
    elementsById[id] = createMockElement(tag);
    elementsById[id].id = id;
  }
  return elementsById[id];
}

// Pre-create IDs expected by editor
['swSongName', 'swScale', 'swTime', 'swSections', 'swCursor', 'swBuffer', 'swPopup', 'swContext', 'swGroupToggle', 'swToast', 'swModal', 'swPrint', 'swFileInput', 'swProxyInput'].forEach(id => {
  getOrCreate(id);
});

global.window = {
  scrollX: 0,
  scrollY: 0,
  addEventListener: function() {},
  print: function() {}
};
global.document = {
  _docListeners: {},
  addEventListener: function(evt, fn) {
    if (!this._docListeners[evt]) this._docListeners[evt] = [];
    this._docListeners[evt].push(fn);
  },
  createElement: createMockElement,
  getElementById: function(id) {
    return getOrCreate(id);
  },
  querySelector: function() { return createMockElement('div'); },
  querySelectorAll: function() { return []; },
  activeElement: null
};

eval(fs.readFileSync('js/swaralipi-engine.js', 'utf8'));
eval(fs.readFileSync('js/swaralipi-editor.js', 'utf8'));
const S = global.window.Swaralipi;

const root = createMockElement('div');
const editor = new S.Editor(root);

console.log('Testing Swaralipi Editor (with new requirements)...');

let testsPassed = 0;
let testsFailed = 0;
function test(name, condition) {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    console.error('FAILED TEST:', name);
  }
}

// Test A — Normal Mode: s r G p -> S r G P (4 separate positions)
editor._setGroupMode(false);
editor._handleCharInput('s'); // lowercase s
editor._handleCharInput('r'); // lowercase r
editor._handleCharInput('G'); // uppercase G
editor._handleCharInput('p'); // lowercase p
editor._commitBuffer();

test('Test A: Normal mode s r G p creates 4 positions', editor._activeSection().positions.length === 4);
test('Test A: Position 0 is uppercase S', S.positionToText(editor._activeSection().positions[0]) === 'S');
test('Test A: Position 1 is lowercase r', S.positionToText(editor._activeSection().positions[1]) === 'r');
test('Test A: Position 2 is uppercase G', S.positionToText(editor._activeSection().positions[2]) === 'G');
test('Test A: Position 3 is uppercase P', S.positionToText(editor._activeSection().positions[3]) === 'P');

// Test B & C & D — Group Mode with S and P normalisation
editor._setGroupMode(true);
test('Test B: Group mode is active', editor.groupMode === true);
editor._handleCharInput('g'); // lowercase g
editor._handleCharInput('M'); // uppercase M
editor._handleCharInput('p'); // lowercase p -> normalizes to P
editor._handleCharInput('S'); // uppercase S
test('Test D: Buffer contains gMPS (only p normalized, g and M preserved)', editor.inputBuffer === 'gMPS');
editor._setGroupMode(false); // turning off commits the group as 1 position
test('Test D: Turning off commits as 1 single position', editor._activeSection().positions.length === 5);
test('Test D: Position 4 text is gMPS', S.positionToText(editor._activeSection().positions[4]) === 'gMPS');

// Test E — Shift key & Caps Lock independence
editor._setGroupMode(false);
// Simulate keydown with CapsLock physical state ON -> MUST NOT activate Group Mode!
editor._onKeyDown({
  key: 'M',
  length: 1,
  shiftKey: true,
  preventDefault: function() {},
  getModifierState: function(mod) { return mod === 'CapsLock'; }
});
test('Test E: CapsLock ON does not trigger Group Mode', editor.groupMode === false);
editor._commitBuffer();
test('Test E: Shift+M entered M normally', S.positionToText(editor._activeSection().positions[5]) === 'M');

// Test F — Group Button Toggle behavior
editor._setGroupMode(true);
editor._handleCharInput('G');
editor._handleCharInput('M');
editor._handleCharInput('P');
editor._handleCharInput('M');
test('Test F: Buffer accumulates GMPM', editor.inputBuffer === 'GMPM');
editor._setGroupMode(false);
test('Test F: Turning Group Mode off commits GMPM as 1 position', S.positionToText(editor._activeSection().positions[6]) === 'GMPM');

// Test G — Section Switching Isolation
editor._addSection(); // creates Section 2 (Antara)
test('Test G: 2 sections present', editor.song.sections.length === 2);
test('Test G: Active section is index 1', editor.activeSectionIdx === 1);
test('Test G: Section 1 groupMode starts as false', editor.groupMode === false);

// Turn Group Mode ON in Section 1
editor._setGroupMode(true);
test('Test G: Section 1 groupMode is now true', editor.groupMode === true);
editor._handleCharInput('S');
editor._handleCharInput('R');

// Switch back to Section 0
editor._switchActiveSection(0);
test('Test G: Switched to Section 0', editor.activeSectionIdx === 0);
test('Test G: Section 0 groupMode is false (uncontaminated)', editor.groupMode === false);

// Switch back to Section 1
editor._switchActiveSection(1);
test('Test G: Switched back to Section 1', editor.activeSectionIdx === 1);
test('Test G: Section 1 groupMode restored to true', editor.groupMode === true);
editor._setGroupMode(false); // commit SR
test('Test G: Section 1 has SR as 1 position', S.positionToText(editor._activeSection().positions[0]) === 'SR');

// Test H — Pasted notation normalization
editor._switchActiveSection(0);
const prePasteCount = editor._activeSection().positions.length;
editor._pasteText('s r g p');
test('Test H: Pasted 4 positions', editor._activeSection().positions.length === prePasteCount + 4);
test('Test H: Pasted s normalized to S', S.positionToText(editor._activeSection().positions[prePasteCount]) === 'S');
test('Test H: Pasted r preserved as r', S.positionToText(editor._activeSection().positions[prePasteCount + 1]) === 'r');
test('Test H: Pasted g preserved as g', S.positionToText(editor._activeSection().positions[prePasteCount + 2]) === 'g');
test('Test H: Pasted p normalized to P', S.positionToText(editor._activeSection().positions[prePasteCount + 3]) === 'P');

// Test I — Section Header Controls: Group button is beside move-up (▲)
const sec0Html = editor._renderSection(editor.song.sections[0], 0);
test('Test I: Active section contains swGroupToggle', sec0Html.indexOf('id="swGroupToggle"') !== -1);
test('Test I: swGroupToggle is placed before move-up ▲', sec0Html.indexOf('id="swGroupToggle"') < sec0Html.indexOf('data-section-action="move-up"'));
const sec1Html = editor._renderSection(editor.song.sections[1], 1);
test('Test I: Inactive section 1 does NOT contain swGroupToggle', sec1Html.indexOf('id="swGroupToggle"') === -1);

// Test J — 7/4 Time Signature in Editor
editor.song.timeSignature = '7/4';
editor._timeEl.value = '7/4';
editor.render();
test('Test J: 7/4 time signature set on song', editor.song.timeSignature === '7/4');
test('Test J: Status bar reflects 7 pos/bar', editor._sectionsEl.innerHTML.indexOf('7 pos/bar') !== -1);

// Test J2: Clear section and type 7 notes in 7/4
editor._activeSection().positions = [];
for (const sw of ['S', 'r', 'G', 'M', 'P', 'd', 'N']) {
  editor._handleCharInput(sw);
}
editor._commitBuffer();
test('Test J: 7 notes entered in active section', editor._activeSection().positions.length === 7);
const m7_sec = S.buildMeasures(editor._activeSection().positions, editor.song.timeSignature);
test('Test J: Exactly 1 measure of 7 notes in 7/4', m7_sec.length === 1 && m7_sec[0].positions.length === 7);

// Type 8th note -> automatically creates second measure
editor._handleCharInput('S');
editor._commitBuffer();
const m7_sec2 = S.buildMeasures(editor._activeSection().positions, editor.song.timeSignature);
test('Test J: 8th note causes automatic recalculation to 2 measures', m7_sec2.length === 2 && m7_sec2[0].positions.length === 7 && m7_sec2[1].positions.length === 1);

// Test J3: Repeat measure in 7/4
editor.cursor = { posIndex: 0, charOffset: 0 };
editor._repeatMeasure();
test('Test J: Repeating measure in 7/4 duplicates 7 positions', editor._activeSection().positions.length === 15);

// Test J4: PDF preview in 7/4
editor._showPdfPreview();
test('Test J: PDF preview contains Music Bars: 7/4', editor._printEl.innerHTML.indexOf('7/4') !== -1);

console.log('Results: Passed ' + testsPassed + ', Failed ' + testsFailed);
if (testsFailed > 0) process.exit(1);
