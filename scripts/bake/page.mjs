// Runs inside headless Chromium (see scripts/bake-minis.ts). Renders one model
// with three.js into a cropped WebP plus where its base centre and body sit in
// the image. Everything here must be deterministic: no clocks, no Math.random.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Camera elevation and azimuth, in degrees (D8). */
const ELEVATION = 38;
const AZIMUTH = 18;
/** Rendered at this many times the output size, then scaled down for clean edges. */
const SUPERSAMPLE = 3;
/** Alpha (0 to 255) at or above which a pixel counts as part of the silhouette. */
const SOLID = 128;

/** Base: a black bevelled disc with green flock on top, radius 1 (one model unit). */
const BASE_HEIGHT = 0.16;
const BASE_BLACK = "#1b1c1f";
const FLOCK = "#4b6130";
/** How dark terrain's shadow on the table is, 0 to 1. */
const TABLE_SHADOW = 0.42;

/** Small seeded PRNG, so the flock texture is the same on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function flockTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = FLOCK;
  g.fillRect(0, 0, size, size);
  const rand = mulberry32(7);
  const tones = ["#3a4f24", "#5c7438", "#6b7f3c", "#45582a", "#7a6a3e"];
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = tones[Math.floor(rand() * tones.length)];
    const r = 0.6 + rand() * 1.6;
    g.beginPath();
    g.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildBase() {
  const base = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: BASE_BLACK, roughness: 0.38, metalness: 0.05 });
  // A lathe profile: a slight bevel from the table up to the flock.
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.0, 0),
    new THREE.Vector2(1.0, BASE_HEIGHT * 0.55),
    new THREE.Vector2(0.95, BASE_HEIGHT),
    new THREE.Vector2(0, BASE_HEIGHT),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), black);
  body.castShadow = true;
  body.receiveShadow = true;
  base.add(body);
  const flock = new THREE.Mesh(
    new THREE.CircleGeometry(0.93, 64),
    new THREE.MeshStandardMaterial({ map: flockTexture(), roughness: 1, metalness: 0 }),
  );
  flock.rotation.x = -Math.PI / 2;
  flock.position.y = BASE_HEIGHT + 0.002;
  flock.receiveShadow = true;
  base.add(flock);
  return base;
}

/**
 * One painted set: every material becomes a matte standard material that keeps
 * its colour map, with colours pulled toward a slightly richer palette. Named
 * overrides from the sidecar (`colors`) recolour single materials, and
 * `primer` gives the whole model one flat colour, like an unpainted mini.
 */
function paint(root, { colors, primer }) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const painted = list.map((m) => {
      if (cache.has(m)) return cache.get(m);
      const color = m.color ? m.color.clone() : new THREE.Color("#ffffff");
      if (colors && m.name && colors[m.name]) color.set(colors[m.name]);
      if (primer) color.set(primer);
      const hsl = {};
      color.getHSL(hsl);
      color.setHSL(hsl.h, Math.min(1, hsl.s * 1.12), hsl.l);
      const metal = /metal|steel|iron|silver|gold|blade|sword|armou?r/i.test(m.name ?? "");
      const p = new THREE.MeshStandardMaterial({
        name: m.name,
        color,
        map: primer ? null : (m.map ?? null),
        emissive: m.emissive ?? new THREE.Color(0),
        emissiveMap: m.emissiveMap ?? null,
        emissiveIntensity: m.emissiveIntensity ?? 1,
        roughness: metal ? 0.42 : 0.72,
        metalness: metal ? 0.35 : 0.02,
        transparent: m.transparent,
        alphaTest: m.alphaTest,
        side: m.side,
        vertexColors: primer ? false : m.vertexColors,
        flatShading: false,
      });
      cache.set(m, p);
      return p;
    });
    o.material = Array.isArray(o.material) ? painted : painted[0];
  });
}

/** Where the key light comes from: the upper left of the picture. */
const KEY_LIGHT = new THREE.Vector3(-6, 10, 6);

