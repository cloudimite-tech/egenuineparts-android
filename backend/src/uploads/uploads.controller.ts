import {
  BadRequestException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { createId } from '@paralleldrive/cuid2';
import { put } from '@vercel/blob';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { processProductImage } from './image-processing';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Simple per-user throttle so one account can't flood the disk.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const recent = new Map<string, number[]>();
function throttle(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    throw new HttpException('Too many uploads — please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
  hits.push(now);
  recent.set(userId, hits);
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // Keep the raw upload in memory only — it's never written to disk as-is.
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(@CurrentUser() user: JwtUser, @UploadedFile() file: any) {
    if (!file?.buffer?.length) throw new BadRequestException('No file received.');
    throttle(user.sub);
    const clean = await processProductImage(file.buffer);
    // Server-chosen random name — never the client's filename.
    const name = `${createId()}.jpg`;
    // On Vercel (or anywhere BLOB_READ_WRITE_TOKEN is set) photos go to Vercel
    // Blob storage, because serverless functions have no persistent disk.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`products/${name}`, clean, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return { url: blob.url };
    }
    await writeFile(join(UPLOADS_DIR, name), clean);
    return { url: `/uploads/${name}` };
  }
}
