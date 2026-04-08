import fs from "fs";
import path from "path";

const width = 1600;
const height = 1000;
const spacing = 14;

let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function generateField(config: {
  centerX: number;
  centerY: number;
  maxDist: number;
  dotScale: number;
  opacityScale: number;
  seed: number;
  filename: string;
}) {
  seed = config.seed;
  let circles = "";
  let count = 0;

  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      const dx = x - config.centerX;
      const dy = y - config.centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let intensity = 1 - distance / config.maxDist;
      if (intensity <= 0) continue;

      intensity = Math.pow(intensity, 1.4);

      const r = (0.5 + intensity * config.dotScale).toFixed(2);
      const opacity = (0.12 + intensity * 0.75 * config.opacityScale).toFixed(3);

      const jx = (x + (seededRandom() - 0.5) * 2).toFixed(1);
      const jy = (y + (seededRandom() - 0.5) * 2).toFixed(1);

      circles += `<circle cx="${jx}" cy="${jy}" r="${r}" fill="#3D5A9E" opacity="${opacity}"/>\n`;
      count++;
    }
  }

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n${circles}</svg>`;
  const outPath = path.join(process.cwd(), "public", config.filename);
  fs.writeFileSync(outPath, svg);
  console.log(`Generated ${config.filename} (${count} dots)`);
}

// Bottom-left — primary dense halftone cluster
generateField({
  centerX: width * 0.05,
  centerY: height * 1.1,
  maxDist: 900,
  dotScale: 4.0,
  opacityScale: 1,
  seed: 42,
  filename: "bg-dot-left.svg",
});

// Right — secondary cluster
generateField({
  centerX: width * 0.98,
  centerY: height * 0.6,
  maxDist: 750,
  dotScale: 3.5,
  opacityScale: 0.7,
  seed: 137,
  filename: "bg-dot-right.svg",
});