/** The light rig. `reach` is how far from the origin, in model units, shadows must be cast. */
function lights(scene, reach) {
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2e2a24, 1.1));
  // Key light from the upper left of the picture, so the shading matches the
  // contact shadows on the map, which fall down and to the right.
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  const k = Math.max(1, reach / 4);
  key.position.copy(KEY_LIGHT).multiplyScalar(k);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4 * k, right: 4 * k, top: 4 * k, bottom: -4 * k, near: 0.5, far: 40 * k });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8d8ff, 0.6);
  rim.position.set(5, 4, -6);
  scene.add(rim);
}

const loader = new GLTFLoader();

function hideNodes(root, names) {
  for (const name of names ?? []) {
    root.traverse((o) => {
      if (o.name === name) o.visible = false;
    });
  }
}

/**
 * Loads a model. A figure (hero or monster) is posed and scaled onto its base;
 * terrain keeps the size it has in its source file, centred on its footprint.
 */
async function loadFigure(spec) {
  if (spec.parts) return compose(spec);
  const gltf = await loader.loadAsync(spec.url);
  const root = gltf.scene;
  hideNodes(root, spec.hide);
  const clips = gltf.animations ?? [];
  const wanted = spec.pose?.clip;
  const clip = wanted
    ? clips.find((c) => c.name === wanted)
    : clips.find((c) => /(^|\|)idle$/i.test(c.name)) ?? clips.find((c) => /idle/i.test(c.name));
  if (wanted && !clip) throw new Error(`no animation clip "${wanted}" (has: ${clips.map((c) => c.name).join(", ")})`);
  if (clip) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixer.setTime(spec.pose?.time ?? 0);
  }
  root.rotation.y = ((spec.rotate ?? 0) * Math.PI) / 180;
  root.updateMatrixWorld(true);
  paint(root, spec);

  const box = visibleBox(root);
  const size = box.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z);
  const height = spec.height ?? 2.2;
  const scale =
    spec.kind === "terrain" ? 1 : Math.min(height / size.y, (spec.footprint ?? 1.9) / footprint);
  const center = box.getCenter(new THREE.Vector3());
  const figure = new THREE.Group();
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.scale.setScalar(scale);
  figure.add(root);
  return figure;
}

/**
 * A piece put together from several models (`spec.parts`). Each part is
 * turned by `rotate` degrees, scaled by `scale`, centred on (`x`, `z`) and
 * stood with its lowest point at `y`, all in model units, with x to the right
 * and z toward the viewer. The piece's footprint centre is the origin.
 */
async function compose(spec) {
  const figure = new THREE.Group();
  for (const part of spec.parts) {
    const gltf = await loader.loadAsync(part.url);
    const root = gltf.scene;
    hideNodes(root, part.hide);
    root.rotation.y = ((part.rotate ?? 0) * Math.PI) / 180;
    root.scale.setScalar(part.scale ?? 1);
    paint(root, { colors: { ...spec.colors, ...part.colors }, primer: part.primer ?? spec.primer });
    const box = visibleBox(root);
    const center = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.position.set((part.x ?? 0) - center.x, (part.y ?? 0) - box.min.y, (part.z ?? 0) - center.z);
    holder.add(root);
    figure.add(holder);
  }
  return figure;
}

/** Bounding box of every visible mesh, with skinning applied. */
function visibleBox(root) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
    }
  });
  return box;
}

