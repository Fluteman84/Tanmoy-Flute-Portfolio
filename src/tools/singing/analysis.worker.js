import { trackPitch, suggestSa, gestures } from "./pitch.mjs";

self.onmessage = ({ data }) => {
  try {
    const track = trackPitch(data.samples, data.rate);
    self.postMessage({ track, sa: suggestSa(track), marks: gestures(track) }, [track.buffer]);
  } catch {
    self.postMessage({ error: "Pitch analysis failed. Try a shorter vocal passage." });
  }
};
