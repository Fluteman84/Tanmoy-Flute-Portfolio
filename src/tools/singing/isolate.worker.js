import * as ort from "onnxruntime-web/wasm";
import wasmModule from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url";
import wasm from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url";
import { DemucsProcessor } from "demucs-web";

const model =
  "https://huggingface.co/timcsy/demucs-web-onnx/resolve/92e33df61cfc9eb820272aaa62d2ef6dcf4d950d/htdemucs_embedded.onnx";
const update = (status) => self.postMessage({ status });

self.onmessage = async ({ data: { left, right } }) => {
  try {
    // A single worker thread also runs on static hosts without cross-origin isolation.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = {
      mjs: new URL(wasmModule, self.location.href).href,
      wasm: new URL(wasm, self.location.href).href,
    };
    const processor = new DemucsProcessor({
      ort,
      sessionOptions: { executionProviders: ["wasm"], enableCpuMemArena: false, enableMemPattern: false },
      onProgress: ({ progress }) =>
        update(`Isolating the singer · ${Math.min(100, Math.round(progress * 100))}%`),
    });
    update("Loading the vocal isolation model…");
    const response = await fetch(model, { cache: "force-cache" });
    if (!response.ok) throw new Error("Model unavailable");
    await processor.loadModel(await response.arrayBuffer());
    update("Isolating the singer…");
    const { vocals } = await processor.separate(left, right || left);
    const mono = vocals.left;
    for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] + vocals.right[i]) / 2;
    self.postMessage({ mono }, [mono.buffer]);
  } catch (error) {
    console.warn("Vocal isolation failed", error);
    self.postMessage({
      error:
        "Vocal isolation could not finish on this device. Turn it off and load a solo vocal track or a shorter passage.",
    });
  }
};
