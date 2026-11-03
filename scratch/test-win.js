const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const script = '<script>console.error("WINDOW_INFO: innerWidth=" + window.innerWidth + " outerWidth=" + window.outerWidth + " clientWidth=" + document.documentElement.clientWidth);</script>';
fs.writeFileSync('scratch/debug-win.html', '<html><head>' + script + '</head><body></body></html>');
const res = spawnSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--window-size=430,932',
  'file:///' + path.resolve('scratch/debug-win.html').replace(/\\/g, '/')
], { encoding: 'utf-8' });

console.log((res.stderr || '').split('\n').filter(l => l.includes('WINDOW_INFO')).join('\n'));
