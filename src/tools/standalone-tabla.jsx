import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import taals from "../../tabla-taal-engine/data/taals.json?url";
import { startTabla } from "./tabla-runtime";
import { StandaloneWorkspace } from "./standalone-tabla-workspace";
import "../../tabla-taal-engine/css/style.css";
import "../../tabla-taal-engine/css/responsive.css";

function StandaloneTabla() {
  useEffect(() => startTabla(taals), []);
  return <StandaloneWorkspace />;
}

createRoot(document.getElementById("root")).render(<StandaloneTabla />);
