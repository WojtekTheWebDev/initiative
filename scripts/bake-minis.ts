/*
 * Bakes 3D models into the images the map draws (D10). Dev only: the output is
 * committed, so neither `npm run dev` nor `npm run build` runs this.
 *
 *   npm run bake:minis                         # assets/minis -> public/minis
 *   npm run bake:terrain                       # assets/terrain -> public/terrain
 *   npm run bake:minis -- knight dragon        # only these ids (the manifest keeps the rest)
 *   npm run bake:terrain -- rock-0 camp-1      # the same, for terrain
 *
 * Every model is a sidecar `<id>.json` (see ModelSpec) with either a
 * `<id>.glb` next to it or a list of `parts` taken from `<src>/models/`. Each
 * is rendered with three.js in headless Chromium (Playwright), with the same
 * orthographic camera (38 degrees elevation, 18 degrees azimuth) and lighting,
 * into `<out>/<id>.webp` at PX_PER_WORLD_UNIT, plus an entry in
 * `<out>/manifest.json`. Rendering uses Chromium's software GL (SwiftShader),
 * so the same inputs give the same files on every run.
 */

import { readFile, readdir, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { HERO_BASE_RADIUS, MONSTER_BASE_RADIUS } from "../lib/map/rings";
import type { Size } from "../lib/types";

/** Output pixels per world unit: sharp at zoom 2 on a high-density screen. */
const PX_PER_WORLD_UNIT = 4;

/** One model in a piece put together from several (`ModelSpec.parts`). */
type Part = {
  /** File name in `<src>/models/`, without `.glb`. */
  model: string;
  /** Where the part's footprint centre stands, in model units: x to the right, z toward the viewer. */
  x?: number;
  z?: number;
  /** Height its lowest point stands at, in model units. Default 0, on the table. */
  y?: number;
  /** Turn around the vertical axis, in degrees. */
  rotate?: number;
  /** Model units per unit of the part's file. Default 1. */
  scale?: number;
  hide?: string[];
  /** Recolour by material name, on top of the piece's `colors`. */
  colors?: Record<string, string>;
  primer?: string;
};

/** The sidecar `<id>.json`, next to `<id>.glb` unless it lists `parts`. */
type ModelSpec = {
  /** Display name, e.g. in the hero form's picker. */
  name: string;
  kind: "hero" | "monster" | "terrain";
  /** Monsters only: the size this model stands for (D14). */
  size?: Size;
  /**
   * World units per model unit. Defaults to the base radius of the kind (and
   * size). Required for terrain, which keeps the size it has in its files (one
   * unit of the file is one model unit) rather than being fitted to a base.
   */
  radius?: number;
  /** Stand it on a round black flocked base. Default: true, except for terrain, which casts its shadow on the table instead. */
  base?: boolean;
  /** Heroes and monsters: target height in model units (base radii). Default 2.2. */
  height?: number;
  /** Heroes and monsters: widest footprint allowed, in model units. Default 1.9 (just inside the base). */
  footprint?: number;
  /** Put the piece together from these models, with no `<id>.glb`. Its footprint centre is the origin. */
  parts?: Part[];
  /** Turn around the vertical axis, in degrees, before baking. */
  rotate?: number;
  /** Rigged models: the clip and time (seconds) to pose. Default: a clip called "Idle", at 0. */
  pose?: { clip?: string; time?: number };
  /** Node names to hide (e.g. spare weapons in a character pack). */
  hide?: string[];
  /** Recolour by material name, e.g. `{ "Skin": "#6f8f3a" }`. */
  colors?: Record<string, string>;
  /** One flat colour for the whole model, like an unpainted mini in primer. */
  primer?: string;
  /** WebP quality, 0 to 1. Default 0.9. */
  quality?: number;
};

export type ManifestEntry = {
  name: string;
  kind: ModelSpec["kind"];
  size?: Size;
  /** Terrain only: world units per model unit. */
  radius?: number;
  /** Public URL of the image. */
  image: string;
  /** Image size in model units (base radii). */
  width: number;
  height: number;
  /** Where the base centre sits, in model units from the image's top-left. */
  anchor: { x: number; y: number };
  /** The model's silhouette without its base, in model units from the image's top-left. */
  body: { x: number; y: number; width: number; height: number };
};

const root = path.resolve(__dirname, "..");

/**
 * An optional `<src>/colors.json`: material colours by material name for
 * every model in the folder, so a pack's materials are painted once. A
 * sidecar's `colors`, and a part's, go on top.
 */
const PALETTE = "colors.json";

function args(argv: string[]) {
  let src = "assets/minis";
  let out = "public/minis";
  const only: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") src = argv[++i];
    else if (argv[i] === "--out") out = argv[++i];
    else only.push(argv[i]);
  }
  return { src: path.resolve(root, src), out: path.resolve(root, out), only };
}

