// Generate transparent cutouts of the phone/tablet device mockups.
// Uses a flood-fill from image edges to remove the near-white/light-gray
// background while preserving the device, screen content, and shadow.
import fs from "fs";
import path from "path";
import sharp from "sharp";

const baseDir = "public/media/inspection-trac";

const inputs = [
  { name: "device-phone", ext: "png" },
  { name: "device-tablet", ext: "png" },
];

const EDGE_MARGIN = 40; // px border treated as background samples
const BG_THRESHOLD = 58; // distance from sampled bg color considered background
const FEATHER_LOW = 12;
const FEATHER_HIGH = 58;

async function processFile({ name, ext }) {
  const inputPath = path.join(baseDir, `${name}.${ext}`);
  const pngOut = path.join(baseDir, `${name}-cutout.png`);
  const webpOut = path.join(baseDir, `${name}-cutout.webp`);

  console.log(`Processing ${inputPath} ...`);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;
  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // Sample edge pixels to approximate the background color.
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const addSample = (x, y) => {
    const i = (y * width + x) * 4;
    rSum += rgba[i];
    gSum += rgba[i + 1];
    bSum += rgba[i + 2];
    count++;
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < Math.min(EDGE_MARGIN, height); y++) addSample(x, y);
    for (let y = Math.max(height - EDGE_MARGIN, 0); y < height; y++) addSample(x, y);
  }
  for (let y = EDGE_MARGIN; y < Math.max(height - EDGE_MARGIN, EDGE_MARGIN); y++) {
    for (let x = 0; x < Math.min(EDGE_MARGIN, width); x++) addSample(x, y);
    for (let x = Math.max(width - EDGE_MARGIN, 0); x < width; x++) addSample(x, y);
  }
  const bgR = rSum / count;
  const bgG = gSum / count;
  const bgB = bSum / count;
  console.log(`  Sampled background RGB: ${Math.round(bgR)},${Math.round(bgG)},${Math.round(bgB)} (${count} pixels)`);

  const distance = (i) => {
    const dr = rgba[i] - bgR;
    const dg = rgba[i + 1] - bgG;
    const db = rgba[i + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const isBg = new Uint8Array(total);
  const distances = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dist = distance(idx * 4);
      distances[idx] = dist;
      if (dist <= BG_THRESHOLD) {
        isBg[idx] = 1;
      }
    }
  }

  // Flood fill from all edge pixels that look like background.
  const visited = new Uint8Array(total);
  const queue = [];
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x + (height - 1) * width, 0);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width, 0);
    queue.push(y * width + (width - 1), 0);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    if (visited[idx] || !isBg[idx]) continue;
    visited[idx] = 1;
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }

  // Visited pixels are background; make them fully transparent.
  let removed = 0;
  for (let idx = 0; idx < total; idx++) {
    if (visited[idx]) {
      rgba[idx * 4 + 3] = 0;
      removed++;
    }
  }

  // Remove tiny isolated noise speckles that survived as foreground islands.
  const foreground = new Uint8Array(total);
  for (let idx = 0; idx < total; idx++) {
    if (!visited[idx]) {
      foreground[idx] = 1;
    }
  }
  const seen = new Uint8Array(total);
  const stack = [];
  let largestSize = 0;
  let largestLabel = 0;
  let currentLabel = 0;
  const labels = new Int32Array(total);
  const sizes = [];
  for (let idx = 0; idx < total; idx++) {
    if (!foreground[idx] || seen[idx]) continue;
    currentLabel++;
    let size = 0;
    seen[idx] = 1;
    labels[idx] = currentLabel;
    stack.length = 0;
    stack.push(idx);
    while (stack.length > 0) {
      const cur = stack.pop();
      size++;
      const x = cur % width;
      const y = (cur / width) | 0;
      const push = (next) => {
        if (next >= 0 && next < total && foreground[next] && !seen[next]) {
          seen[next] = 1;
          labels[next] = currentLabel;
          stack.push(next);
        }
      };
      if (x > 0) push(cur - 1);
      if (x < width - 1) push(cur + 1);
      if (y > 0) push(cur - width);
      if (y < height - 1) push(cur + width);
    }
    sizes[currentLabel] = size;
    if (size > largestSize) {
      largestSize = size;
      largestLabel = currentLabel;
    }
  }

  // Keep only the largest foreground component (device + its shadow); discard noise.
  let speckles = 0;
  for (let idx = 0; idx < total; idx++) {
    const label = labels[idx];
    if (foreground[idx] && label !== largestLabel) {
      rgba[idx * 4 + 3] = 0;
      speckles++;
    }
  }

  console.log(`  Removed ~${removed} background pixels (${((removed / total) * 100).toFixed(1)}%), ${speckles} noise speckles`);

  const outBuffer = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  await sharp(outBuffer, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, effort: 9 })
    .toFile(pngOut);

  await sharp(outBuffer, { raw: { width, height, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100, lossless: false })
    .toFile(webpOut);

  const pngStat = fs.statSync(pngOut);
  const webpStat = fs.statSync(webpOut);
  console.log(`  -> ${pngOut} (${(pngStat.size / 1024).toFixed(1)} KB)`);
  console.log(`  -> ${webpOut} (${(webpStat.size / 1024).toFixed(1)} KB)`);
}

(async () => {
  for (const item of inputs) {
    try {
      await processFile(item);
    } catch (error) {
      console.error(`Failed to process ${item.name}:`, error);
      process.exitCode = 1;
    }
  }
})();
