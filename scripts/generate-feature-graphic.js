const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createFeatureGraphic() {
  const width = 1024;
  const height = 500;

  const bgPath = path.resolve('public/logo/background.jpg');
  const logoPath = path.resolve('public/logo/logo.jpg');
  const outDir = path.resolve('../play_store_assets');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Process background image: fill 1024x500 with contrast
  const bg = await sharp(bgPath)
    .resize(width, height, { fit: 'cover' })
    .modulate({ brightness: 0.6, saturation: 1.1 })
    .toBuffer();

  // 2. Process Avega Logo (top-right card)
  const logo = await sharp(logoPath)
    .resize({ height: 110, fit: 'inside' })
    .png()
    .toBuffer();

  // 3. Render clean SVG vector graphics & typography
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#020617;stop-opacity:0.92" />
          <stop offset="55%" style="stop-color:#020617;stop-opacity:0.80" />
          <stop offset="100%" style="stop-color:#020617;stop-opacity:0.35" />
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F59E0B" />
          <stop offset="50%" style="stop-color:#FBBF24" />
          <stop offset="100%" style="stop-color:#F59E0B" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- Vignette / dark overlay -->
      <rect width="${width}" height="${height}" fill="url(#grad1)" />

      <!-- Edition Pill Badge -->
      <g transform="translate(70, 65)">
        <rect width="180" height="32" rx="16" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1.5" />
        <text x="90" y="21" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="12" fill="#FBBF24" text-anchor="middle" letter-spacing="1.5">OFFICIAL 2026 EDITION</text>
      </g>

      <!-- App Title -->
      <text x="70" y="160" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="52" fill="#FFFFFF" filter="url(#shadow)" letter-spacing="1">
        AV-RAFFLE
      </text>

      <text x="70" y="208" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="26" fill="url(#gold)" filter="url(#shadow)">
        ENTERPRISE EVENT COMPANION
      </text>

      <!-- Key Features List -->
      <g transform="translate(70, 255)" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold">
        <circle cx="8" cy="8" r="6" fill="#10B981" />
        <text x="26" y="13" fill="#E2E8F0">Emcee Remote Wheel Spin with Claim Lock</text>

        <circle cx="8" cy="42" r="6" fill="#F59E0B" />
        <text x="26" y="47" fill="#E2E8F0">Registration Desk Attendance &amp; Mugshot Capture</text>

        <circle cx="8" cy="76" r="6" fill="#EF4444" />
        <text x="26" y="81" fill="#E2E8F0">Real-Time Prize Cataloging for Tayud &amp; Makati</text>
      </g>

      <!-- Company Footer Line -->
      <text x="70" y="415" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13" fill="#94A3B8" letter-spacing="1">
        AVEGA BROS INTEGRATED LOGISTICS, INC.
      </text>
    </svg>
  `);

  const pngOutPath = path.join(outDir, 'feature_graphic_1024x500.png');
  const jpgOutPath = path.join(outDir, 'feature_graphic_1024x500.jpg');

  await sharp(bg)
    .composite([
      { input: svgOverlay, top: 0, left: 0 },
      { input: logo, top: 55, left: 690 },
    ])
    .png({ quality: 100 })
    .toFile(pngOutPath);

  await sharp(pngOutPath)
    .jpeg({ quality: 95 })
    .toFile(jpgOutPath);

  // Also create 512x512 high-res Play Store App Icon
  const avLogoPath = path.resolve('public/logo/av-logo.jpg');
  const iconOutPath = path.join(outDir, 'play_store_icon_512x512.png');
  await sharp(avLogoPath)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(iconOutPath);

  console.log('Successfully generated Play Store assets:');
  console.log('1. Feature Graphic (PNG):', pngOutPath);
  console.log('2. Feature Graphic (JPG):', jpgOutPath);
  console.log('3. Play Store Icon 512x512:', iconOutPath);
}

createFeatureGraphic().catch(console.error);