function radiusOf(id: string, spec: ModelSpec): number {
  if (spec.radius !== undefined) return spec.radius;
  if (spec.kind === "hero") return HERO_BASE_RADIUS;
  if (spec.kind === "monster" && spec.size && spec.size in MONSTER_BASE_RADIUS) {
    return MONSTER_BASE_RADIUS[spec.size];
  }
  throw new Error(`${id}.json: needs "radius" (or kind "hero", or kind "monster" with a size)`);
}

/** The public URL prefix for files in `out`, which must be inside `public/`. */
function urlPrefix(out: string): string {
  const rel = path.relative(path.join(root, "public"), out);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`--out must be inside public/: ${out}`);
  return "/" + rel.split(path.sep).join("/") + "/";
}

const ORIGIN = "http://bake.invalid";
const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".glb": "model/gltf-binary",
  ".html": "text/html",
};

async function openPage(src: string): Promise<Page> {
  const browser = await chromium.launch({
    // Software GL, so the pictures don't depend on the machine's graphics card.
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  const three = path.join(root, "node_modules/three");
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    let file: string;
    if (url.pathname === "/") {
      return route.fulfill({ contentType: "text/html", body: PAGE_HTML });
    } else if (url.pathname.startsWith("/three/")) {
      file = path.join(three, url.pathname.slice("/three/".length));
    } else if (url.pathname === "/page.mjs") {
      file = path.join(root, "scripts/bake/page.mjs");
    } else if (url.pathname.startsWith("/models/")) {
      file = path.join(src, decodeURIComponent(url.pathname.slice("/models/".length)));
    } else {
      return route.fulfill({ status: 404, body: "not found" });
    }
    try {
      const body = await readFile(file);
      return route.fulfill({ body, contentType: MIME[path.extname(file)] ?? "application/octet-stream" });
    } catch {
      return route.fulfill({ status: 404, body: "not found" });
    }
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => (window as unknown as { bakeReady?: boolean }).bakeReady === true);
  return page;
}

const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module" src="/page.mjs"></script></head><body></body></html>`;

type BakeResult = Omit<ManifestEntry, "name" | "kind" | "size" | "image"> & { dataUrl: string };

async function main() {
  const { src, out, only } = args(process.argv.slice(2));
  const prefix = urlPrefix(out);
  const ids = (await readdir(src))
    .filter((f) => f.endsWith(".json") && f !== PALETTE)
    .map((f) => f.slice(0, -".json".length))
    .sort();
  if (ids.length === 0) throw new Error(`no <id>.json sidecars in ${src}`);
  for (const id of only) if (!ids.includes(id)) throw new Error(`no ${id}.json in ${src}`);

  await mkdir(out, { recursive: true });
  const manifestPath = path.join(out, "manifest.json");
  const previous: Record<string, ManifestEntry> =
    only.length > 0 ? JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}")) : {};

  const palette: Record<string, string> = JSON.parse(
    await readFile(path.join(src, PALETTE), "utf8").catch(() => "{}"),
  );
  const page = await openPage(src);
  const manifest: Record<string, ManifestEntry> = {};
  try {
    for (const id of ids) {
      const spec = JSON.parse(await readFile(path.join(src, `${id}.json`), "utf8")) as ModelSpec;
      spec.colors = { ...palette, ...spec.colors };
      if (only.length > 0 && !only.includes(id)) {
        if (previous[id]) manifest[id] = previous[id];
        continue;
      }
      const radius = radiusOf(id, spec);
      const result = (await page.evaluate(
        (s) => (window as unknown as { bake: (s: unknown) => Promise<unknown> }).bake(s),
        {
          ...spec,
          url: `/models/${encodeURIComponent(id)}.glb`,
          parts: spec.parts?.map((p) => ({ ...p, url: `/models/models/${encodeURIComponent(p.model)}.glb` })),
          pxPerUnit: PX_PER_WORLD_UNIT * radius,
        },
      )) as BakeResult;
      const { dataUrl, ...geometry } = result;
      await writeFile(path.join(out, `${id}.webp`), Buffer.from(dataUrl.split(",")[1], "base64"));
      manifest[id] = {
        name: spec.name,
        kind: spec.kind,
        ...(spec.size ? { size: spec.size } : {}),
        ...(spec.kind === "terrain" ? { radius } : {}),
        image: `${prefix}${id}.webp`,
        width: geometry.width,
        height: geometry.height,
        anchor: geometry.anchor,
        body: geometry.body,
      };
      console.log(`baked ${id}`);
    }
  } finally {
    await page.context().browser()?.close();
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // Images whose model is gone.
  for (const f of await readdir(out)) {
    if (f.endsWith(".webp") && !(f.slice(0, -".webp".length) in manifest)) await unlink(path.join(out, f));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
