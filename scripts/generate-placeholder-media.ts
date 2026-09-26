/**
 * Generates tasteful, on-brand placeholder imagery (cinematic stage light,
 * bokeh, film grain and an abstract dhol silhouette) so the site looks finished
 * before real event photography is uploaded through the Media CMS.
 *
 *   npx tsx scripts/generate-placeholder-media.ts
 *
 * Output: public/media/samples/*.jpg  (+ public/og-default.jpg)
 * Replace these by uploading real media in Admin → Media.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "media", "samples");
mkdirSync(OUT, { recursive: true });

type Palette = { key: string; light: string; glow: string; accent: string };
const palettes: Palette[] = [
  { key: "gold", light: "#F2C77A", glow: "#D6A84B", accent: "#7A1F2B" },
  { key: "amber", light: "#FFB36B", glow: "#E0822F", accent: "#5B1320" },
  { key: "rose", light: "#F7B7A3", glow: "#B8485A", accent: "#3D0B14" },
  { key: "marigold", light: "#FFD27A", glow: "#F0A020", accent: "#6B1A12" },
  { key: "ember", light: "#FF9E7A", glow: "#C2412D", accent: "#2A0A0A" },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Abstract dhol: barrel body, two heads, rope lacing, two sticks. */
function dholSilhouette(cx: number, cy: number, w: number, tilt: number, color: string, opacity: number) {
  const h = w * 0.62;
  const rx = w * 0.13;
  const lacing = Array.from({ length: 9 }, (_, i) => {
    const x = cx - w / 2 + rx + ((w - 2 * rx) / 8) * i;
    const up = i % 2 === 0;
    return `${x},${cy + (up ? -h / 2 + 6 : h / 2 - 6)}`;
  }).join(" ");
  return `
  <g transform="rotate(${tilt} ${cx} ${cy})" opacity="${opacity}">
    <path d="M ${cx - w / 2} ${cy - h / 2} Q ${cx} ${cy - h / 2 - h * 0.12} ${cx + w / 2} ${cy - h / 2}
             L ${cx + w / 2} ${cy + h / 2} Q ${cx} ${cy + h / 2 + h * 0.12} ${cx - w / 2} ${cy + h / 2} Z"
          fill="#0b0b0b" stroke="${color}" stroke-opacity="0.55" stroke-width="3"/>
    <ellipse cx="${cx - w / 2}" cy="${cy}" rx="${rx}" ry="${h / 2}" fill="#141414" stroke="${color}" stroke-opacity="0.9" stroke-width="4"/>
    <ellipse cx="${cx + w / 2}" cy="${cy}" rx="${rx}" ry="${h / 2}" fill="#101010" stroke="${color}" stroke-opacity="0.6" stroke-width="4"/>
    <polyline points="${lacing}" fill="none" stroke="${color}" stroke-opacity="0.5" stroke-width="3"/>
    <line x1="${cx - w * 0.75}" y1="${cy - h * 1.1}" x2="${cx - w * 0.45}" y2="${cy - h * 0.2}" stroke="${color}" stroke-opacity="0.8" stroke-width="7" stroke-linecap="round"/>
    <path d="M ${cx + w * 0.8} ${cy - h * 1.0} Q ${cx + w * 0.62} ${cy - h * 0.55} ${cx + w * 0.52} ${cy - h * 0.1}" fill="none" stroke="${color}" stroke-opacity="0.8" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function sceneSvg(width: number, height: number, seed: number, palette: Palette, withDhol: boolean) {
  const r = rng(seed);
  const bokeh = Array.from({ length: 34 }, () => {
    const x = r() * width;
    const y = r() * height * 0.75;
    const rad = 6 + r() * (width * 0.06);
    const o = 0.05 + r() * 0.28;
    const c = r() > 0.75 ? palette.accent : r() > 0.4 ? palette.light : palette.glow;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${c}" opacity="${o.toFixed(2)}" filter="url(#soft)"/>`;
  }).join("");
  const petals = Array.from({ length: 26 }, () => {
    const x = r() * width;
    const y = r() * height * 0.85;
    const sz = 3 + r() * (width * 0.008);
    const rot = r() * 180;
    const c = r() > 0.5 ? palette.light : palette.glow;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(sz * 1.8).toFixed(1)}" height="${sz.toFixed(1)}" rx="${(sz / 2).toFixed(1)}" fill="${c}" opacity="${(0.35 + r() * 0.5).toFixed(2)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join("");
  const beamX = width * (0.2 + r() * 0.6);
  const beamAngle = -25 + r() * 50;
  const crowd = Array.from({ length: 14 }, (_, i) => {
    const x = (width / 13) * i + (r() - 0.5) * 40;
    const hh = height * (0.1 + r() * 0.08);
    const w = width * (0.07 + r() * 0.05);
    return `<ellipse cx="${x.toFixed(1)}" cy="${(height - hh * 0.2).toFixed(1)}" rx="${w.toFixed(1)}" ry="${hh.toFixed(1)}" fill="#030303"/>
            <circle cx="${x.toFixed(1)}" cy="${(height - hh * 1.15).toFixed(1)}" r="${(w * 0.42).toFixed(1)}" fill="#040404"/>`;
  }).join("");
  const dhol = withDhol
    ? dholSilhouette(width * (0.35 + r() * 0.3), height * (0.5 + r() * 0.12), width * (0.42 + r() * 0.12), -18 + r() * 36, palette.light, 0.95)
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="bg" cx="${(0.3 + r() * 0.4).toFixed(2)}" cy="0.35" r="0.9">
      <stop offset="0" stop-color="${palette.glow}" stop-opacity="${(0.35 + r() * 0.3).toFixed(2)}"/>
      <stop offset="0.45" stop-color="${palette.accent}" stop-opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>
      <stop offset="1" stop-color="#050505" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.light}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${palette.light}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050505" stop-opacity="0"/>
      <stop offset="0.6" stop-color="#050505" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#050505" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${(width * 0.012).toFixed(1)}"/></filter>
    <filter id="beamblur"><feGaussianBlur stdDeviation="${(width * 0.03).toFixed(1)}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="#050505"/>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g filter="url(#beamblur)" transform="rotate(${beamAngle.toFixed(1)} ${beamX.toFixed(1)} 0)">
    <polygon points="${beamX - width * 0.05},0 ${beamX + width * 0.05},0 ${beamX + width * 0.35},${height} ${beamX - width * 0.35},${height}" fill="url(#beam)"/>
  </g>
  <g filter="url(#beamblur)" opacity="0.6" transform="rotate(${(-beamAngle * 0.8).toFixed(1)} ${(width - beamX).toFixed(1)} 0)">
    <polygon points="${width - beamX - width * 0.03},0 ${width - beamX + width * 0.03},0 ${width - beamX + width * 0.22},${height} ${width - beamX - width * 0.22},${height}" fill="url(#beam)"/>
  </g>
  ${bokeh}
  ${petals}
  ${dhol}
  ${crowd}
  <rect width="100%" height="100%" fill="url(#fade)"/>
</svg>`;
}

async function grain(width: number, height: number, seed: number) {
  const r = rng(seed * 7 + 3);
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = Math.floor(r() * 255);
    buf[i * 4] = v;
    buf[i * 4 + 1] = v;
    buf[i * 4 + 2] = v;
    buf[i * 4 + 3] = 20;
  }
  return sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function render(name: string, width: number, height: number, seed: number, paletteIndex: number, withDhol = true) {
  const svg = sceneSvg(width, height, seed, palettes[paletteIndex % palettes.length], withDhol);
  const noise = await grain(width, height, seed);
  await sharp(Buffer.from(svg))
    .composite([{ input: noise, blend: "overlay" }])
    .jpeg({ quality: 78, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(path.join(OUT, `${name}.jpg`));
  console.log("✓", name);
}

async function main() {
  // Portrait 9:16 showcase tiles & detail media.
  const portraits = [
    "showcase-baraat-durham",
    "showcase-baraat-durham-2",
    "showcase-mehndi-cary",
    "showcase-reception-raleigh",
    "showcase-reception-raleigh-2",
    "showcase-sweet16-apex",
    "showcase-haldi-chapel-hill",
    "showcase-diwali-rtp",
    "showcase-baraat-raleigh",
    "showcase-50th-cary",
    "showcase-sangeet-morrisville",
    "showcase-sangeet-morrisville-2",
  ];
  let i = 0;
  for (const name of portraits) {
    await render(name, 720, 1280, 101 + i * 17, i, false);
    i++;
  }
  // 4:5 service & package imagery.
  const squares = [
    "service-solo", "service-duo", "service-baraat", "service-entrance", "service-mehndi",
    "service-birthday", "service-corporate", "service-dj", "service-truck", "service-sound",
    "pkg-baraat", "pkg-entrance", "pkg-weekend", "about-crew",
  ];
  for (const name of squares) {
    await render(name, 960, 1200, 503 + i * 13, i, false);
    i++;
  }
  // Landscape hero poster + OG image.
  await render("hero-poster", 1920, 1080, 9001, 0, false);
  await render("hero-poster-mobile", 900, 1600, 9002, 0, false);
  const og = sceneSvg(1200, 630, 4242, palettes[0], false);
  await sharp(Buffer.from(og)).jpeg({ quality: 82 }).toFile(path.join(process.cwd(), "public", "og-default.jpg"));
  console.log("✓ og-default");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
