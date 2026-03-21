/**
 * Builds public/og-image.jpg — hero background (cover crop), dark overlay, centered love-saintted.
 * Run: npm run generate:og  (after hero-bg or love-saintted assets change)
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, "..", "public");

const W = 1200;
const H = 630;
const OVERLAY_ALPHA = 0.42;
const LOVE_WIDTH = 480;

const heroPath = join(pub, "hero-bg.png");
const lovePath = join(pub, "love-saintted.png");
const outPath = join(pub, "og-image.jpg");

const hero = await sharp(heroPath)
  .resize(W, H, { fit: "cover", position: "center" })
  .toBuffer();

const overlay = await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: OVERLAY_ALPHA },
  },
})
  .png()
  .toBuffer();

const loveBuf = await sharp(lovePath).resize({ width: LOVE_WIDTH }).toBuffer();

const { width: lw = 0, height: lh = 0 } = await sharp(loveBuf).metadata();

await sharp(hero)
  .composite([
    { input: overlay, top: 0, left: 0 },
    {
      input: loveBuf,
      left: Math.round((W - lw) / 2),
      top: Math.round((H - lh) / 2),
    },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(outPath);

console.log("Wrote", outPath);
