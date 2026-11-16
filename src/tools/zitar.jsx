import "../../js/zitar-data.js";
import "../../js/zitar-app.js";
import presets from "../../data/amplifier-presets.json?url";
import { renderTool } from "./tool-shell";
import { ZitarWorkspace } from "./zitar-workspace";
import "../../css/zitar.css";

renderTool(<ZitarWorkspace />, () => window.ZitarApp.init(presets));
