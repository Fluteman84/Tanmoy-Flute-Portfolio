import test from "node:test";
import assert from "node:assert/strict";
import { gestures, semitones, suggestSa, swara, trackPitch } from "../src/tools/singing/pitch.mjs";

test("pitch and Sa follow a tuned voice across silent frames", () => {
  const rate = 16000;
  const samples = Float32Array.from({ length: rate * 2 }, (_, i) =>
    i < rate ? 0 : 0.25 * Math.sin((2 * Math.PI * 220 * i) / rate),
  );
  const track = trackPitch(samples, rate);
  assert.equal(track[50], 0);
  assert.ok(Math.abs(track[150] - 220) < 1);
  assert.ok(Math.abs(suggestSa(track) - 220) < 1);
  assert.equal(suggestSa(new Float32Array(100)), null);
});

test("relative swaras include accidentals and octave marks", () => {
  assert.equal(swara(semitones(330, 220)), "Pa");
  assert.equal(swara(1), "komal Re");
  assert.equal(swara(6), "tivra Ma");
  assert.equal(swara(12), "Sa′");
  assert.equal(swara(-1), "Nị");
});

test("ornament candidates require continuous voiced motion", () => {
  const glide = Float32Array.from({ length: 23 }, (_, i) => 220 * 2 ** (i / 100));
  const turn = Float32Array.from({ length: 23 }, (_, i) => 220 * 2 ** ((i < 11 ? i : 22 - i) / 48));
  assert.equal(gestures(glide)[0]?.label, "Possible meend");
  assert.equal(gestures(turn)[0]?.label, "Possible khatka");
  glide[10] = 0;
  assert.deepEqual(gestures(glide), []);
  assert.deepEqual(gestures(new Float32Array(50).fill(220)), []);
});
