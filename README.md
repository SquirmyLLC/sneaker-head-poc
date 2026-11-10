# HEAT XCHANGE (sneaker store demo)

An interactive, 3D sneaker store proof of concept for sneakerheads: buy, sell and trade.

```
npm install
npm run dev
```

## What's in it
- **Hero:** an interactive video reel (Alex's clip, cut into 159 webp frames in `public/video/frames`). It plays on its own, scroll scrubs it, and dragging spins the shoe with inertia; cursor spotlight, 3D tilt, frame counter and callouts that pop up as parts of the shoe come into view, while "HEAT" and "XCHANGE" slide apart.
- **Anatomy tour:** a pinned scroll section where the shoe turns to show the upper, the midsole and the outsole, with callouts.
- **Colorway lab:** a 360° turntable built from pre-rendered frames (`public/spin`, made by `tools/render-spin.mjs`), so it works on any device. Drag to spin, zoom, swap base colorway, tap quick colors or set a custom hue and saturation (the colorway name updates), pick a size, add to bag.
- **Sell / trade:** an instant offer calculator (pair, size, box, condition) showing cash vs. +20% trade credit.
- **Raffle:** a live countdown to the next Friday 10:00 drop, plus an entry form (front end only).
- **Vault:** a horizontal-scroll product rail (swipe on phones) with resale prices, hover flip and tilt. Clicking a pair loads it into the lab.
- Loader, custom cursor, magnetic buttons, scroll-speed marquee, count-up stats.

Stack: Vite, three.js, GSAP ScrollTrigger, Lenis. Matte grey theme. Fonts: Unbounded, Space Grotesk, JetBrains Mono (self-hosted).

## Files
- `src/stage.js`: the WebGL scene (model, lights, hue-shift shader, drag/zoom).
- `src/main.js`: scroll choreography (pose keyframes), UI and interactions.
- `src/data.js`: placeholder products, prices, sizes.
- `public/models/`: the shoe as glTF JSON + base64 geometry + JPG textures, split from the `.glb` by `tools/split-glb.py`. The page rebuilds the GLB in memory, because preview hosts don't serve `.glb` files and can block data: URIs. If WebGL is unavailable, rendered photos are shown instead.
- `public/shots/`: product PNGs rendered from the 3D model. Re-render with `npm run dev` then `NODE_PATH=$(npm root -g) npm run shots`.

## Placeholders before client use
- Brand name "HEAT XCHANGE", the "HX-Runner" product line, prices, stats and sizes.
- Raffle, drop alerts and bag are front end only; nothing is sent or stored.
- The hero video shows a branded sneaker from a stock-style clip Alex supplied; confirm its license or use the client's own footage before launch.
- The 3D model is Shopify's "Materials Variants Shoe" from the Khronos glTF sample assets, licensed CC BY 4.0 (credited in the footer). A real store would swap in its own product models or photos.
