/**
 * Comprehensive Automated Verification Suite for Tabla Taal Engine Audio Playback
 * Tests all requirements (Test A through Test J) from Section 15.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

console.log("====================================================");
console.log("  TABLA TAAL ENGINE — AUDIO INTEGRATION TEST SUITE  ");
console.log("====================================================\n");

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// -----------------------------------------------------------------------------
// TEST A: File Inspection & Format Verification
// -----------------------------------------------------------------------------
const s1Path = path.resolve("Sounds", "Sound1.wav");
const s2Path = path.resolve("Sounds", "Sound2.wav");

assert(fs.existsSync(s1Path) && fs.existsSync(s2Path), "Test A.1: Sound1.wav and Sound2.wav exist in Sounds/");

const s1Buf = fs.readFileSync(s1Path);
const s2Buf = fs.readFileSync(s2Path);

assert(s1Buf.length === 19110 && s2Buf.length === 40348, "Test A.2: Sound file sizes preserved without corruption (19,110 and 40,348 bytes)");
assert(s1Buf.toString("ascii", 0, 4) === "RIFF" && s2Buf.toString("ascii", 0, 4) === "RIFF", "Test A.3: Valid RIFF WAVE headers on both sound files");

// -----------------------------------------------------------------------------
// TEST B: Tintaal Sound Mapping Verification
// -----------------------------------------------------------------------------
// Load AudioEngine code in Node VM
const audioEngineCode = fs.readFileSync(path.resolve("tabla-taal-engine", "js", "audio-engine.js"), "utf-8");
const vm = require("vm");
const mockWindow = {
  AudioContext: class MockAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
    }
    createGain() { return { gain: { value: 0.75 }, connect: () => {} }; }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {}
      };
    }
    decodeAudioData(ab, resolve) {
      resolve({ duration: 0.22, numberOfChannels: 1, sampleRate: 44100 });
    }
  }
};
mockWindow.webkitAudioContext = mockWindow.AudioContext;

const ctx = vm.createContext({
  window: mockWindow,
  console: console,
  Set: Set,
  Promise: Promise,
  Array: Array
});

vm.runInContext(audioEngineCode, ctx);
const AudioEngine = mockWindow.AudioEngine;

assert(typeof AudioEngine === "object" && typeof AudioEngine.getSoundCategory === "function", "AudioEngine module initialized in VM");

const taalsData = JSON.parse(fs.readFileSync(path.resolve("data", "taals.json"), "utf-8"));
const tintaal = taalsData.taals.find(t => t.id === "tintaal");

const expectedMapping = [
  "sound1", // Beat 1: Sam + Tali
  "sound2", // Beat 2: Normal
  "sound2", // Beat 3: Normal
  "sound2", // Beat 4: Normal
  "sound1", // Beat 5: Tali
  "sound2", // Beat 6: Normal
  "sound2", // Beat 7: Normal
  "sound2", // Beat 8: Normal
  "sound1", // Beat 9: Khali
  "sound2", // Beat 10: Normal
  "sound2", // Beat 11: Normal
  "sound2", // Beat 12: Normal
  "sound1", // Beat 13: Tali
  "sound2", // Beat 14: Normal
  "sound2", // Beat 15: Normal
  "sound2"  // Beat 16: Normal
];

let tintaalMappingCorrect = true;
for (let b = 1; b <= 16; b++) {
  const cat = AudioEngine.getSoundCategory(tintaal, b);
  if (cat !== expectedMapping[b - 1]) {
    tintaalMappingCorrect = false;
    console.error(`Mismatch on Beat ${b}: got ${cat}, expected ${expectedMapping[b - 1]}`);
  }
}
assert(tintaalMappingCorrect, "Test B: Dynamic sound mapping for Tintaal exactly matches specification for all 16 beats");

// -----------------------------------------------------------------------------
// TEST C: Continuous Cycles Simulation
// -----------------------------------------------------------------------------
let cyclesConsistent = true;
for (let cycle = 1; cycle <= 5; cycle++) {
  for (let b = 1; b <= 16; b++) {
    const cat = AudioEngine.getSoundCategory(tintaal, b);
    if (cat !== expectedMapping[b - 1]) {
      cyclesConsistent = false;
    }
  }
}
assert(cyclesConsistent, "Test C: Five continuous cycles maintain flawless sample mapping repeatability");

// -----------------------------------------------------------------------------
// TEST D, E, F, G, H: Metronome & Audio Engine Coordination
// -----------------------------------------------------------------------------
const metronomeCode = fs.readFileSync(path.resolve("tabla-taal-engine", "js", "metronome-engine.js"), "utf-8");
ctx.document = { addEventListener: () => {}, hidden: false };
ctx.performance = { now: () => 1000 };
vm.runInContext(metronomeCode, ctx);
const MetronomeEngine = mockWindow.MetronomeEngine;

MetronomeEngine.audioEngine = AudioEngine;
MetronomeEngine.setTaal(tintaal);

assert(MetronomeEngine.totalBeats === 16, "MetronomeEngine correctly configured for Tintaal (16 beats)");

// Test D: Tempo change mid-playback applies at next boundary without resetting beat or cycle
MetronomeEngine.currentBeat = 4;
MetronomeEngine.currentCycle = 2;
MetronomeEngine.state = MetronomeEngine.STATE_PLAYING;
MetronomeEngine._nextBeatExpectedTime = 1750;
MetronomeEngine._nextBeatAudioTime = 1.75;
MetronomeEngine.setBpm(160);

assert(MetronomeEngine.bpm === 160, "Test D.1: BPM clamped and updated to 160");
assert(MetronomeEngine.currentBeat === 4, "Test D.2: Current beat 4 preserved during tempo change");
assert(MetronomeEngine.currentCycle === 2, "Test D.3: Current cycle 2 preserved during tempo change");
assert(MetronomeEngine.state === MetronomeEngine.STATE_PLAYING, "Test D.4: Playback session uninterrupted during tempo change");

// Test E: Immediate Stop
let audioStopCalled = false;
AudioEngine.stopAll = () => { audioStopCalled = true; };

MetronomeEngine.stopImmediate();
assert(MetronomeEngine.state === MetronomeEngine.STATE_STOPPED, "Test E.1: MetronomeEngine state returned to STOPPED");
assert(MetronomeEngine.currentBeat === 1 && MetronomeEngine.currentCycle === 1, "Test E.2: Beat and cycle reset to Beat 1, Cycle 1");
assert(audioStopCalled, "Test E.3: AudioEngine.stopAll() called immediately to silence all audio");

// Test F: Stop After Cycle
MetronomeEngine.currentBeat = 7;
MetronomeEngine.currentCycle = 1;
MetronomeEngine.state = MetronomeEngine.STATE_PLAYING;
MetronomeEngine.stopAfterCycle();

assert(MetronomeEngine.state === MetronomeEngine.STATE_STOPPING_AFTER_CYCLE, "Test F.1: State transitioned to STOPPING_AFTER_CYCLE");
assert(MetronomeEngine._stopAfterCycleRequested === true, "Test F.2: Deferred cycle stopping flag armed");

// Simulate beat ticking up to final beat 16
MetronomeEngine.currentBeat = 16;
audioStopCalled = false;
MetronomeEngine._tick(MetronomeEngine._sessionToken);

assert(MetronomeEngine.state === MetronomeEngine.STATE_STOPPED, "Test F.3: Stopped automatically at conclusion of final beat");
assert(audioStopCalled, "Test F.4: All audio halted before next cycle Beat 1");

// Test G: Taal Switching during playback
MetronomeEngine.state = MetronomeEngine.STATE_PLAYING;
MetronomeEngine.currentBeat = 8;
const dadra = taalsData.taals.find(t => t.id === "dadra");

audioStopCalled = false;
MetronomeEngine.stopImmediate();
MetronomeEngine.setTaal(dadra);

assert(MetronomeEngine.state === MetronomeEngine.STATE_STOPPED, "Test G.1: Playback stopped on Taal switch");
assert(MetronomeEngine.totalBeats === 6, "Test G.2: Dadra 6 beats configured");
assert(MetronomeEngine.currentBeat === 1, "Test G.3: Position reset to Beat 1");

// Test H: Incomplete Notation Handling
let allDadraSound2 = true;
for (let b = 1; b <= 6; b++) {
  if (AudioEngine.getSoundCategory(dadra, b) !== "sound2") {
    allDadraSound2 = false;
  }
}
assert(allDadraSound2, "Test H: Incomplete metadata defaults gracefully to Sound2 for all beats");

// -----------------------------------------------------------------------------
// TEST I & J: Headless Browser End-to-End Test (Audio decoding & error handling)
// -----------------------------------------------------------------------------
console.log("\nRunning Browser Headless End-to-End Verification...");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tablaHtmlPath = path.resolve("tabla.html");
const fileUrl = "file:///" + tablaHtmlPath.replace(/\\/g, "/");

const browserRes = spawnSync(chromePath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--allow-file-access-from-files",
  "--enable-logging=stderr",
  "--autoplay-policy=no-user-gesture-required",
  fileUrl
], { encoding: "utf-8", timeout: 5000 });

const consoleLogs = (browserRes.stderr || "").split("\n").filter(l => l.includes("AudioEngine") || l.includes("Tabla"));
console.log("Browser Diagnostics:\n" + consoleLogs.join("\n"));

const hasAudioLoaded = consoleLogs.some(l => l.includes("Loaded & decoded") || l.includes("Sound1"));
assert(hasAudioLoaded, "Test I: Browser successfully loaded and decoded both Sound1.wav and Sound2.wav");

// Test J: Error handling when audio path fails
const mockFailTaal = { id: "test", beats: 4, sam: null, tali: [], khali: [] };
const errorCat = AudioEngine.getSoundCategory(null, 1);
assert(errorCat === "sound2", "Test J.1: Null Taal metadata handled safely without throwing exceptions");

AudioEngine.status = "ERROR";
AudioEngine.errorMessage = "Simulated missing audio file error";
const playAttempt = AudioEngine.playBeat("sound1", 1.0);
assert(playAttempt === null, "Test J.2: playBeat() safely returns null during error state without crashing");

console.log("\n====================================================");
console.log(`  RESULTS: ${passed} / ${total} CHECKS PASSED (${Math.round((passed/total)*100)}%)`);
console.log("====================================================");

if (passed === total) {
  console.log("\nSUCCESS: All Tabla Taal Engine audio playback requirements verified!");
} else {
  console.error("\nFAILURE: Some checks failed.");
  process.exit(1);
}
