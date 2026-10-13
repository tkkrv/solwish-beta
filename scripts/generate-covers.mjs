/**
 * Генерирует квадратные обложки-пресеты в public/covers/*.png.
 * Квадрат, потому что Blink-клиенты показывают иконку 1:1, а на странице вишлиста
 * обложка обрезается до 16:9 по центру — иллюстрация в центре видна в обоих случаях.
 *
 * Запуск: node scripts/generate-covers.mjs  (нужен playwright: npx playwright install chromium)
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const COVERS = [
  { key: 'gift', icon: 'Gift', from: '#7C3AED', to: '#C084FC', accent: '#14F195' },
  { key: 'birthday', icon: 'Cake', from: '#EC4899', to: '#F9A8D4', accent: '#FDE68A' },
  { key: 'flowers', icon: 'Flower2', from: '#F43F5E', to: '#FDA4AF', accent: '#FFFFFF' },
  { key: 'tech', icon: 'Laptop', from: '#2563EB', to: '#7DD3FC', accent: '#14F195' },
  { key: 'travel', icon: 'Plane', from: '#0891B2', to: '#5EEAD4', accent: '#FDE68A' },
  { key: 'books', icon: 'BookOpen', from: '#B45309', to: '#FCD34D', accent: '#FFFFFF' },
  { key: 'music', icon: 'Headphones', from: '#4F46E5', to: '#A78BFA', accent: '#F0ABFC' },
  { key: 'charity', icon: 'HeartHandshake', from: '#059669', to: '#6EE7B7', accent: '#FFFFFF' },
];

const svg = (name, size, color, stroke = 1.6) =>
  renderToStaticMarkup(createElement(icons[name], { size, color, strokeWidth: stroke }));

const html = (c) => `<!doctype html><html><head><style>
  html,body{margin:0;width:1000px;height:1000px;overflow:hidden}
  .bg{position:relative;width:1000px;height:1000px;background:
     radial-gradient(circle at 18% 12%, rgba(255,255,255,.35), transparent 38%),
     radial-gradient(circle at 85% 90%, ${c.accent}55, transparent 40%),
     linear-gradient(135deg, ${c.from}, ${c.to});}
  .ring{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.28)}
  .dot{position:absolute;border-radius:50%;background:rgba(255,255,255,.55)}
  .tile{position:absolute;left:50%;top:50%;width:360px;height:360px;margin:-180px 0 0 -180px;
     border-radius:96px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.45);
     box-shadow:0 40px 80px -20px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.35);
     display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
  .spark{position:absolute;opacity:.9}
</style></head><body><div class="bg">
  <div class="ring" style="width:620px;height:620px;left:190px;top:190px"></div>
  <div class="ring" style="width:860px;height:860px;left:70px;top:70px;opacity:.6"></div>
  <div class="dot" style="width:22px;height:22px;left:180px;top:300px"></div>
  <div class="dot" style="width:14px;height:14px;left:800px;top:240px"></div>
  <div class="dot" style="width:18px;height:18px;left:760px;top:760px"></div>
  <div class="dot" style="width:10px;height:10px;left:260px;top:740px"></div>
  <div class="spark" style="left:690px;top:170px">${svg('Sparkles', 84, '#ffffff', 1.8)}</div>
  <div class="spark" style="left:200px;top:640px">${svg('Sparkle', 56, c.accent, 2)}</div>
  <div class="tile">${svg(c.icon, 190, '#ffffff', 1.5)}</div>
</div></body></html>`;

await mkdir('public/covers', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
for (const c of COVERS) {
  if (!icons[c.icon]) throw new Error(`Unknown icon ${c.icon}`);
  await page.setContent(html(c));
  await page.screenshot({ path: `public/covers/${c.key}.png (затем сжать в .jpg 800px)`, type: 'png' });
  console.log('✓', c.key);
}
await browser.close();
