const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ogDir = path.join(__dirname, '../public/og');

async function convertSvgToPng() {
  const files = fs.readdirSync(ogDir).filter(f => f.endsWith('.svg'));

  console.log(`Converting ${files.length} SVG files to PNG...`);

  for (const file of files) {
    const svgPath = path.join(ogDir, file);
    const pngPath = path.join(ogDir, file.replace('.svg', '.png'));

    try {
      await sharp(svgPath)
        .resize(1200, 630)
        .png()
        .toFile(pngPath);

      console.log(`✓ ${file} -> ${file.replace('.svg', '.png')}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }

  console.log('Done!');
}

convertSvgToPng();
