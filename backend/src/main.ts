import 'reflect-metadata';
import 'dotenv/config';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './uploads/uploads.controller';
import { ensureFreshRate } from './products/pricing';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api', {
    // Public share pages + Android App Links file live at the site root.
    exclude: [
      { path: 'p/:id', method: RequestMethod.GET },
      { path: 's/:slug', method: RequestMethod.GET },
      { path: '.well-known/assetlinks.json', method: RequestMethod.GET },
    ],
  });

  // Keep the USD→LKR rate fresh. Only the first request after a cold start
  // (or every 6h) waits for the fetch; everything else uses the cached rate.
  ensureFreshRate();
  app.use((_req: unknown, _res: unknown, next: () => void) => {
    ensureFreshRate().finally(next);
  });

  // Product photos uploaded by sellers are stored on local disk and served
  // at /uploads/<file>. Swap for S3/CloudFront in production.
  // On Vercel the disk is read-only and photos live in Vercel Blob instead.
  const useLocalUploads = !process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN;
  if (useLocalUploads) mkdirSync(UPLOADS_DIR, { recursive: true });
  if (useLocalUploads) app.useStaticAssets(UPLOADS_DIR, {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders: (res) => {
      // Never let a browser second-guess the type or run anything from here.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Genuine Parts.lk API running on http://0.0.0.0:${port}/api`);
}
bootstrap();
