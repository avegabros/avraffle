const sharp = require(process.env.NODE_PATH ? 'sharp' : 'c:/code/av-raffle/web/node_modules/sharp');
const path = require('path');
const fs = require('fs');

async function generateBrandedWheelIcon() {
  const rootDir = path.resolve(__dirname, '..');
  const wheelPath = path.join(rootDir, 'web/public/logo/app-icon-transparent.png');
  const logoPath = path.join(rootDir, 'web/public/logo/av-logo.png');

  // Center hub dimensions on 1024x1024 wheel
  // Wheel center is at (512, 512). Center hub circle radius is ~142px (diameter 284px)
  const badgeRadius = 140;
  const badgeDiameter = badgeRadius * 2;

  // 1. Vector Hub frame with gold bevel, white ring, and red center matching stage wheel
  const badgeSvg = Buffer.from(`
    <svg width="${badgeDiameter}" height="${badgeDiameter}" viewBox="0 0 ${badgeDiameter} ${badgeDiameter}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="hubShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.6" />
        </filter>
        <radialGradient id="goldRim" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#FFFBEB" />
          <stop offset="45%" stop-color="#F59E0B" />
          <stop offset="85%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#78350F" />
        </radialGradient>
      </defs>
      <circle cx="${badgeRadius}" cy="${badgeRadius}" r="${badgeRadius - 2}" fill="url(#goldRim)" filter="url(#hubShadow)" />
      <circle cx="${badgeRadius}" cy="${badgeRadius}" r="${badgeRadius - 8}" fill="#FFFFFF" />
      <circle cx="${badgeRadius}" cy="${badgeRadius}" r="${badgeRadius - 13}" fill="#E11D48" />
    </svg>
  `);

  // 2. Circular clipped AV Logo
  const innerLogoSize = Math.round((badgeRadius - 15) * 2);
  const circleMask = Buffer.from(`
    <svg width="${innerLogoSize}" height="${innerLogoSize}" viewBox="0 0 ${innerLogoSize} ${innerLogoSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${innerLogoSize / 2}" cy="${innerLogoSize / 2}" r="${innerLogoSize / 2}" fill="#FFFFFF" />
    </svg>
  `);

  const maskedLogo = await sharp(logoPath)
    .resize(innerLogoSize, innerLogoSize, { fit: 'cover' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const badgeBuffer = await sharp(badgeSvg)
    .composite([{ input: maskedLogo, top: 15, left: 15 }])
    .png()
    .toBuffer();

  // 3. Composite hub badge on the center of the 1024x1024 lucky wheel
  const left = 512 - badgeRadius;
  const top = 512 - badgeRadius;

  const brandedWheelBuffer = await sharp(wheelPath)
    .composite([{ input: badgeBuffer, top, left }])
    .png()
    .toBuffer();

  // Save the master transparent branded wheel icon
  const masterOut = path.join(rootDir, 'web/public/logo/app-icon-transparent.png');
  await sharp(brandedWheelBuffer).toFile(masterOut);
  console.log('Saved master branded icon to:', masterOut);

  // 4. Update Web Icons
  await sharp(brandedWheelBuffer).resize(512, 512).png().toFile(path.join(rootDir, 'web/public/logo/app-icon-512.png'));
  await sharp(brandedWheelBuffer).resize(512, 512).png().toFile(path.join(rootDir, 'web/public/logo/app-icon.png'));
  await sharp(brandedWheelBuffer).resize(192, 192).png().toFile(path.join(rootDir, 'web/public/logo/app-icon-192.png'));
  await sharp(brandedWheelBuffer).resize(180, 180).png().toFile(path.join(rootDir, 'web/public/apple-touch-icon.png'));
  await sharp(brandedWheelBuffer).resize(48, 48).png().toFile(path.join(rootDir, 'web/public/icon-48.png'));
  await sharp(brandedWheelBuffer).resize(32, 32).png().toFile(path.join(rootDir, 'web/public/favicon-32x32.png'));
  await sharp(brandedWheelBuffer).resize(16, 16).png().toFile(path.join(rootDir, 'web/public/favicon-16x16.png'));
  console.log('Updated all web icon variants.');

  // 5. Update Flutter App In-App Logo
  const flutterAssetLogo = path.join(rootDir, 'mobile/assets/logo/app_icon.png');
  await sharp(brandedWheelBuffer).resize(512, 512).png().toFile(flutterAssetLogo);
  console.log('Updated mobile/assets/logo/app_icon.png');

  // 6. Update Android Mipmap Icons
  const androidRes = [
    { dir: 'mobile/android/app/src/main/res/mipmap-mdpi', size: 48 },
    { dir: 'mobile/android/app/src/main/res/mipmap-hdpi', size: 72 },
    { dir: 'mobile/android/app/src/main/res/mipmap-xhdpi', size: 96 },
    { dir: 'mobile/android/app/src/main/res/mipmap-xxhdpi', size: 144 },
    { dir: 'mobile/android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
  ];

  for (const item of androidRes) {
    const dest = path.join(rootDir, item.dir, 'ic_launcher.png');
    await sharp(brandedWheelBuffer)
      .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest);
    console.log(`Updated Android launcher: ${dest} (${item.size}x${item.size})`);
  }

  // 7. Update Play Store 512x512 Store Listing Icon
  const playStoreDest = path.join(rootDir, 'play_store_assets/play_store_icon_512x512.png');
  await sharp(brandedWheelBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
    .png()
    .toFile(playStoreDest);
  console.log('Updated play_store_assets/play_store_icon_512x512.png');

  // 8. Update iOS Icons
  const iosSizes = [
    { name: 'Icon-App-20x20@1x.png', size: 20 },
    { name: 'Icon-App-20x20@2x.png', size: 40 },
    { name: 'Icon-App-20x20@3x.png', size: 60 },
    { name: 'Icon-App-29x29@1x.png', size: 29 },
    { name: 'Icon-App-29x29@2x.png', size: 58 },
    { name: 'Icon-App-29x29@3x.png', size: 87 },
    { name: 'Icon-App-40x40@1x.png', size: 40 },
    { name: 'Icon-App-40x40@2x.png', size: 80 },
    { name: 'Icon-App-40x40@3x.png', size: 120 },
    { name: 'Icon-App-60x60@2x.png', size: 120 },
    { name: 'Icon-App-60x60@3x.png', size: 180 },
    { name: 'Icon-App-76x76@1x.png', size: 76 },
    { name: 'Icon-App-76x76@2x.png', size: 152 },
    { name: 'Icon-App-83.5x83.5@2x.png', size: 167 },
    { name: 'Icon-App-1024x1024@1x.png', size: 1024 },
  ];

  const iosDir = path.join(rootDir, 'mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset');
  for (const item of iosSizes) {
    const dest = path.join(iosDir, item.name);
    await sharp(brandedWheelBuffer)
      .resize(item.size, item.size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .flatten({ background: { r: 15, g: 23, b: 42 } })
      .png()
      .toFile(dest);
  }
  console.log('Updated iOS app icons.');
}

generateBrandedWheelIcon().catch(console.error);
