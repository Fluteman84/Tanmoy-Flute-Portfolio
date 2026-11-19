import { STEP } from "./pitch.mjs";
import { waveBlob } from "./load-audio";

// Preserve the measured slides between frames and fade to silence across unvoiced frames.
export function makePitchGuide(track, duration) {
  const rate = 16000;
  const samples = new Float32Array(Math.ceil(duration * rate));
  const hop = Math.round(STEP * rate);
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const frame = Math.floor(i / hop);
    const a = track[frame] || 0,
      b = track[frame + 1] || 0;
    if (!a && !b) continue;
    const mix = (i % hop) / hop;
    const frequency = a && b ? a + (b - a) * mix : a || b;
    phase = (phase + (2 * Math.PI * frequency) / rate) % (2 * Math.PI);
    const gain = a && b ? 1 : a ? 1 - mix : mix;
    samples[i] = 0.25 * gain * Math.sin(phase);
  }
  return waveBlob(samples);
}
