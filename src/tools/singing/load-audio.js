const sampleRate = 16000;
export const maxBytes = 48 * 1024 * 1024;

export function waveBlob(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function tag(offset, value) {
    [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  }
  tag(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function runWorker(worker, payload, transfers, signal, update) {
  return new Promise((resolve, reject) => {
    const stop = () => {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      stop();
      reject(signal.reason);
    };
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.status) {
        update(data.status);
        return;
      }
      stop();
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    worker.onerror = () => {
      stop();
      reject(new Error("The audio analyzer could not start. Reload and try again."));
    };
    worker.postMessage(payload, transfers);
  });
}

export async function analyzeAudio(blob, capture, signal, isolate, update) {
  if (blob.size > maxBytes) throw new Error("Choose an audio file under 48 MB.");
  const rate = isolate ? 44100 : sampleRate;
  const context = new OfflineAudioContext(1, 1, rate);
  const decoded = await context.decodeAudioData(await blob.arrayBuffer());
  signal.throwIfAborted();
  if (decoded.duration > 600) throw new Error("Choose a passage of up to ten minutes.");
  if (isolate && decoded.duration > 180)
    throw new Error("For vocal isolation, choose a passage of up to three minutes.");

  // Captured WebM files may lack duration metadata. A PCM copy remains seekable.
  async function resample(buffer) {
    const renderer = new OfflineAudioContext(1, Math.ceil(buffer.duration * sampleRate), sampleRate);
    const source = renderer.createBufferSource();
    source.buffer = buffer;
    source.connect(renderer.destination);
    source.start();
    return (await renderer.startRendering()).getChannelData(0);
  }
  const original = capture || !isolate ? await resample(decoded) : null;
  const media = capture ? waveBlob(original) : blob;
  let samples = original;
  if (isolate) {
    signal.throwIfAborted();
    const left = decoded.getChannelData(0).slice();
    const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1).slice() : null;
    const { mono } = await runWorker(
      new Worker(new URL("./isolate.worker.js", import.meta.url), { type: "module" }),
      { left, right },
      right ? [left.buffer, right.buffer] : [left.buffer],
      signal,
      update,
    );
    const voice = context.createBuffer(1, mono.length, rate);
    voice.copyToChannel(mono, 0);
    samples = await resample(voice);
  }
  signal.throwIfAborted();
  update("Measuring Sa and tracing the pitch…");
  const result = await runWorker(
    new Worker(new URL("./analysis.worker.js", import.meta.url), { type: "module" }),
    { samples, rate: sampleRate },
    [samples.buffer],
    signal,
    update,
  );
  if (!result.sa) throw new Error("No stable sung pitch found. Try a clearer vocal passage.");
  return { ...result, duration: decoded.duration, media, isolated: isolate };
}
