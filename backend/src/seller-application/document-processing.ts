import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

// Verification files: BR certificate / NIC (photo or PDF) and the shop selfie (photo only).
// Vercel caps request bodies at 4.5 MB, so the app keeps files under 4 MB.
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

function isPdf(buf: Buffer) {
  return buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

export async function processBusinessDocument(buf: Buffer, originalName = 'document', opts: { allowPdf?: boolean } = {}) {
  const allowPdf = opts.allowPdf ?? true;
  if (!buf?.length) throw new BadRequestException('No file received.');
  if (buf.length > MAX_DOCUMENT_BYTES) throw new BadRequestException('File is too large (max 4 MB).');

  if (isPdf(buf)) {
    if (!allowPdf) throw new BadRequestException('Please upload a photo for this step.');
    // Kept as-is (never executed or rendered server-side). Reject PDFs that
    // carry JavaScript or auto-run actions — a BR certificate never needs them.
    const head = buf.toString('latin1');
    if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(head)) {
      throw new BadRequestException('This PDF contains scripts or attachments. Please upload a plain scan or photo.');
    }
    return { data: buf, mimeType: 'application/pdf', fileName: safeName(originalName, 'pdf') };
  }

  // Anything else must decode as an image; it's re-encoded to a clean JPEG
  // (strips EXIF/GPS, defeats polyglot files) at a size that stays readable.
  let out: Buffer;
  try {
    out = await sharp(buf, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new BadRequestException(allowPdf ? 'Upload a photo (JPG/PNG) or a PDF.' : 'Upload a photo (JPG/PNG).');
  }
  return { data: out, mimeType: 'image/jpeg', fileName: safeName(originalName, 'jpg') };
}

function safeName(name: string, ext: string) {
  const base = (name.split(/[\\/]/).pop() || 'document').replace(/\.[^.]+$/, '');
  const clean = base.replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 60) || 'document';
  return `${clean}.${ext}`;
}