function camera() {
  const el = (ELEVATION * Math.PI) / 180;
  const az = (AZIMUTH * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.position.copy(dir.multiplyScalar(40));
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

function corners(box) {
  const out = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

/** Where the key light casts each point onto the table (y = 0). */
function castOnTable(points) {
  return points.map((p) => p.clone().sub(KEY_LIGHT.clone().multiplyScalar(p.y / KEY_LIGHT.y)));
}

/** Screen-plane bounds (camera space x and y) of `points`. */
function viewBounds(points, cam) {
  const out = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const inv = cam.matrixWorldInverse;
  for (const point of points) {
    const p = point.clone().applyMatrix4(inv);
    out.minX = Math.min(out.minX, p.x);
    out.maxX = Math.max(out.maxX, p.x);
    out.minY = Math.min(out.minY, p.y);
    out.maxY = Math.max(out.maxY, p.y);
  }
  return out;
}

/** An invisible table top that only shows the shadows cast on it, for terrain, which stands on the felt itself. */
function tableShadow() {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: TABLE_SHADOW }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  return plane;
}

let renderer = null;
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  return renderer;
}

/** Tight box of pixels with alpha >= threshold, or null when there are none. */
function alphaBox(ctx, w, h, threshold) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Renders the scene to a canvas `w` x `h` (output pixels), supersampled. */
function draw(scene, cam, w, h) {
  const r = getRenderer();
  r.setSize(w * SUPERSAMPLE, h * SUPERSAMPLE, false);
  r.render(scene, cam);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g = out.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(r.domElement, 0, 0, w, h);
  return { canvas: out, ctx: g };
}

/**
 * Bakes one model. `spec` is its sidecar JSON plus `url` and `pxPerUnit`
 * (output pixels per model unit). Returns the WebP as a data URL and the
 * geometry the map needs, all in model units (base radii):
 * - `width`, `height`: the image size;
 * - `anchor`: where the base centre (or the model's ground centre) sits, from the image's top-left;
 * - `body`: the box around the model itself (without the base), from the image's top-left.
 */
window.bake = async function bake(spec) {
  const scene = new THREE.Scene();
  const withBase = spec.base ?? spec.kind !== "terrain";
  const base = withBase ? buildBase() : null;
  if (base) scene.add(base);
  const figure = await loadFigure(spec);
  figure.position.y = withBase ? BASE_HEIGHT : 0;
  scene.add(figure);

  // A figure is framed with its base. Terrain is framed with the shadow it casts on the table.
  const box = visibleBox(scene);
  const points = withBase ? corners(box) : [...corners(box), ...castOnTable(corners(box))];
  const reach = Math.max(...points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z))));
  lights(scene, reach);
  const shadow = withBase ? null : tableShadow();
  if (shadow) scene.add(shadow);

  const cam = camera();
  const b = viewBounds(points, cam);
  const margin = 0.08;
  cam.left = b.minX - margin;
  cam.right = b.maxX + margin;
  cam.top = b.maxY + margin;
  cam.bottom = b.minY - margin;
  cam.updateProjectionMatrix();

  const ppu = spec.pxPerUnit;
  const w = Math.ceil((cam.right - cam.left) * ppu);
  const h = Math.ceil((cam.top - cam.bottom) * ppu);
  // Snap the frustum to whole output pixels, so the anchor maths is exact.
  cam.right = cam.left + w / ppu;
  cam.bottom = cam.top - h / ppu;
  cam.updateProjectionMatrix();

  const full = draw(scene, cam, w, h);
  const crop = alphaBox(full.ctx, w, h, 1) ?? { x: 0, y: 0, width: 1, height: 1 };

  // The body alone, for hit-testing: hide the base (or the table shadow) and measure the silhouette.
  if (base) base.visible = false;
  if (shadow) shadow.visible = false;
  const bodyPass = draw(scene, cam, w, h);
  const body = alphaBox(bodyPass.ctx, w, h, SOLID) ?? crop;

  const out = document.createElement("canvas");
  out.width = crop.width;
  out.height = crop.height;
  out.getContext("2d").drawImage(full.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  // Where the base centre (mid-height of the base) projects, in output pixels.
  const anchor3 = new THREE.Vector3(0, withBase ? BASE_HEIGHT / 2 : 0, 0).project(cam);
  const ax = ((anchor3.x + 1) / 2) * w - crop.x;
  const ay = ((1 - anchor3.y) / 2) * h - crop.y;

  const unit = (px) => Math.round((px / ppu) * 1000) / 1000;
  return {
    dataUrl: out.toDataURL("image/webp", spec.quality ?? 0.9),
    pixels: { width: crop.width, height: crop.height },
    width: unit(crop.width),
    height: unit(crop.height),
    anchor: { x: unit(ax), y: unit(ay) },
    body: {
      x: unit(body.x - crop.x),
      y: unit(body.y - crop.y),
      width: unit(body.width),
      height: unit(body.height),
    },
  };
};

window.bakeReady = true;
