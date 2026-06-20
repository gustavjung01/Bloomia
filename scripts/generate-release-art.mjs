import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const root = process.cwd();
const iconDir = join(root, 'src-tauri', 'icons');
const installerDir = join(root, 'src-tauri', 'installer');
mkdirSync(iconDir, { recursive: true });
mkdirSync(installerDir, { recursive: true });

const colors = {
  ink: [41, 28, 43, 255],
  blush: [236, 94, 145, 255],
  blushLight: [255, 211, 226, 255],
  lavender: [179, 125, 206, 255],
  cream: [255, 250, 252, 255],
  gold: [255, 216, 106, 255],
  muted: [132, 94, 121, 255],
};

function rgba(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set(fill, i);
  return { w, h, data };
}

function blendPixel(img, x, y, color) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const idx = (y * img.w + x) * 4;
  const a = color[3] / 255;
  const ia = 1 - a;
  img.data[idx] = Math.round(color[0] * a + img.data[idx] * ia);
  img.data[idx + 1] = Math.round(color[1] * a + img.data[idx + 1] * ia);
  img.data[idx + 2] = Math.round(color[2] * a + img.data[idx + 2] * ia);
  img.data[idx + 3] = Math.round(255 * (a + (img.data[idx + 3] / 255) * ia));
}

function rect(img, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(img.w, x1); x++) blendPixel(img, x, y, color);
  }
}

function ellipse(img, cx, cy, rx, ry, color, angle = 0) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const minX = Math.floor(cx - Math.max(rx, ry) - 2);
  const maxX = Math.ceil(cx + Math.max(rx, ry) + 2);
  const minY = Math.floor(cy - Math.max(rx, ry) - 2);
  const maxY = Math.ceil(cy + Math.max(rx, ry) + 2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const v = (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry);
      if (v <= 1) blendPixel(img, x, y, color);
    }
  }
}

function roundedGradientSquare(img) {
  const pad = Math.round(img.w * 0.06);
  const radius = Math.round(img.w * 0.22);
  for (let y = pad; y < img.h - pad; y++) {
    for (let x = pad; x < img.w - pad; x++) {
      const left = x - pad, right = img.w - pad - 1 - x, top = y - pad, bottom = img.h - pad - 1 - y;
      const dx = Math.max(radius - Math.min(left, right), 0);
      const dy = Math.max(radius - Math.min(top, bottom), 0);
      if (dx * dx + dy * dy > radius * radius) continue;
      const t = (x + y) / (img.w + img.h);
      const c = colors.blushLight.map((v, i) => Math.round(v * (1 - t) + colors.lavender[i] * t));
      c[3] = 255;
      blendPixel(img, x, y, c);
    }
  }
}

function drawFlower(img, scale = 1, ox = 0, oy = 0) {
  const cx = ox + img.w * 0.5 * scale;
  const cy = oy + img.w * 0.5 * scale;
  const s = img.w * scale;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const px = cx + Math.cos(a) * s * 0.16;
    const py = cy + Math.sin(a) * s * 0.16;
    ellipse(img, px + 2, py + 2, s * 0.12, s * 0.19, [110, 60, 110, 42], a);
  }
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const px = cx + Math.cos(a) * s * 0.18;
    const py = cy + Math.sin(a) * s * 0.18;
    ellipse(img, px, py, s * 0.12, s * 0.2, colors.cream, a);
  }
  ellipse(img, cx, cy, s * 0.13, s * 0.13, colors.blush);
  ellipse(img, cx, cy, s * 0.055, s * 0.055, colors.gold);
}

function makeIcon(size) {
  const img = rgba(size, size);
  roundedGradientSquare(img);
  drawFlower(img);
  return img;
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function pngBuffer(img) {
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    for (let x = 0; x < img.w; x++) {
      const src = (y * img.w + x) * 4;
      const dst = y * (img.w * 4 + 1) + 1 + x * 4;
      raw[dst] = img.data[src]; raw[dst + 1] = img.data[src + 1]; raw[dst + 2] = img.data[src + 2]; raw[dst + 3] = img.data[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function bmpBuffer(img) {
  const row = Math.ceil((img.w * 3) / 4) * 4;
  const pixelSize = row * img.h;
  const fileSize = 54 + pixelSize;
  const b = Buffer.alloc(fileSize);
  b.write('BM', 0); b.writeUInt32LE(fileSize, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14);
  b.writeInt32LE(img.w, 18); b.writeInt32LE(img.h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(pixelSize, 34);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const src = ((img.h - 1 - y) * img.w + x) * 4;
    const dst = 54 + y * row + x * 3;
    b[dst] = img.data[src + 2]; b[dst + 1] = img.data[src + 1]; b[dst + 2] = img.data[src];
  }
  return b;
}

function icoBuffer(sizes) {
  const images = sizes.map((s) => ({ s, png: pngBuffer(makeIcon(s)) }));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((entry, i) => {
    const p = 6 + i * 16;
    header[p] = entry.s === 256 ? 0 : entry.s; header[p + 1] = entry.s === 256 ? 0 : entry.s; header[p + 2] = 0; header[p + 3] = 0;
    header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6); header.writeUInt32LE(entry.png.length, p + 8); header.writeUInt32LE(offset, p + 12);
    offset += entry.png.length;
  });
  return Buffer.concat([header, ...images.map((x) => x.png)]);
}

function makeInstallerHeader() {
  const img = rgba(150, 57, [255, 238, 244, 255]);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const t = (x / img.w) * 0.72 + (y / img.h) * 0.28;
    blendPixel(img, x, y, [255 * (1 - t) + 238 * t, 238 * (1 - t) + 222 * t, 244 * (1 - t) + 255 * t, 255]);
  }
  drawFlower(img, 0.26, 2, 4);
  return img;
}

function makeInstallerSidebar() {
  const img = rgba(164, 314, [255, 232, 241, 255]);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const t = (x / img.w) * 0.45 + (y / img.h) * 0.55;
    blendPixel(img, x, y, [255 * (1 - t) + 235 * t, 232 * (1 - t) + 226 * t, 241 * (1 - t) + 255 * t, 255]);
  }
  drawFlower(img, 0.36, 4, 12);
  drawFlower(img, 0.28, 72, 84);
  drawFlower(img, 0.22, 24, 190);
  rect(img, 18, 286, 146, 292, colors.blush);
  return img;
}

writeFileSync(join(iconDir, '32x32.png'), pngBuffer(makeIcon(32)));
writeFileSync(join(iconDir, '128x128.png'), pngBuffer(makeIcon(128)));
writeFileSync(join(iconDir, '128x128@2x.png'), pngBuffer(makeIcon(256)));
writeFileSync(join(iconDir, 'icon.png'), pngBuffer(makeIcon(512)));
writeFileSync(join(iconDir, 'icon.ico'), icoBuffer([16, 24, 32, 48, 64, 128, 256]));
writeFileSync(join(installerDir, 'installer-header.bmp'), bmpBuffer(makeInstallerHeader()));
writeFileSync(join(installerDir, 'installer-sidebar.bmp'), bmpBuffer(makeInstallerSidebar()));
console.log('Bloomia release art generated.');
