const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const content = fs.readFileSync('tabla.html', 'utf8');
const script = '<script>window.addEventListener("DOMContentLoaded", () => { setTimeout(() => { console.error("DESKTOP_CHECK: scrollHeight=" + document.documentElement.scrollHeight + " clientHeight=" + document.documentElement.clientHeight + " innerHeight=" + window.innerHeight); }, 1000); });</script>';
fs.writeFileSync('scratch/debug-win.html', content.replace('</body>', script + '</body>'));

const fileUrl = 'file:///' + path.resolve('scratch/debug-win.html').replace(/\\/g, '/');

for (const [w, h] of [[1440, 900], [1366, 768]]) {
  const res = spawnSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--enable-logging=stderr',
    '--virtual-time-budget=2000',
    `--window-size=${w},${h}`,
    fileUrl
  ], { encoding: 'utf-8' });

  const logs = (res.stderr || '').split('\n').filter(l => l.includes('DESKTOP_CHECK'));
  console.log(`${w}x${h}:`, logs.join('\n'));
}
