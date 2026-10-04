import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

// Every uploaded photo is decoded and re-encoded from scratch — the same
// idea big platforms use:
//  • proves it's a real image (sharp rejects anything it can't decode,
//    whatever the filename or claimed content-type says)
//  • strips ALL metadata — EXIF, GPS location, camera serials, embedded
//    thumbnails — because we never call .withMetadata()
//  • discards anything smuggled in the file (scripts, trailing payloads),
//    since only decoded pixels are written back out
//  • bakes in phone rotation, caps size, and normalises to JPEG
const MAX_EDGE = 1600;
const MIN_EDGE = 200;
const MAX_INPUT_PIXELS = 40_000_000; // ~40 MP; blocks "decompression bomb" images

export async function processProductImage(input: Buffer): Promise<Buffer> {
  let img: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    img = sharp(input, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS });
    meta = await img.metadata();
  } catch {
    throw new BadRequestException('That file isn’t a valid image.');
  }
  if (!meta.format || !['jpeg', 'png', 'webp', 'heif', 'avif', 'tiff'].includes(meta.format)) {
    throw new BadRequestException('Only JPEG, PNG, WebP or HEIC photos are allowed.');
  }
  if ((meta.width ?? 0) < MIN_EDGE || (meta.height ?? 0) < MIN_EDGE) {
    throw new BadRequestException(`Photo is too small — use at least ${MIN_EDGE}×${MIN_EDGE} pixels.`);
  }
  try {
    return await img
      .rotate() // apply EXIF orientation before the EXIF is dropped
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // transparent PNGs → white, JPEG has no alpha
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new BadRequestException('That image couldn’t be processed.');
  }
}
