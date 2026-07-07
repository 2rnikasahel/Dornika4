/**
 * Generate placeholder JPEG images for the seed script.
 *
 * Uses `sharp` to render a solid-color JPEG with a simple label
 * (product name) overlaid via SVG. Output is written to
 * `/public/products/*.jpg` and `/public/slides/*.jpg`.
 *
 * Run with: `bun scripts/gen-images.ts`
 */

import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const PUB = join(process.cwd(), "public");
const PRODUCTS_DIR = join(PUB, "products");
const SLIDES_DIR = join(PUB, "slides");

interface ImgSpec {
  filename: string;
  width: number;
  height: number;
  bg: string;
  fg: string;
  label: string;
  sublabel?: string;
}

const PRODUCTS: ImgSpec[] = [
  { filename: "p1.jpg", width: 800, height: 800, bg: "#0b2136", fg: "#6cbccb", label: "پمپ صنعتی", sublabel: "Dornika P-100" },
  { filename: "p2.jpg", width: 800, height: 800, bg: "#124e5c", fg: "#f6f2e9", label: "شیر آلات برنجی", sublabel: "Dornika V-200" },
  { filename: "p3.jpg", width: 800, height: 800, bg: "#1a3a5c", fg: "#6cbccb", label: "لوله مسی", sublabel: "Dornika C-300" },
  { filename: "p4.jpg", width: 800, height: 800, bg: "#237d90", fg: "#f6f2e9", label: "کتری بویلر", sublabel: "Dornika B-400" },
  { filename: "p5.jpg", width: 800, height: 800, bg: "#05101d", fg: "#c9a227", label: "موتور گیربکسی", sublabel: "Dornika M-500" },
  { filename: "p6.jpg", width: 800, height: 800, bg: "#196374", fg: "#f6f2e9", label: "مبدل حرارتی", sublabel: "Dornika H-600" },
];

const SLIDES: ImgSpec[] = [
  { filename: "s1.jpg", width: 1600, height: 600, bg: "#0b2136", fg: "#6cbccb", label: "تأمین تخصصی تجهیزات صنعتی", sublabel: "Dornika Sahel" },
  { filename: "s2.jpg", width: 1600, height: 600, bg: "#124e5c", fg: "#f6f2e9", label: "دستیار هوش مصنوعی", sublabel: "AI-Powered B2B" },
  { filename: "s3.jpg", width: 1600, height: 600, bg: "#237d90", fg: "#05101d", label: "ارسال به سراسر ایران", sublabel: "Same-Day Tehran" },
];

function svgFor(spec: ImgSpec): Buffer {
  const { width, height, bg, fg, label, sublabel } = spec;
  const fontSize = Math.round(width / 14);
  const subSize = Math.round(width / 28);
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="${bg}" stop-opacity="0.85" />
        </linearGradient>
        <radialGradient id="r" cx="0.8" cy="0.2" r="0.8">
          <stop offset="0%" stop-color="${fg}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${fg}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)" />
      <rect width="${width}" height="${height}" fill="url(#r)" />
      <text x="50%" y="${sublabel ? "44%" : "50%}" font-family="Vazirmatn, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${label}</text>
      ${sublabel ? `<text x="50%" y="58%" font-family="monospace" font-size="${subSize}" fill="${fg}" fill-opacity="0.7" text-anchor="middle" dominant-baseline="middle">${sublabel}</text>` : ""}
    </svg>
  `);
}

async function writeImage(dir: string, spec: ImgSpec) {
  const svg = svgFor(spec);
  const jpg = await sharp(svg).jpeg({ quality: 82 }).toBuffer();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, spec.filename), jpg);
  console.log(`✓ wrote ${spec.filename}`);
}

async function main() {
  for (const p of PRODUCTS) await writeImage(PRODUCTS_DIR, p);
  for (const s of SLIDES) await writeImage(SLIDES_DIR, s);
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
