import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface ProcessedPhotoResult {
  imagePath: string; // High-res display path (~800px)
  thumbPath: string; // Micro thumbnail path (~150px)
}

/**
 * Optimizes an uploaded portrait image to WebP:
 * 1. Generates 800x800 high-res card photo (~50KB)
 * 2. Generates 150x150 micro thumbnail (~8KB)
 */
export async function processAndSavePhoto(
  buffer: Buffer,
  employeeId: string,
  subfolder: string = '2026'
): Promise<ProcessedPhotoResult> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  await fs.mkdir(uploadsDir, { recursive: true });

  const cleanId = employeeId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const filename = `${cleanId}_${timestamp}.webp`;
  const thumbFilename = `${cleanId}_${timestamp}_thumb.webp`;

  const fullImagePath = path.join(uploadsDir, filename);
  const fullThumbPath = path.join(uploadsDir, thumbFilename);

  // 1. Save standard high-res card portrait
  await sharp(buffer)
    .rotate() // auto-orient from EXIF
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toFile(fullImagePath);

  // 2. Save micro thumbnail for wheel segments and fast guest list
  await sharp(buffer)
    .rotate()
    .resize(150, 150, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 75, effort: 4 })
    .toFile(fullThumbPath);

  return {
    imagePath: `/uploads/${subfolder}/${filename}`,
    thumbPath: `/uploads/${subfolder}/${thumbFilename}`,
  };
}
