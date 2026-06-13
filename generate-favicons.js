const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public', 'main-assets', 'logo-no-background.png');
const outDir = path.join(__dirname, 'public', 'favicon');

async function resize(name, size) {
  await sharp(input).resize(size, size).png().toFile(path.join(outDir, name));
  console.log(`Created ${name} (${size}x${size})`);
}

async function main() {
  await Promise.all([
    resize('icon-512.png', 512),
    resize('icon-192.png', 192),
    resize('apple-touch-icon.png', 180),
    resize('icon-128.png', 128),
    resize('favicon-64.png', 64),
    resize('favicon-48.png', 48),
    resize('favicon-32.png', 32),
    resize('favicon-16.png', 16),
  ]);

  // Favicon.ico (multi-size)
  await sharp(input).resize(64, 64).toFile(path.join(outDir, 'icon-64.png'));
  console.log('Done! Generated all favicons from Speedly logo.');
}

main().catch(console.error);
