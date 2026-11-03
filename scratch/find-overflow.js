const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const content = fs.readFileSync('tabla.html', 'utf8');
const script = `
<script>
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const list = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > 430) {
        list.push({
          tag: el.tagName,
          cls: el.className,
          id: el.id,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          offsetWidth: el.offsetWidth
        });
      }
    });
    console.error('SCROLL_WIDTH_OVERFLOW:' + JSON.stringify(list));
  }, 1000);
});
</script>
`;
fs.writeFileSync('scratch/debug-overflow.html', content.replace('</body>', script + '</body>'));

const fileUrl = 'file:///' + path.resolve('scratch/debug-overflow.html').replace(/\\/g, '/');
const res = spawnSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--virtual-time-budget=2000',
  '--window-size=430,932',
  fileUrl
], { encoding: 'utf-8' });

const logs = (res.stderr || '').split('\n').filter(l => l.includes('SCROLL_WIDTH_OVERFLOW'));
console.log(logs.join('\n'));
