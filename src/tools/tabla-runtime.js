import "../../tabla-taal-engine/js/audio-engine.js";
import "../../tabla-taal-engine/js/taal-loader.js";
import "../../tabla-taal-engine/js/taal-renderer.js";
import "../../tabla-taal-engine/js/metronome-engine.js";
import "../../tabla-taal-engine/js/app.js";
import sound1 from "../../Sounds/Sound1.wav?url";
import sound2 from "../../Sounds/Sound2.wav?url";

export function startTabla(dataUrl) {
  window.TablaTaalEngine.init(dataUrl, { sound1, sound2 });
}
