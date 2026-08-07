import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });

function setPixel(png, x, y, r, g, b, a = 255) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function drawRoundedRect(png, x0, y0, x1, y1, radius, color) {
  const [r, g, b, a] = color;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = Math.min(x - x0, x1 - x);
      const dy = Math.min(y - y0, y1 - y);
      if (dx >= radius || dy >= radius) {
        setPixel(png, x, y, r, g, b, a);
        continue;
      }
      const cx = dx - radius;
      const cy = dy - radius;
      if (cx * cx + cy * cy <= radius * radius) {
        setPixel(png, x, y, r, g, b, a);
      }
    }
  }
}

function drawCircle(png, cx, cy, radius, color) {
  const [r, g, b, a] = color;
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2 && x >= 0 && y >= 0 && x < png.width && y < png.height) {
        setPixel(png, x, y, r, g, b, a);
      }
    }
  }
}

function createIcon(size, fileName) {
  const png = new PNG({ width: size, height: size });
  const teal = [15, 118, 110, 255];
  const white = [255, 255, 255, 255];

  // Background
  drawRoundedRect(png, 0, 0, size - 1, size - 1, Math.floor(size * 0.18), teal);

  // White circle
  drawCircle(png, Math.floor(size * 0.5), Math.floor(size * 0.5), Math.floor(size * 0.28), white);

  // Teal "wallet" block
  drawRoundedRect(
    png,
    Math.floor(size * 0.34),
    Math.floor(size * 0.34),
    Math.floor(size * 0.66),
    Math.floor(size * 0.66),
    Math.floor(size * 0.05),
    teal
  );

  // White horizontal bars
  drawRoundedRect(
    png,
    Math.floor(size * 0.40),
    Math.floor(size * 0.46),
    Math.floor(size * 0.60),
    Math.floor(size * 0.50),
    Math.floor(size * 0.02),
    white
  );
  drawRoundedRect(
    png,
    Math.floor(size * 0.40),
    Math.floor(size * 0.54),
    Math.floor(size * 0.54),
    Math.floor(size * 0.58),
    Math.floor(size * 0.02),
    white
  );

  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, PNG.sync.write(png));
}

createIcon(192, 'icon-192.png');
createIcon(512, 'icon-512.png');
createIcon(180, 'apple-touch-icon.png');

console.log('Generated icons at', outDir);
