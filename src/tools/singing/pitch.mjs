import { PitchDetector } from "pitchy";

export const SWARAS = [
  "Sa",
  "komal Re",
  "Re",
  "komal Ga",
  "Ga",
  "Ma",
  "tivra Ma",
  "Pa",
  "komal Dha",
  "Dha",
  "komal Ni",
  "Ni",
];
export const STEP = 0.01;
export const semitones = (hz, sa) => 12 * Math.log2(hz / sa);
export function swara(degree) {
  const note = Math.round(degree);
  const octave = Math.floor(note / 12);
  return (
    SWARAS[((note % 12) + 12) % 12] +
    (octave > 0 ? "′".repeat(Math.min(octave, 5)) : "̣".repeat(Math.min(-octave, 5)))
  );
}

export function trackPitch(samples, rate) {
  const size = 1024;
  const detector = PitchDetector.forFloat32Array(size);
  detector.minVolumeDecibels = -48;
  const hop = Math.round(STEP * rate);
  const track = new Float32Array(Math.ceil(samples.length / hop));
  for (let i = Math.ceil(size / (2 * hop)); i < track.length; i++) {
    const start = i * hop - size / 2;
    if (start + size > samples.length) break;
    const [hz, clarity] = detector.findPitch(samples.subarray(start, start + size), rate);
    if (clarity >= 0.83 && hz >= 70 && hz <= 1100) track[i] = hz;
  }
  return track;
}

// Vote for sustained pitch classes, then score Sa together with its fifth and fourth.
// The histogram retains fine tuning between equal-tempered reference pitches.
export function suggestSa(track) {
  const votes = new Float64Array(120);
  const voiced = [];
  let previous = 0;
  for (const hz of track) {
    if (hz) {
      voiced.push(hz);
      const pitch = Math.round(10 * semitones(hz, 55));
      const weight = previous && Math.abs(semitones(hz, previous)) < 0.25 ? 1 : 0.2;
      for (let delta = -2; delta <= 2; delta++)
        votes[(pitch + delta + 1200) % 120] += weight / (1 + Math.abs(delta));
    }
    previous = hz;
  }
  if (voiced.length < 15) return null;
  voiced.sort((a, b) => a - b);
  let winner = 0,
    best = -1;
  for (let i = 0; i < votes.length; i++) {
    const score = votes[i] + 0.55 * votes[(i + 70) % 120] + 0.25 * votes[(i + 50) % 120];
    if (score > best) {
      winner = i;
      best = score;
    }
  }
  const base = 55 * 2 ** (winner / 120);
  const center = voiced[Math.floor(voiced.length * 0.25)];
  return Math.round(base * 2 ** Math.round(Math.log2(center / base)) * 10) / 10;
}

// Mark candidate movements only within uninterrupted voiced phrases.
export function gestures(track) {
  const marks = [];
  for (let i = 0; i + 22 < track.length; i++) {
    const run = track.subarray(i, i + 23);
    if (run.includes(0)) continue;
    const points = [0, 4, 8, 12, 16, 20].map((j) => semitones(run[j + 1], run[0]));
    const changes = points.slice(1).map((p, j) => p - points[j]);
    const travel = changes.reduce((sum, d) => sum + Math.abs(d), 0);
    const span = Math.max(...points) - Math.min(...points);
    if (span < 1.1 || span > 7) continue;
    const steps = changes.filter((d) => Math.abs(d) > 0.32);
    const turns = steps.slice(1).filter((d, j) => d * steps[j] < 0).length;
    const glide =
      Math.abs(points.at(-1) - points[0]) >= 0.87 * travel &&
      changes.filter((d) => Math.abs(d) > 0.12).length >= 3;
    if (!glide && !(turns >= 1 && travel >= 2.4)) continue;
    marks.push({ time: i * STEP, label: glide ? "Possible meend" : "Possible khatka" });
    i += 22;
  }
  return marks;
}
