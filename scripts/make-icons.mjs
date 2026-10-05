/**
 * Renders the app icons from app/icon.svg, and the link preview image from
 * the running app, with headless Chromium (Playwright, a dev dependency):
 *
 * - app/favicon.ico (16, 32 and 48 px), app/apple-icon.png (180 px), and
 *   public/icon-192.png and public/icon-512.png for the web manifest
 * - app/opengraph-image.jpg (1200 × 630): the example table with the name and
 *   what the game is for, taken from the app at the URL given (default
 *   http://localhost:3000; start `npm run dev` first). Skipped when the app
 *   isn't running.
 *
 * Usage: npm run make:icons [-- <url>]
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000";
/** Width of the table in the link preview image, laid on its right. */
const TABLE_WIDTH = 700;
const svg = await readFile("app/icon.svg", "utf8");
const browser = await chromium.launch();

async function png(size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  const out = await page.screenshot({ omitBackground: true });
  await page.close();
  return out;
}

/** An .ico holding PNG images, which every current browser reads. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
await writeFile("app/favicon.ico", ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(size) })))));
await writeFile("app/apple-icon.png", await png(180));
await writeFile("public/icon-192.png", await png(192));
await writeFile("public/icon-512.png", await png(512));
console.log("Icons written.");

const reachable = await fetch(url).then((r) => r.ok, () => false);
if (!reachable) {
  console.log(`No app at ${url}; link preview image not made. Start \`npm run dev\` and run again.`);
} else {
  // The table is taken narrower than the picture and laid on its right, so no figure sits under the text.
  const page = await browser.newPage({ viewport: { width: TABLE_WIDTH, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForTimeout(3000);
  // Only the table: hide the HUD (components/Hud.tsx), so the picture is the figures on the felt.
  await page.addStyleTag({ content: "div.pointer-events-none.fixed.inset-0.z-30 { visibility: hidden !important }" });
  await page.waitForTimeout(300);
  const table = (await page.screenshot()).toString("base64");
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Barlow:wght@500&display=swap" rel="stylesheet">
    <style>
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #141a0f; }
      .shot { position: absolute; top: 0; right: 0; bottom: 0; width: ${TABLE_WIDTH}px; background: url(data:image/png;base64,${table}); }
      .shade { position: absolute; inset: 0; background: linear-gradient(90deg, #141a0f 0%, #141a0f ${1200 - TABLE_WIDTH}px, rgba(20,26,15,0) ${1200 - TABLE_WIDTH + 160}px); }
      .text { position: absolute; left: 64px; top: 0; bottom: 0; width: ${1200 - TABLE_WIDTH - 40}px; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
      .mark { display: flex; align-items: center; gap: 18px; }
      .mark svg { width: 64px; height: 64px; flex: none; }
      h1 { margin: 0; font: 700 52px/1 Cinzel, Georgia, serif; letter-spacing: 0.12em; color: #d9b45f; text-transform: uppercase; }
      p { margin: 0; font: 500 28px/1.35 Barlow, sans-serif; color: #ece6d6; }
      small { font: 500 22px/1.4 Barlow, sans-serif; color: rgba(236,230,214,0.7); }
    </style>
    <div class="shot"></div><div class="shade"></div>
    <div class="text">
      <div class="mark">${svg}<h1>Initiative</h1></div>
      <p>Lay out your work as monsters and your team as heroes, and see at a glance who fights what.</p>
      <small>A planning playing game that stays in your browser.</small>
    </div>`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await writeFile("app/opengraph-image.jpg", await page.screenshot({ type: "jpeg", quality: 86 }));
  console.log("Link preview image written.");
}

await browser.close();
