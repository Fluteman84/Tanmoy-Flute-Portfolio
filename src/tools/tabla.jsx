import taals from "../../data/taals.json?url";
import { startTabla } from "./tabla-runtime";
import { renderTool } from "./tool-shell";
import { TablaWorkspace } from "./tabla-workspace";
import "../../css/tabla.css";

renderTool(<TablaWorkspace />, () => startTabla(taals));
