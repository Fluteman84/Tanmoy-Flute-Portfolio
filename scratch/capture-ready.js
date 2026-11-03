const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const artDir = "C:\\Users\\84tan\\.gemini\\antigravity\\brain\\1ace869d-11ea-4803-93a1-24a3ee8728af";

// Create a small wrapper HTML that waits for AudioEngine to be READY before taking screenshot
const tablaHtml = fs.readFileSync(path.join(rootDir, "tabla.html"), "utf-8");
const wrapperHtml = tablaHtml.replace("</body>", `
<script>
window.addEventListener('DOMContentLoaded', () => {
  const check = setInterval(() => {
    if (window.AudioEngine && window.AudioEngine.status === 'READY') {
      clearInterval(check);
      document.body.setAttribute('data-test-ready', 'true');
    }
  }, 50);
});
</script>
</body>`);

fs.writeFileSync(path.join(rootDir, "scratch", "capture-target.html"), wrapperHtml);

const fileUrl = "file:///" + path.join(rootDir, "scratch", "capture-target.html").replace(/\\/g, "/");

const viewports = [
  { width: 1440, height: 900, filename: "screenshot_1440x900.png" },
  { width: 1366, height: 768, filename: "screenshot_1366x768.png" }
];

for (const vp of viewports) {
  const outPath = path.join(rootDir, "scratch", vp.filename);
  console.log(`Capturing ${vp.width}x${vp.height} -> ${vp.filename}...`);
  
  spawnSync(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--autoplay-policy=no-user-gesture-required",
    `--window-size=${vp.width},${vp.height}`,
    `--screenshot=${outPath}`,
    fileUrl
  ], { encoding: "utf-8", timeout: 8000 });

  if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, path.join(artDir, vp.filename));
    console.log(`[SUCCESS] Captured and copied ${vp.filename}`);
  }
}
