import sharp from 'sharp';

async function inspect(imgName) {
  const { data, info } = await sharp(`public/bikes/${imgName}`)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Image ${imgName}: ${width}x${height}, channels: ${channels}`);

  // Sample corner pixels: top-left, top-right, bottom-left, bottom-right
  const getPixel = (x, y) => {
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  console.log('Top-left (10, 10):', getPixel(10, 10));
  console.log('Top-right (width - 10, 10):', getPixel(width - 10, 10));
  console.log('Center top (width / 2, 10):', getPixel(Math.floor(width / 2), 10));
  console.log('Bottom-left (10, height - 10):', getPixel(10, height - 10));
}

async function run() {
  await inspect('city-clean.jpg');
  await inspect('stepthru-clean.jpg');
  await inspect('commuter-clean.jpg');
  await inspect('mountain-clean.jpg');
}

run();
