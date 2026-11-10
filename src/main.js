import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createStage } from './stage.js';
import { products, hueNames, sizes, soldOut, baseHue, baseName } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

document.body.classList.add('is-loading');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------------- Smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.stop();
window.__lenis = lenis;
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  })
);

/* ---------------- Split hero letters ---------------- */
$$('.split').forEach((el) => {
  el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${c}</span>`).join('');
});

/* ---------------- 3D stage ---------------- */
const loaderCount = $('#loaderCount');
const loaderBar = $('#loaderBar');
let shownPct = 0;
const setPct = (p) => {
  shownPct = Math.max(shownPct, p);
  loaderCount.textContent = String(Math.round(shownPct * 100)).padStart(3, '0');
  loaderBar.style.width = `${shownPct * 100}%`;
};

// If WebGL or the model fails, fall back to rendered photos so the page never
// shows an empty stage.
function noStage() {
  const state = {};
  return {
    ready: Promise.reject(new Error('WebGL unavailable')), state, uniforms: { uHue: { value: 0 }, uSat: { value: 1 } },
    setVariant() {}, bindDrag() {}, setDragEnabled() {}, zoomBy() {}, worldHeight: () => 5,
  };
}
let stage;
try {
  stage = createStage($('#stage'), { onProgress: (p) => setPct(p * 0.95) });
} catch (err) {
  console.error(err);
  stage = noStage();
}
const S = stage.state;
// Start state: shoe dropped out of frame so the intro can fly it in.
Object.assign(S, { y: -4, ry: -2.2, rx: 0.6, scale: 0.7 });

stage.ready
  .catch((err) => {
    console.error('3D unavailable, using photos', err);
    document.documentElement.classList.add('no-3d');
  })
  .finally(() => {
    setPct(1);
    setTimeout(intro, 350);
  });

/* ---------------- Intro ---------------- */
function intro() {
  $('#loader').classList.add('is-done');
  document.body.classList.remove('is-loading');
  lenis.start();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__word .ch', { yPercent: 110, duration: 1.4, stagger: 0.05 }, 0.2)
    .from('.reveal', { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.7)
    .from('.nav', { yPercent: -100, duration: 1 }, 0.6);
  setupScroll();
}

/* ---------------- Scroll choreography ---------------- */
function setupScroll() {
  const mm = gsap.matchMedia();

  mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    // Shoe poses per section. x/y in world units; rotations in radians.
    const P = desktop
      ? {
          hero: { x: 0, y: -0.25, z: 0, scale: 1.1, rx: 0.28, ry: -0.55, rz: 0.1, float: 1, opacity: 1 },
          side: { x: 1.25, y: 0, z: 0, scale: 1.2, rx: 0.08, ry: 0, rz: 0, float: 0.4 },
          top: { x: 1.25, y: 0, z: 0, scale: 1.1, rx: 1.15, ry: 0.15, rz: 0, float: 0.3 },
          sole: { x: 1.25, y: 0, z: 0, scale: 1.15, rx: -1.35, ry: -0.2, rz: 0, float: 0.3 },
          lab: { x: -1.5, y: -0.05, z: 0, scale: 1.05, rx: 0.3, ry: -0.7, rz: 0.05, float: 0.6 },
          exit: { x: -1.5, y: 3.4, z: 0, scale: 0.9, rx: 0.6, ry: 0.4, opacity: 0 },
        }
      : {
          hero: { x: 0, y: -0.1, z: 0, scale: 0.92, rx: 0.3, ry: -0.6, rz: 0.12, float: 1, opacity: 1 },
          side: { x: 0, y: 0.8, z: 0, scale: 0.78, rx: 0.08, ry: 0, rz: 0, float: 0.4 },
          top: { x: 0, y: 0.8, z: 0, scale: 0.74, rx: 1.15, ry: 0.15, rz: 0, float: 0.3 },
          sole: { x: 0, y: 0.8, z: 0, scale: 0.74, rx: -1.35, ry: -0.2, rz: 0, float: 0.3 },
          lab: { x: 0, y: 0.95, z: 0, scale: 0.9, rx: 0.3, ry: -0.7, rz: 0.05, float: 0.6 },
          exit: { x: 0, y: 5.5, z: 0, scale: 0.8, rx: 0.6, ry: 0.4, opacity: 0 },
        };

    // Keyframes: [scroll position, pose], rebuilt on every refresh. The shoe's
    // pose is interpolated between them, so all sections share one source of truth.
    let keys = [];
    const build = () => {
      const vh = window.innerHeight;
      const wh = stage.worldHeight(); // world units per viewport height
      const top = (el) => el.getBoundingClientRect().top + window.scrollY;
      const anat = $('#anatomy');
      const lab = $('#lab');
      const aT = top(anat);
      const aL = anat.offsetHeight - vh;
      const lT = top(lab);
      const lH = lab.offsetHeight;
      const follow = (pose, px, extra = {}) => ({ ...pose, y: pose.y + (px / vh) * wh, ...extra });
      keys = [
        [0, P.hero],
        [aT - vh * 0.75, P.hero],
        [aT, P.side],
        [aT + aL * 0.22, P.side],
        [aT + aL * 0.42, P.top],
        [aT + aL * 0.58, P.top],
        [aT + aL * 0.78, P.sole],
        [aT + aL, P.sole],
      ];
      // After the anatomy tour the 3D shoe floats away; the lab uses its own 360° viewer.
      const out = aT + aL;
      keys.push([out + vh * 0.7, follow(P.sole, vh * 0.7, { opacity: 0, ry: P.sole.ry + 0.8 })]);
    };
    const ease = (t) => t * t * (3 - 2 * t);
    const intro = { t: 0 };
    const start = { ...S };
    const apply = () => {
      if (!keys.length) return;
      const y = window.scrollY;
      let pose = keys[keys.length - 1][1];
      if (y <= keys[0][0]) pose = keys[0][1];
      else {
        for (let i = 0; i < keys.length - 1; i++) {
          const [a, pa] = keys[i];
          const [b, pb] = keys[i + 1];
          if (y >= a && y <= b) {
            const t = b > a ? ease((y - a) / (b - a)) : 1;
            pose = {};
            for (const k in pb) pose[k] = (pa[k] ?? pb[k]) + (pb[k] - (pa[k] ?? pb[k])) * t;
            break;
          }
        }
      }
      const it = intro.t;
      for (const k in pose) {
        const full = { opacity: 1, float: 1, ...pose }[k];
        S[k] = it >= 1 ? full : (start[k] ?? full) + (full - (start[k] ?? full)) * it;
      }
    };
    ScrollTrigger.addEventListener('refresh', () => { build(); apply(); });
    build();
    lenis.on('scroll', apply);
    gsap.to(intro, { t: 1, duration: reduced ? 0 : 2.2, ease: 'expo.out', delay: 0.1, onUpdate: apply });

    gsap.to('.hero__word', { yPercent: -25, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    ScrollTrigger.create({
      trigger: '#anatomy', start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        setStep(Math.min(2, Math.floor(self.progress * 3)));
        $('#anatBar').style.width = `${self.progress * 100}%`;
      },
    });

    // Lenis listener cleanup when the media query flips.
    return () => lenis.off('scroll', apply);
  });

  gsap.matchMedia().add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
    const { desktop } = ctx.conditions;

    // Vault: horizontal scroll on desktop.
    if (desktop) {
      const track = $('#vaultTrack');
      const dist = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.vault', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
      });
    }

    // Drop image parallax.
    gsap.fromTo('.drop__img', { y: 60, rotate: -14 }, { y: -60, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.drop', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Nav hide on scroll down / show on up.
  ScrollTrigger.create({
    start: 80, end: 'max',
    onUpdate: (self) => {
      $('#nav').classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 400);
      $('#nav').classList.toggle('is-solid', self.scroll() > 80);
    },
  });

  // Marquee driven by time + scroll velocity.
  const track = $('#marquee1');
  track.innerHTML += track.innerHTML;
  let mx = 0;
  let boost = 0;
  lenis.on('scroll', ({ velocity }) => { boost = velocity; });
  gsap.ticker.add(() => {
    const half = track.scrollWidth / 2;
    mx -= 1.2 + Math.abs(boost) * 0.4;
    if (mx <= -half) mx += half;
    track.style.transform = `translateX(${mx}px)`;
  });

  // Count-up stats.
  $$('.stat b').forEach((el) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const dec = +(el.dataset.dec || 0);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = prefix + o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix) }),
    });
    el.textContent = prefix + (0).toFixed(dec) + suffix;
  });

  // Section titles slide up.
  $$('.vault__title, .drop__title, .footer__title, .lab__title, .trade__title').forEach((el) =>
    gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
  );

  ScrollTrigger.refresh();
}

let curStep = 0;
function setStep(i) {
  if (i === curStep) return;
  curStep = i;
  $$('.step').forEach((el) => el.classList.toggle('is-active', +el.dataset.step === i));
  $$('.callout').forEach((el) => el.classList.toggle('is-active', +el.dataset.step === i));
  $('#anatIdx').textContent = String(i + 1).padStart(2, '0');
}
// First callouts visible once anatomy is reached.
ScrollTrigger.create({
  trigger: '#anatomy', start: 'top 30%', end: 'bottom top',
  onToggle: (self) => $$('.callout').forEach((el) => el.classList.toggle('is-active', self.isActive && +el.dataset.step === curStep)),
});

/* ---------------- Colorway lab ---------------- */
let variant = 'midnight';
let hue = 0;
let sat = 1;
const labName = $('#labName');

/* 360° viewer: pre-rendered turntable frames, so it works on every device. */
const FRAMES = 36;
const spinImg = $('#spinImg');
const frameCache = {};
function framesFor(v) {
  if (!frameCache[v]) {
    frameCache[v] = Array.from({ length: FRAMES }, (_, i) => {
      const im = new Image();
      im.src = `spin/${v}-${String(i).padStart(2, '0')}.webp`;
      return im;
    });
  }
  return frameCache[v];
}
const spin = { pos: 0, vel: 0, dragging: false, lastX: 0, idle: 0, zoom: 1, zoomTo: 1, visible: false };
function showFrame() {
  const i = ((Math.round(spin.pos) % FRAMES) + FRAMES) % FRAMES;
  const src = framesFor(variant)[i].src;
  if (spinImg.getAttribute('src') !== src) spinImg.setAttribute('src', src);
  $('#spinDeg').textContent = `${i * 10}°`;
}
function paintSpin() {
  spinImg.style.filter = `hue-rotate(${hue}deg) saturate(${sat})`;
}
const zone = $('#labZone');
zone.addEventListener('pointerdown', (e) => {
  spin.dragging = true; spin.lastX = e.clientX; spin.vel = 0;
  zone.setPointerCapture(e.pointerId); zone.classList.add('is-dragging');
});
zone.addEventListener('pointermove', (e) => {
  if (!spin.dragging) return;
  const dx = e.clientX - spin.lastX;
  spin.lastX = e.clientX;
  spin.vel = -dx / 12;
  spin.pos += spin.vel;
  spin.idle = 0;
});
const endDrag = () => { spin.dragging = false; zone.classList.remove('is-dragging'); };
zone.addEventListener('pointerup', endDrag);
zone.addEventListener('pointercancel', endDrag);
zone.addEventListener('dblclick', () => { spin.zoomTo = spin.zoomTo > 1 ? 1 : 1.5; });
$('#zoomIn').addEventListener('click', () => { spin.zoomTo = Math.min(2, spin.zoomTo * 1.2); });
$('#zoomOut').addEventListener('click', () => { spin.zoomTo = Math.max(0.8, spin.zoomTo / 1.2); });
ScrollTrigger.create({ trigger: '#lab', start: 'top bottom', end: 'bottom top', onToggle: (self) => { spin.visible = self.isActive; if (self.isActive) framesFor(variant); } });
gsap.ticker.add((t, dt) => {
  if (!spin.visible) return;
  if (!spin.dragging) {
    spin.vel *= 0.92;
    spin.pos += spin.vel;
    spin.idle += dt;
    if (spin.idle > 1500 && Math.abs(spin.vel) < 0.05) spin.pos += dt * 0.006; // slow auto-turn
  }
  spin.zoom += (spin.zoomTo - spin.zoom) * 0.15;
  spinImg.style.transform = `scale(${spin.zoom.toFixed(3)})`;
  showFrame();
});

const presets = [
  { name: 'Original', hue: 0, sat: 1 },
  { name: 'Volt', target: 70, sat: 1.3 },
  { name: 'Toxic', target: 120, sat: 1.2 },
  { name: 'Ice', target: 190, sat: 0.7 },
  { name: 'Royal', target: 228, sat: 1.2 },
  { name: 'Grape', target: 272, sat: 1.2 },
  { name: 'Infrared', target: 2, sat: 1.4 },
  { name: 'Ghost', hue: 0, sat: 0 },
];
const presetEl = $('#presets');
presets.forEach((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'preset';
  b.title = p.name;
  b.setAttribute('aria-label', `${p.name} colorway`);
  b.innerHTML = `<span></span><small>${p.name}</small>`;
  b.addEventListener('click', () => {
    const h = p.target === undefined ? p.hue : (p.target - baseHue[variant] + 360) % 360;
    setColor(h, p.sat);
    $$('.preset').forEach((x) => x.classList.toggle('is-active', x === b));
  });
  presetEl.appendChild(b);
});
function paintPresets() {
  $$('.preset span').forEach((dot, i) => {
    const p = presets[i];
    const h = p.target ?? baseHue[variant];
    const sl = p.sat === 0 ? '0%' : `${Math.min(90, 70 * p.sat)}%`;
    dot.style.background = `hsl(${h} ${sl} ${variant === 'street' && p.target === undefined && p.sat ? '25%' : '52%'})`;
  });
}
function setColor(h, s2) {
  const hueEl = $('#hue');
  const satEl = $('#sat');
  hueEl.value = Math.round(h);
  satEl.value = Math.round(s2 * 100);
  hueEl.dispatchEvent(new Event('input'));
  satEl.dispatchEvent(new Event('input'));
}

function updateLabName() {
  paintSpin();
  let label = baseName[variant];
  if (hue > 4 && hue < 356) {
    const h = (baseHue[variant] + hue) % 360;
    for (const [from, n] of hueNames) if (h >= from) label = n;
    if (label === baseName[variant]) label = `${label} II`;
  }
  if (sat < 0.25) label = 'Ghost';
  else if (sat > 1.6) label = `Neon ${label}`;
  labName.textContent = `HX-RUNNER "${label}"`.toUpperCase();
}

$$('.swatch').forEach((btn) =>
  btn.addEventListener('click', () => {
    variant = btn.dataset.variant;
    stage.setVariant(variant);
    $$('.swatch').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-checked', b === btn);
    });
    gsap.fromTo(spinImg, { scale: spin.zoom * 0.9 }, { scale: spin.zoom, duration: 0.5, ease: 'back.out(3)', clearProps: 'scale' });
    framesFor(variant);
    showFrame();
    paintPresets();
    updateLabName();
  })
);
$('#hue').addEventListener('input', (e) => {
  hue = +e.target.value;
  stage.uniforms.uHue.value = (hue * Math.PI) / 180;
  $('#hueOut').textContent = `${hue}°`;
  updateLabName();
});
$('#sat').addEventListener('input', (e) => {
  sat = +e.target.value / 100;
  stage.uniforms.uSat.value = sat;
  $('#satOut').textContent = `${e.target.value}%`;
  updateLabName();
});

const sizesEl = $('#sizes');
let pickedSize = null;
sizes.slice(0, 14).forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'size';
  b.textContent = s;
  b.disabled = soldOut.includes(s);
  b.setAttribute('aria-label', `US ${s}${b.disabled ? ', sold out' : ''}`);
  b.addEventListener('click', () => {
    pickedSize = s;
    $$('.size', sizesEl).forEach((x) => x.classList.toggle('is-active', x === b));
  });
  sizesEl.appendChild(b);
});

let bag = 0;
function addToBag(label) {
  bag += 1;
  const c = $('#bagCount');
  c.textContent = bag;
  c.classList.remove('bump');
  void c.offsetWidth;
  c.classList.add('bump');
  toast(label);
}
$('#addToBag').addEventListener('click', () => {
  if (!pickedSize) {
    toast('Pick a size first');
    gsap.fromTo('#sizes', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    return;
  }
  addToBag(`Added ${labName.textContent.replace('HX-RUNNER ', '')} · US ${pickedSize}`);
});

paintPresets();

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2400);
}
$('#bagBtn').addEventListener('click', () => toast(bag ? `${bag} pair${bag > 1 ? 's' : ''} in your bag (demo)` : 'Your bag is empty. Go get some heat.'));

/* ---------------- Countdown ---------------- */
function nextFriday10() {
  const d = new Date();
  const out = new Date(d);
  out.setHours(10, 0, 0, 0);
  out.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  if (out <= d) out.setDate(out.getDate() + 7);
  return out;
}
const dropAt = nextFriday10();
const cdEls = Object.fromEntries($$('#countdown b').map((b) => [b.dataset.unit, b]));
function tick() {
  let s = Math.max(0, Math.floor((dropAt - Date.now()) / 1000));
  const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const k in v) {
    const str = String(v[k]).padStart(2, '0');
    if (cdEls[k].textContent !== str) cdEls[k].textContent = str;
  }
}
tick();
setInterval(tick, 1000);

/* ---------------- Raffle + alerts ---------------- */
const sel = $('#raffleSize');
sizes.filter((s) => !soldOut.includes(s)).forEach((s) => sel.insertAdjacentHTML('beforeend', `<option value="${s}">US ${s}</option>`));
$('#raffle').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#raffleEmail');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  email.classList.toggle('is-invalid', !ok);
  sel.classList.toggle('is-invalid', !sel.value);
  if (!ok || !sel.value) return toast(!ok ? 'Enter a valid email' : 'Pick your size');
  const note = $('#raffleNote');
  note.textContent = `You're in for US ${sel.value}. Entry #${Math.floor(1000 + Math.random() * 9000)}. Good luck. (Demo: nothing was sent.)`;
  note.classList.add('is-win');
  e.target.querySelector('button').textContent = 'Entered';
  e.target.querySelector('button').disabled = true;
});
$('#alerts').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#alertEmail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) return toast('Enter a valid email');
  input.value = '';
  toast("You're on the list. (Demo)");
});

