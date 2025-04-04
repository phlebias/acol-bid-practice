const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo192.png');
const outputPath = path.join(__dirname, '../public/favicon.ico');

sharp(inputPath)
  .resize(32, 32)
  .toFile(outputPath)
  .then(() => console.log('Favicon generated successfully'))
  .catch(err => console.error('Error generating favicon:', err));