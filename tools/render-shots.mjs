// Renders product PNGs (transparent background) for every colorway in src/data.js.
// Usage: start `npm run dev` (port 5173), then `npm run shots`.
import { createRequire } from 'node:module';
// Playwright may be installed globally; require() honours NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');
import { products } from '../src/data.js';

const BASE = process.env.SHOTS_URL || 'http://127.0.0.1:5173';
const poses = {
  a: { rx: 0.22, ry: -0.5, rz: 0.08 },  // three-quarter, toe right
  b: { rx: 0.35, ry: 2.6, rz: -0.06 },  // flipped, other side
};
const extra = [];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 560 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/tools/shots.html`);
await page.evaluate(() => window.stageReady);
for (const p of [...products, ...extra]) {
  for (const [k, pose] of Object.entries(poses)) {
    await page.evaluate((o) => window.renderShot(o), { variant: p.variant, hue: p.hue, sat: p.sat, pose });
    await page.screenshot({ path: `public/shots/${p.id}-${k}.png`, omitBackground: true });
    console.log('rendered', p.id, k);
  }
}
await browser.close();
