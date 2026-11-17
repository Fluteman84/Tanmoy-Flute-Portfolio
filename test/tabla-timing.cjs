const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../tabla-taal-engine/js/metronome-engine.js"),
  "utf8"
);

function makeClock(beats = 4) {
  let now = 0;
  let stops = 0;
  let scheduledTick;
  const played = [];
  const window = {
    AudioEngine: {
      status: "READY",
      ctx: { get currentTime() { return now / 1000; } },
      getSoundCategory: () => "sound1",
      playBeat: (_, deadline) => played.push(deadline),
      stopAll: () => { stops += 1; }
    }
  };
  const document = { hidden: false, addEventListener() {} };
  vm.runInNewContext(source, {
    window,
    document,
    performance: { now: () => now },
    setTimeout: (tick) => { scheduledTick = tick; return 1; },
    clearTimeout: () => { scheduledTick = undefined; }
  });
  const metronome = window.MetronomeEngine;
  metronome.setTaal({ beats });
  return {
    metronome,
    played,
    get stops() { return stops; },
    setTime: (time) => { now = time; },
    tick: (time) => {
      now = time;
      const run = scheduledTick;
      scheduledTick = undefined;
      run?.();
    }
  };
}

test("tempo edits keep the upcoming beat at its original deadline", () => {
  const { metronome, played, tick } = makeClock();
  metronome.start();
  metronome.setBpm(180);
  metronome.setBpm(240);
  tick(525);
  assert.deepEqual(played, [0.025, 0.525]);
  assert.equal(metronome.currentBeat, 2);
  tick(775);
  assert.equal(played[2], 0.775);
  assert.equal(metronome.currentBeat, 3);
});

test("deferred stop lets the final sample ring out without playing beat one", () => {
  const clock = makeClock(2);
  const { metronome, played, tick } = clock;
  metronome.start();
  metronome.stopAfterCycle();
  tick(525);
  tick(1025);
  assert.equal(metronome.state, "STOPPED");
  assert.equal(metronome.currentBeat, 1);
  assert.deepEqual(played, [0.025, 0.525]);
  assert.equal(clock.stops, 0);
  metronome.stopImmediate();
  assert.equal(clock.stops, 1);
});

test("restoring visibility before the next beat preserves the deferred stop", () => {
  const { metronome, played, setTime, tick } = makeClock(2);
  metronome.start();
  metronome.stopAfterCycle();
  setTime(500);
  metronome._handleVisibilityChange();
  assert.equal(metronome.state, "STOPPING_AFTER_CYCLE");
  tick(525);
  assert.equal(metronome.currentBeat, 2);
  assert.deepEqual(played, [0.025, 0.525]);
});

test("missed timers skip stale beats rather than playing them in a burst", () => {
  const { metronome, played, tick } = makeClock();
  metronome.start();
  tick(1600);
  assert.equal(metronome.currentBeat, 4);
  assert.deepEqual(played, [0.025]);
  tick(2025);
  assert.equal(metronome.currentBeat, 1);
  assert.equal(metronome.currentCycle, 2);
  assert.equal(played.length, 2);
  assert.equal(played[1], 2.025);
});
