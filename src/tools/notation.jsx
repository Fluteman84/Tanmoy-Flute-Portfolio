import "../../js/swaralipi-engine.js";
import "../../js/swaralipi-editor.js";
import "../../js/swaralipi-keyboard.js";
import { renderTool } from "./tool-shell";
import "../../css/notation.css";

function openEditor() {
  const { Editor, MobileKeyboard } = window.Swaralipi;
  const editor = new Editor(document.getElementById("swaralipiApp"));
  window.swaralipiEditor = editor;
  if (MobileKeyboard && !editor._mobileKeyboard) editor._initMobileKeyboard();
}

renderTool(<main className="notes-main"><div id="swaralipiApp" className="swaralipi-app" /></main>, openEditor);
