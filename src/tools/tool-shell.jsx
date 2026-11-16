import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "../components/header";
import "../index.css";
import "../site.css";
import "../../css/style.css";
import "../../css/responsive.css";
import "../../css/notes.css";
import "./tool-theme.css";

function ToolShell({ children, init }) {
  useEffect(() => {
    init?.();
  }, [init]);

  return (
    <>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <Header toolPage />
      <div id="workspace" tabIndex={-1}>{children}</div>
    </>
  );
}

export function renderTool(workspace, init) {
  createRoot(document.getElementById("root")).render(<ToolShell init={init}>{workspace}</ToolShell>);
}
