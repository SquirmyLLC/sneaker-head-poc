# GRAILHAUS (sneaker store demo)

An interactive, 3D sneaker store proof of concept for sneakerheads.

```
npm install
npm run dev
```

## What's in it
- **Hero:** a real-time 3D sneaker flies in over giant "GRAIL HAUS" type and follows the cursor.
- **Anatomy tour:** a pinned scroll section where the shoe turns to show the upper, the midsole and the outsole, with callouts.
- **Colorway lab:** drag to spin, double-click or +/- to zoom, swap the base colorway, shift hue and saturation (the colorway name updates), pick a size, add to bag.
- **Raffle:** a live countdown to the next Friday 10:00 drop, plus an entry form (front end only).
- **Vault:** a horizontal-scroll product rail (swipe on phones) with resale prices, hover flip and tilt. Clicking a pair loads it into the lab.
- Loader, custom cursor, magnetic buttons, scroll-speed marquee, count-up stats.

Stack: Vite, three.js, GSAP ScrollTrigger, Lenis. Fonts: Unbounded, Space Grotesk, JetBrains Mono (self-hosted).

## Files
- `src/stage.js`: the WebGL scene (model, lights, hue-shift shader, drag/zoom).
- `src/main.js`: scroll choreography (pose keyframes), UI and interactions.
- `src/data.js`: placeholder products, prices, sizes.
- `public/models/`: the shoe as glTF JSON + JPG textures (split from the `.glb` by `tools/split-glb.py`, because the preview host doesn't serve `.glb`).
- `public/shots/`: product PNGs rendered from the 3D model. Re-render with `npm run dev` then `NODE_PATH=$(npm root -g) npm run shots`.

## Placeholders before client use
- Brand name "GRAILHAUS", the "GH-Runner" product line, prices, stats and sizes.
- Raffle, drop alerts and bag are front end only; nothing is sent or stored.
- The 3D model is Shopify's "Materials Variants Shoe" from the Khronos glTF sample assets, licensed CC BY 4.0 (credited in the footer). A real store would swap in its own product models or photos.
