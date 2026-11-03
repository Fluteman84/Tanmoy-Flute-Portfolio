const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const tablaHtml = path.join(rootDir, "tabla.html");
const fileUrl = "file:///" + tablaHtml.replace(/\\/g, "/");

const viewports = [
  { width: 1440, height: 900, filename: "screenshot_1440x900.png" },
  { width: 1366, height: 768, filename: "screenshot_1366x768.png" },
  { width: 1280, height: 800, filename: "screenshot_1280x800.png" },
  { width: 1024, height: 768, filename: "screenshot_1024x768.png" },
  { width: 430, height: 932, filename: "screenshot_430x932.png" },
  { width: 390, height: 844, filename: "screenshot_390x844.png" },
  { width: 360, height: 740, filename: "screenshot_360x740.png" }
];

console.log("File URL:", fileUrl);

for (const vp of viewports) {
  const outPath = path.join(rootDir, "scratch", vp.filename);
  console.log(`\nCapturing ${vp.width}x${vp.height} -> ${vp.filename}...`);
  
  const isMobile = vp.width < 500;
  const args = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=2000",
    "--run-all-compositor-stages-before-draw",
    `--window-size=${vp.width},${vp.height}`,
    ...(isMobile ? [
      "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "--touch-events=enabled"
    ] : []),
    `--screenshot=${outPath}`,
    fileUrl
  ];

  const result = spawnSync(chromePath, args, { encoding: "utf-8" });
  if (result.stderr) {
    console.log("stderr:", result.stderr);
  }
  
  if (fs.existsSync(outPath)) {
    const stats = fs.statSync(outPath);
    console.log(`[SUCCESS] Saved ${vp.filename} (${stats.size} bytes)`);
  } else {
    console.log(`[FAILED] ${vp.filename} not created`);
  }
}
