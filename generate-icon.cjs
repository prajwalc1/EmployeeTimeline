const Jimp = require('jimp');
const { convert } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  try {
    // Create build directory if it doesn't exist
    if (!fs.existsSync('build')) {
      fs.mkdirSync('build');
    }

    // Create a new blank image with a dark blue background
    const image = await new Jimp(256, 256, 0x1e293bff);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    // Add text to the image
    await image.print(
      font,
      32,
      96,
      {
        text: 'ST',
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      },
      192
    );

    // Save as PNG first
    const pngPath = path.join(__dirname, 'build', 'icon.png');
    await image.writeAsync(pngPath);

    // Convert PNG to ICO
    const pngBuffer = fs.readFileSync(pngPath);
    const icoBuffer = await convert(pngBuffer);

    fs.writeFileSync(path.join(__dirname, 'build', 'default.ico'), icoBuffer);
    console.log('Icon generated successfully');
  } catch (error) {
    console.error('Error generating icon:', error);
    process.exit(1);
  }
}

generateIcon();