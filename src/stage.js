// The 3D stage: one fixed WebGL canvas with the shoe, driven by scroll + pointer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL_URL = 'models/shoe.json';

// Hue-shift + saturation tweak injected into the standard material, so one
// model can wear any colourway.
function addHueShift(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHue = uniforms.uHue;
    shader.uniforms.uSat = uniforms.uSat;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uHue;
        uniform float uSat;
        vec3 ghHue(vec3 c, float a) {
          const vec3 k = vec3(0.57735);
          float ca = cos(a);
          return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
        }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        diffuseColor.rgb = ghHue(diffuseColor.rgb, uHue);
        float ghL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = max(mix(vec3(ghL), diffuseColor.rgb, uSat), 0.0);`
      );
  };
  material.customProgramCacheKey = () => 'gh-hue';
  material.needsUpdate = true;
}

export function createStage(canvas, { onProgress, modelUrl = MODEL_URL } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Lights: warm key, volt rim, cool fill.
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-4, -2, 5);
  scene.add(fill);

  // Group hierarchy: rig (scroll state) > spin (drag/idle) > shoe.
  const rig = new THREE.Group();
  const spin = new THREE.Group();
  rig.add(spin);
  scene.add(rig);

  // Soft floor shadow that follows the shoe.
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const uniforms = { uHue: { value: 0 }, uSat: { value: 1 } };
  const variants = {}; // name -> material
  let mesh = null;

  // Scroll-driven target state (written by GSAP), smoothed every frame.
  const state = {
    x: 0, y: 0, z: 0, scale: 1,
    rx: 0.18, ry: -0.6, rz: 0.05,
    opacity: 1, float: 1, shadow: 1,
  };
  const current = { ...state };

  // Pointer + drag spin.
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const drag = { active: false, enabled: false, lastX: 0, lastY: 0, vy: 0, vx: 0, ry: 0, rx: 0 };
  let idleSpin = 0;
  let zoom = 1, zoomTarget = 1;

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function bindDrag(el) {
    el.addEventListener('pointerdown', (e) => {
      if (!drag.enabled) return;
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.vy = dx * 0.012;
      drag.vx = dy * 0.008;
    });
    const end = () => { drag.active = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { zoomTarget = zoomTarget > 1 ? 1 : 1.45; });
  }

  // Fetch the glTF JSON + base64 geometry, rebuild a GLB in memory and parse it.
  // This avoids data: URIs, which sandboxed preview hosts can block.
  async function fetchModel() {
    const base = modelUrl.slice(0, modelUrl.lastIndexOf('/') + 1);
    const [json, b64] = await Promise.all([
      fetch(modelUrl).then((r) => { if (!r.ok) throw new Error(`model ${r.status}`); return r.json(); }),
      fetch(base + 'shoe-geometry.txt').then((r) => { if (!r.ok) throw new Error(`geometry ${r.status}`); return r.text(); }),
    ]);
    onProgress?.(0.4);
    const raw = atob(b64.trim());
    const bin = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
    let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jPad = (4 - (jsonBytes.length % 4)) % 4;
    const bPad = (4 - (bin.length % 4)) % 4;
    const jLen = jsonBytes.length + jPad;
    const bLen = bin.length + bPad;
    const glb = new Uint8Array(12 + 8 + jLen + 8 + bLen);
    const dv = new DataView(glb.buffer);
    dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, glb.length, true);
    dv.setUint32(12, jLen, true); dv.setUint32(16, 0x4e4f534a, true);
    glb.set(jsonBytes, 20); glb.fill(0x20, 20 + jsonBytes.length, 20 + jLen);
    const bo = 20 + jLen;
    dv.setUint32(bo, bLen, true); dv.setUint32(bo + 4, 0x004e4942, true);
    glb.set(bin, bo + 8);
    return { glb: glb.buffer, base };
  }

  const loader = new GLTFLoader();
  const ready = new Promise((resolve, reject) => {
    fetchModel().then(({ glb, base }) => loader.parse(
      glb,
      base,
      async (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => { if (o.isMesh) mesh = o; });
        // Scale to ~3.2 units long and centre.
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const s = 3.2 / size.x;
        root.scale.setScalar(s);
        const box2 = new THREE.Box3().setFromObject(root);
        const centre = box2.getCenter(new THREE.Vector3());
        root.position.sub(centre);
        spin.add(root);

        // Material variants from KHR_materials_variants.
        const json = gltf.parser.json;
        const names = json.extensions.KHR_materials_variants.variants.map((v) => v.name);
        const mappings = json.meshes[0].primitives[0].extensions.KHR_materials_variants.mappings;
        for (const m of mappings) {
          const mat = await gltf.parser.getDependency('material', m.material);
          addHueShift(mat, uniforms);
          for (const v of m.variants) variants[names[v]] = mat;
        }
        setVariant('midnight');
        onProgress?.(1);
        resolve();
      },
      reject
    )).catch(reject);
  });

  function setVariant(name) {
    if (mesh && variants[name]) mesh.material = variants[name];
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the shoe a sensible size on narrow screens.
    camera.fov = w / h < 0.8 ? 44 : 30;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const timer = new THREE.Timer();
  let running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    const k = 1 - Math.pow(0.0015, dt); // smoothing factor

    for (const key of Object.keys(state)) current[key] += (state[key] - current[key]) * k;
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;
    zoom += (zoomTarget - zoom) * k;

    // Drag inertia; idle spin only when the lab is active and the user isn't dragging.
    if (!drag.active) {
      drag.vy *= Math.pow(0.04, dt);
      drag.vx *= Math.pow(0.04, dt);
      if (drag.enabled) idleSpin += dt * 0.25;
    }
    drag.ry += drag.vy;
    drag.rx = THREE.MathUtils.clamp(drag.rx + drag.vx, -0.9, 0.9);
    if (!drag.enabled) {
      // Ease spin back to neutral outside the lab.
      drag.ry += (Math.round(drag.ry / (Math.PI * 2)) * Math.PI * 2 - drag.ry) * k * 0.5;
      drag.rx += (0 - drag.rx) * k;
      idleSpin += (Math.round(idleSpin / (Math.PI * 2)) * Math.PI * 2 - idleSpin) * k * 0.5;
    }

    const bob = Math.sin(t * 1.3) * 0.08 * current.float;
    rig.position.set(current.x, current.y + bob, current.z);
    rig.rotation.set(
      current.rx + pointer.sy * 0.12 * current.float,
      current.ry + pointer.sx * 0.25 * current.float,
      current.rz + Math.sin(t * 0.9) * 0.03 * current.float
    );
    rig.scale.setScalar(current.scale * zoom);
    spin.rotation.set(drag.rx, drag.ry + idleSpin, 0);

    shadow.position.set(current.x, current.y - 1.05 * current.scale - 0.25, current.z);
    shadow.scale.setScalar(current.scale * (1 - bob * 0.8));
    shadow.material.opacity = current.shadow * current.opacity * (0.8 - bob * 1.5);

    canvas.style.opacity = current.opacity.toFixed(3);
    if (current.opacity > 0.01) renderer.render(scene, camera);
  }
  frame();

  return {
    ready,
    state,
    uniforms,
    setVariant,
    bindDrag,
    setDragEnabled(on) { drag.enabled = on; if (!on) zoomTarget = 1; },
    worldHeight() { return 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; },
    zoomBy(f) { zoomTarget = THREE.MathUtils.clamp(zoomTarget * f, 0.8, 1.8); },
    renderer, scene, camera, rig, spin,
    snap() { Object.assign(current, state); },
    stop() { running = false; },
  };
}
