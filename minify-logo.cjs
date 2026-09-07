const fs = require('fs');
const path = require('path');
const root = __dirname;
const src = fs.readFileSync(path.join(root, 'public/assets/tri_logo.svg'), 'utf8');
const re = /<circle\s+cx="([\d.]+)"\s+cy="([\d.]+)"\s+r="([\d.]+)"\s+fill="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g;
const groups = new Map();
let m, total = 0, sum = 0;
const num = v => (+v).toFixed(1).replace(/\.0$/, '');
const brighten = (v, s) => Math.min(255, Math.round(+v * s));
const BRIGHTNESS_SCALE = 3.5;
while ((m = re.exec(src))) {
  const r = brighten(m[4], BRIGHTNESS_SCALE);
  const g = brighten(m[5], BRIGHTNESS_SCALE);
  const b = brighten(m[6], BRIGHTNESS_SCALE);
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  sum += (r + g + b) / 3;
  total++;
  if (!groups.has(hex)) groups.set(hex, []);
  groups.get(hex).push(`<circle cx="${num(m[1])}" cy="${num(m[2])}" r="${num(m[3])}"/>`);
}
const body = [...groups.entries()].map(([fill, cs]) => `<g fill="${fill}">${cs.join('')}</g>`).join('');
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3600 3600">${body}</svg>`;
fs.mkdirSync(path.join(root, 'src/assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/assets/tri_logo.svg'), out);
console.log('circles:', total, 'groups:', groups.size, 'avg gray:', (sum / total).toFixed(1), 'size:', out.length);
