import sharp from 'sharp';
import fs from 'fs';

async function removeBackground(inputPath, outputPath, isGrey = false) {
  console.log(`Processing ${inputPath} -> ${outputPath}...`);
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Create an RGBA buffer (4 channels)
  const rgba = Buffer.alloc(width * height * 4);

  // Background threshold settings
  // If isGrey (mountain bike): background is ~235-245 grey, floor shadow is ~215-228
  const minThreshold = isGrey ? 205 : 220;
  const maxThreshold = isGrey ? 225 : 242;

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;

    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    rgba[dstIdx] = r;
    rgba[dstIdx + 1] = g;
    rgba[dstIdx + 2] = b;

    // Check if pixel is background (near white or near grey with low saturation)
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const diff = maxVal - minVal;

    // Background is near white/grey and almost neutral (diff < 15)
    if (minVal >= minThreshold && diff < 16) {
      if (minVal >= maxThreshold) {
        // Completely transparent
        rgba[dstIdx + 3] = 0;
      } else {
        // Anti-aliased feathering between minThreshold and maxThreshold
        const factor = (minVal - minThreshold) / (maxThreshold - minThreshold);
        rgba[dstIdx + 3] = Math.round(255 * (1 - factor));
      }
    } else {
      // Solid foreground pixel (bicycle parts, frame, chain, tires, pedals)
      rgba[dstIdx + 3] = 255;
    }
  }

  await sharp(rgba, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`✅ Saved ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
}

async function run() {
  await removeBackground('public/bikes/city-clean.jpg', 'public/bikes/city-clean.png', false);
  await removeBackground('public/bikes/stepthru-clean.jpg', 'public/bikes/stepthru-clean.png', false);
  await removeBackground('public/bikes/commuter-clean.jpg', 'public/bikes/commuter-clean.png', false);
  await removeBackground('public/bikes/mountain-clean.jpg', 'public/bikes/mountain-clean.png', true);

  // Also make a transparent version for the featured bike in hero
  await removeBackground('public/bikes/mountain-clean.jpg', 'public/bikes/mountain-hero-clean.png', true);
}

run().catch(console.error);
