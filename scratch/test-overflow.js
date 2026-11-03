const { spawnSync } = require("child_process");
const path = require("path");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const fileUrl = "file:///" + path.join(rootDir, "tabla.html").replace(/\\/g, "/");

const res = spawnSync(chromePath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--allow-file-access-from-files",
  "--enable-logging=stderr",
  "--v=1",
  "--virtual-time-budget=2000",
  "--window-size=430,932",
  fileUrl
], { encoding: "utf-8" });

const lines = (res.stderr || "").split("\n");
lines.filter(l => l.includes("OVERFLOW_ELEMENT")).forEach(l => console.log(l));
