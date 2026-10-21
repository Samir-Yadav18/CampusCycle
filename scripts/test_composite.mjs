import sharp from 'sharp';

async function testAll() {
  const bikes = [
    { file: 'city-clean.png', color: '#D6F4F8', name: 'city' },
    { file: 'stepthru-clean.png', color: '#FFE4EF', name: 'stepthru' },
    { file: 'commuter-clean.png', color: '#EDE4FF', name: 'commuter' },
    { file: 'mountain-clean.png', color: '#E2F8EE', name: 'mountain' },
  ];

  for (const b of bikes) {
    const circleSvg = Buffer.from(`
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#FFFFFF"/>
        <circle cx="150" cy="150" r="120" fill="${b.color}"/>
      </svg>
    `);

    const bikeResized = await sharp(`public/bikes/${b.file}`)
      .resize(260, 190, { fit: 'inside' })
      .toBuffer();

    await sharp(circleSvg)
      .composite([{ input: bikeResized, top: 55, left: 20 }])
      .png()
      .toFile(`public/bikes/test_${b.name}_composite.png`);

    console.log(`Saved public/bikes/test_${b.name}_composite.png`);
  }
}

testAll().catch(console.error);
