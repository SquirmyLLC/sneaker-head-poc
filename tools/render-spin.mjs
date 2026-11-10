// Renders a 360° turntable (36 frames) for each base colorway, used by the
// colorway lab so it works without WebGL. Run `npm run dev` first, then
// NODE_PATH=$(npm root -g) node tools/render-spin.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.SHOTS_URL || 'http://127.0.0.1:5173';
const FRAMES = 36;
mkdirSync('public/spin', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/tools/shots.html`);
await page.evaluate(() => window.stageReady);
for (const variant of ['midnight', 'beach', 'street']) {
  for (let i = 0; i < FRAMES; i++) {
    const ry = -0.5 + (i / FRAMES) * Math.PI * 2;
    await page.evaluate((o) => window.renderShot(o), { variant, hue: 0, sat: 1, pose: { rx: 0.2, ry, rz: 0, scale: 1.5, y: 0.15 } });
    const png = `/tmp/spin-${variant}-${i}.png`;
    await page.screenshot({ path: png, omitBackground: true });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').save('public/spin/${variant}-${String(i).padStart(2, '0')}.webp', 'WEBP', quality=82, method=6)`]);
  }
  console.log('spun', variant);
}
await browser.close();
