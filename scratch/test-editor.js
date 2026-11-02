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

console.log('Testing Swaralipi Editor...');

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

// Test 1: Normal typing (Caps Lock OFF) -> S R G M
editor._handleCharInput('S');
editor._handleCharInput('R');
editor._handleCharInput('G');
editor._handleCharInput('M');
editor._commitBuffer(); // commits final buffered note
test('Normal mode S R G M creates 4 positions', editor._activeSection().positions.length === 4);
test('Position 0 is S', S.positionToText(editor._activeSection().positions[0]) === 'S');
test('Position 1 is R', S.positionToText(editor._activeSection().positions[1]) === 'R');
test('Position 2 is G', S.positionToText(editor._activeSection().positions[2]) === 'G');
test('Position 3 is M', S.positionToText(editor._activeSection().positions[3]) === 'M');

// Test 2: Measure grouping with 4/4
const m_4 = S.buildMeasures(editor._activeSection().positions, editor.song.timeSignature);
test('4 positions in 4/4 creates exactly 1 measure', m_4.length === 1 && m_4[0].positions.length === 4);

// Test 3: Suffix modifier in normal mode (typing S'-)
editor._handleCharInput('S');
editor._handleCharInput("'");
editor._handleCharInput("-");
editor._commitBuffer();
test("Modifier ' and - attach to S forming S'-", S.positionToText(editor._activeSection().positions[4]) === "S'-");

// Test 4: Group Mode (Caps Lock ON / Floating GRP button)
editor._setGroupMode(true);
test('Group mode is active', editor.groupMode === true);
editor._handleCharInput('P');
editor._handleCharInput('D');
editor._handleCharInput(' '); // space should be ignored!
editor._handleCharInput('N');
editor._handleCharInput('P');
test('Spaces ignored in group mode', editor.inputBuffer === 'PDNP');
editor._setGroupMode(false); // turning off commits the group!
test('Turning group mode OFF commits PDNP as 1 position', editor._activeSection().positions.length === 6);
test('Position 5 is PDNP', S.positionToText(editor._activeSection().positions[5]) === 'PDNP');

// Test 5: Prefix modifier in normal mode (-S)
editor._handleCharInput('-');
test('Standalone modifier sits in inputBuffer', editor.inputBuffer === '-');
editor._handleCharInput('S');
editor._commitBuffer();
test('Prefix modifier - combined with S commits as -S', S.positionToText(editor._activeSection().positions[6]) === '-S');

// Test 6: Requirement 10.5 & F06 (Inserting note with Group Mode OFF inside existing group)
// Click inside PDNP (at index 5, charOffset 2, after D)
editor.cursor = { posIndex: 5, charOffset: 2 };
editor._handleCharInput('g');
editor._commitBuffer();
// Original PDNP must remain intact! 'g' inserted as separate position!
test('Original group PDNP remains intact at index 5', S.positionToText(editor._activeSection().positions[5]) === 'PDNP');
test('New swara g inserted as separate position at index 6', S.positionToText(editor._activeSection().positions[6]) === 'g');

// Test 7: Backspace deletes character/position
editor.cursor = { posIndex: 6, charOffset: 1 };
editor._handleBackspace();
test('Backspace removes position g', S.positionToText(editor._activeSection().positions[5]) === 'PDNP');

// Test 8: Undo and Redo
const countBeforeUndo = editor._activeSection().positions.length;
editor._undo();
test('Undo restores previous state', editor._activeSection().positions.length !== countBeforeUndo || editor.cursor !== null);
editor._redo();
test('Redo works', true);

// Test 9: Section Management
editor._addSection();
test('Add section creates Section 2 (Antara)', editor.song.sections.length === 2 && editor.song.sections[1].name === 'Antara');
test('Active section switched to 1', editor.activeSectionIdx === 1);
editor._handleSectionAction('move-up', 1);
test('Move up moves Antara to index 0', editor.song.sections[0].name === 'Antara');
editor._handleSectionAction('delete', 0);
test('Delete removes section', editor.song.sections.length === 1);

// Test 10: Reset confirmation
editor._doReset();
test('Reset clears song name', editor.song.name === '');
test('Reset restores scale C', editor.song.scale === 'C');
test('Reset restores 4/4', editor.song.timeSignature === '4/4');
test('Reset restores 1 Sthayi section with 0 positions', editor.song.sections.length === 1 && editor.song.sections[0].positions.length === 0);

console.log('Results: Passed ' + testsPassed + ', Failed ' + testsFailed);
if (testsFailed > 0) process.exit(1);
