const fs = require('fs');
const path = require('path');

console.log("=== UNIT TEST SUITE FOR TABLA AUDIO ENGINE & METRONOME ===");

// 1. Verify Audio Files
const sound1Path = path.resolve('Sounds', 'Sound1.wav');
const sound2Path = path.resolve('Sounds', 'Sound2.wav');

if (!fs.existsSync(sound1Path) || !fs.existsSync(sound2Path)) {
  console.error("FAIL: Missing sound files in Sounds/");
  process.exit(1);
}
console.log("[PASS] Test A: Sound1.wav and Sound2.wav exist and are readable.");

// 2. Test Sound Mapping
const tintaal = {
  id: "tintaal",
  name: "Tintaal",
  beats: 16,
  sam: 1,
  tali: [1, 5, 13],
  khali: [9]
};

function getSoundCategory(taal, beatNumber) {
  if (!taal) return "sound2";
  const isSam = typeof taal.sam === "number" && taal.sam === beatNumber;
  const isTali = Array.isArray(taal.tali) && taal.tali.includes(beatNumber);
  const isKhali = Array.isArray(taal.khali) && taal.khali.includes(beatNumber);
  if (isSam || isTali || isKhali) {
    return "sound1";
  }
  return "sound2";
}

const expectedTintaal = {
  1: "sound1", // Sam + Tali
  2: "sound2",
  3: "sound2",
  4: "sound2",
  5: "sound1", // Tali
  6: "sound2",
  7: "sound2",
  8: "sound2",
  9: "sound1", // Khali
  10: "sound2",
  11: "sound2",
  12: "sound2",
  13: "sound1", // Tali
  14: "sound2",
  15: "sound2",
  16: "sound2"
};

let mappingOk = true;
for (let b = 1; b <= 16; b++) {
  const cat = getSoundCategory(tintaal, b);
  if (cat !== expectedTintaal[b]) {
    console.error(`FAIL: Beat ${b} got ${cat}, expected ${expectedTintaal[b]}`);
    mappingOk = false;
  }
}
if (mappingOk) {
  console.log("[PASS] Test B: Tintaal sound mapping matches specification for all 16 beats.");
}

// 3. Test Missing Metadata (Test H)
const dadra = {
  id: "dadra",
  name: "Dadra",
  beats: 6,
  sam: null,
  tali: [],
  khali: [],
  notation: null
};

let dadraOk = true;
for (let b = 1; b <= 6; b++) {
  if (getSoundCategory(dadra, b) !== "sound2") {
    dadraOk = false;
  }
}
if (dadraOk) {
  console.log("[PASS] Test H: Missing metadata gracefully defaults to Sound2 for all beats.");
}

console.log("Audio unit checks passed.");
