// Writes the seamless felt textures in public/terrain/. Run with `npm run make:felt`.
//
// Both tiles are grey light and shade on a transparent background, so the table
// can lay them over any biome colour:
// - felt-nap.png: fine fibres lying in every direction, the nap of the cloth.
// - felt-mottle.png: soft, uneven dye at a much larger scale, so the repeat of
//   the nap tile never shows.
//
// Every step wraps around the tile's edges, so the tiles repeat without seams.
// The output is deterministic and committed; nothing runs at build time.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "terrain");

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box blur with wrap-around, in place. */
function blur(buf, size, radius) {
  const tmp = new Float32Array(buf.length);
  const n = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += buf[y * size + ((x + k + size) % size)];
      tmp[y * size + x] = s / n;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += tmp[((y + k + size) % size) * size + x];
      buf[y * size + x] = s / n;
    }
  }
}

function normalise(buf) {
  let mean = 0;
  for (const v of buf) mean += v;
  mean /= buf.length;
  let dev = 0;
  for (const v of buf) dev += (v - mean) ** 2;
  dev = Math.sqrt(dev / buf.length) || 1;
  for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] - mean) / dev;
}

/** Signed values (about -1..1) to RGBA: light as warm white, shade as black, strength as alpha. */
function toRgba(buf, light, shade) {
  const out = new Uint8Array(buf.length * 4);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    if (v >= 0) {
      out.set([255, 246, 220, Math.round(v * light * 255)], i * 4);
    } else {
      out.set([0, 0, 0, Math.round(-v * shade * 255)], i * 4);
    }
  }
  return out;
}

function nap(size) {
  const rand = rng(1871);
  const buf = new Float32Array(size * size);
  // Grain: per-pixel noise, softened a little.
  for (let i = 0; i < buf.length; i++) buf[i] = rand() - 0.5;
  blur(buf, size, 1);
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.9;
  // Fibres: short, slightly curved strokes, light or dark, drawn with wrap-around.
  for (let f = 0; f < size * 12; f++) {
    let x = rand() * size;
    let y = rand() * size;
    let a = rand() * Math.PI * 2;
    const len = 3 + rand() * 7;
    const tone = (rand() < 0.55 ? 1 : -1) * (0.25 + rand() * 0.5);
    const bend = (rand() - 0.5) * 0.25;
    for (let s = 0; s < len; s += 0.5) {
      const px = ((Math.floor(x) % size) + size) % size;
      const py = ((Math.floor(y) % size) + size) % size;
      buf[py * size + px] += tone * 0.45;
      x += Math.cos(a) * 0.5;
      y += Math.sin(a) * 0.5;
      a += bend * 0.5;
    }
  }
  normalise(buf);
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.4;
  return toRgba(buf, 0.3, 0.38);
}

function mottle(size) {
  const rand = rng(5309);
  // Periodic value noise: a lattice that wraps, smoothly interpolated, in three octaves.
  const buf = new Float32Array(size * size);
  for (const [cells, amp] of [[4, 1], [8, 0.55], [16, 0.3]]) {
    const lattice = Array.from({ length: cells * cells }, () => rand());
    const at = (i, j) => lattice[((j + cells) % cells) * cells + ((i + cells) % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const i = Math.floor(gx);
        const j = Math.floor(gy);
        const u = (gx - i) ** 2 * (3 - 2 * (gx - i));
        const v = (gy - j) ** 2 * (3 - 2 * (gy - j));
        const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
        const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
        buf[y * size + x] += (top + (bottom - top) * v) * amp;
      }
    }
  }
  normalise(buf);
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.5;
  return toRgba(buf, 0.16, 0.22);
}

/* PNG writer (RGBA, 8 bits per channel). */

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "felt-nap.png"), png(256, nap(256)));
writeFileSync(path.join(OUT, "felt-mottle.png"), png(256, mottle(256)));
console.log(`Wrote felt-nap.png and felt-mottle.png to ${path.relative(process.cwd(), OUT)}`);