/* ---------------- Sell / trade offer ---------------- */
{
  const pairSel = $('#offerPair');
  const sizeSel = $('#offerSize');
  products.forEach((p) => pairSel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} ${p.cw}</option>`));
  sizes.forEach((s) => sizeSel.insertAdjacentHTML('beforeend', `<option value="${s}" ${s === 10 ? 'selected' : ''}>US ${s}</option>`));
  pairSel.value = 'street-0';
  const factor = { ds: 0.72, vnds: 0.6, used: 0.42 };
  let cond = 'ds', box = 1, pay = 'credit';
  const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  const shown = { cash: 0, credit: 0 };
  function update() {
    const p = products.find((x) => x.id === pairSel.value);
    $('#offerImg').src = `shots/${p.id}-a.png`;
    const sizeAdj = [9, 9.5, 10, 10.5, 11].includes(+sizeSel.value) ? 1.04 : 1;
    const cash = p.price * factor[cond] * (box ? 1 : 0.9) * sizeAdj;
    gsap.to(shown, {
      cash, credit: cash * 1.2, duration: 0.6, ease: 'power3.out',
      onUpdate: () => { $('#offerCash').textContent = money(shown.cash); $('#offerCredit').textContent = money(shown.credit); },
    });
  }
  const seg = (sel, cb) => $$(sel).forEach((b) => b.addEventListener('click', () => {
    $$(sel).forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-checked', x === b); });
    cb(b); update();
  }));
  seg('[data-cond]', (b) => (cond = b.dataset.cond));
  seg('[data-box]', (b) => (box = +b.dataset.box));
  $$('.offer__opt').forEach((b) => b.addEventListener('click', () => {
    pay = b.dataset.pay;
    $$('.offer__opt').forEach((x) => x.classList.toggle('is-active', x === b));
  }));
  pairSel.addEventListener('change', update);
  sizeSel.addEventListener('change', update);
  $('#offer').addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = pay === 'cash' ? $('#offerCash').textContent : $('#offerCredit').textContent;
    toast(`Offer locked: ${amt} ${pay === 'cash' ? 'cash' : 'trade credit'} (demo)`);
  });
  update();
}

/* ---------------- Vault cards ---------------- */
function spark(up) {
  const pts = [];
  let y = up ? 18 : 6;
  for (let i = 0; i < 12; i++) {
    y += (Math.sin(i * 1.7 + (up ? 0 : 2)) * 3) + (up ? -1.1 : 1.1);
    pts.push(`${(i / 11) * 70},${Math.max(2, Math.min(22, y)).toFixed(1)}`);
  }
  return `<svg class="spark" viewBox="0 0 70 24" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="${up ? '#12a150' : '#d93a12'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const vt = $('#vaultTrack');
products.forEach((p, i) => {
  const up = p.chg >= 0;
  vt.insertAdjacentHTML(
    'beforeend',
    `<a class="card" href="#lab" data-variant="${p.variant}" data-hue="${p.hue}" data-sat="${p.sat}" style="--c:${p.bg}">
      <div class="card__media">
        <div class="card__tags">${p.tags.map((t, j) => `<span class="tag ${j ? 'tag--line' : 'tag--volt'}">${t}</span>`).join('')}</div>
        <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
        <img class="a" src="shots/${p.id}-a.png" alt="${p.name} ${p.cw}" loading="lazy" width="800" height="560" />
        <img class="b" src="shots/${p.id}-b.png" alt="" loading="lazy" width="800" height="560" />
      </div>
      <div class="card__body">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__cw">${p.cw}</p>
        <div class="card__row">
          <div><span class="card__price">$${p.price}</span> <span class="card__chg ${up ? 'up' : 'down'}">${up ? '&#9650;' : '&#9660;'} ${Math.abs(p.chg).toFixed(1)}%</span></div>
          ${spark(up)}
        </div>
      </div>
    </a>`
  );
});
vt.insertAdjacentHTML('beforeend', `<div class="card card--end"><div><h3>Can't find<br/>your grail?</h3><a class="btn btn--volt" href="#lab">Build it in the lab</a></div></div>`);

// Clicking a vault card loads its colorway into the lab.
$$('.card[data-variant]').forEach((card) =>
  card.addEventListener('click', (e) => {
    e.preventDefault();
    const btn = $(`.swatch[data-variant="${card.dataset.variant}"]`);
    btn.click();
    const h = $('#hue');
    const s = $('#sat');
    h.value = card.dataset.hue;
    s.value = Math.round(card.dataset.sat * 100);
    h.dispatchEvent(new Event('input'));
    s.dispatchEvent(new Event('input'));
    lenis.scrollTo('#lab', { duration: 1.6 });
  })
);
$$('.card--end a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo('#lab', { duration: 1.6 }); }));

// Card tilt on hover (desktop).
if (!isTouch) {
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
  });
}

/* ---------------- Cursor + magnetic buttons ---------------- */
if (!isTouch) {
  const cur = $('#cursor');
  const label = $('#cursorLabel');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { cur.classList.add('is-on'); pos.x = e.clientX; pos.y = e.clientY; xTo(pos.x); yTo(pos.y); });
  const big = (text) => { cur.classList.add('is-big'); label.textContent = text; };
  const small = () => cur.classList.remove('is-big');
  $('#labZone').addEventListener('pointerenter', () => big('DRAG'));
  $('#labZone').addEventListener('pointerleave', small);
  $$('.card[data-variant]').forEach((c) => { c.addEventListener('pointerenter', () => big('REMIX')); c.addEventListener('pointerleave', small); });

  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: 'power3' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }));
  });
}

window.addEventListener('load', () => ScrollTrigger.refresh());
