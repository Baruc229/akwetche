const fs = require('fs');
const svg = fs.readFileSync('public/akwetche-symbole.svg', 'utf8');

const hasRect = svg.includes('<rect');
const pathCount = (svg.match(/<path/g) || []).length;
const imageCount = (svg.match(/<image/g) || []).length;
const useCount = (svg.match(/<use/g) || []).length;
const hasMask = svg.includes('<mask');
const gCount = (svg.match(/<g/g) || []).length;
const clipPathCount = (svg.match(/clipPath/g) || []).length;

console.log('rects:', hasRect);
console.log('paths:', pathCount);
console.log('images:', imageCount);
console.log('uses:', useCount);
console.log('mask:', hasMask);
console.log('groups:', gCount);
console.log('clipPaths:', clipPathCount);

// Find all paths and their fills
let idx = 0;
let found = 0;
while ((idx = svg.indexOf('<path', idx)) !== -1 && found < 20) {
  const end = svg.indexOf('/>', idx);
  const el = svg.substring(idx, end + 2);
  const fill = el.match(/fill="([^"]+)"/);
  const d = el.match(/d="([^"]+)"/);
  if (fill && d) {
    const dLen = d[1].length;
    console.log('PATH fill=' + fill[1] + ' d_len=' + dLen + ' preview=' + d[1].substring(0, 50));
  } else {
    console.log('PATH (no match)');
  }
  idx = end + 2;
  found++;
}

// Check for any rects
idx = 0;
while ((idx = svg.indexOf('<rect', idx)) !== -1) {
  const end = svg.indexOf('/>', idx);
  if (end === -1) break;
  const el = svg.substring(idx, end + 2);
  console.log('RECT:', el.substring(0, 250));
  idx = end + 2;
}

// Check for background images that cover full area
idx = 0;
while ((idx = svg.indexOf('<image', idx)) !== -1) {
  const end = svg.indexOf('/>', idx);
  if (end === -1) break;
  const el = svg.substring(idx, end + 2);
  console.log('IMAGE:', el.substring(0, 300));
  idx = end + 2;
}
