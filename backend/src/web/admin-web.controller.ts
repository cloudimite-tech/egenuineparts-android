import { Controller, Get, Header, Res } from '@nestjs/common';
import { ADMIN_CSS, ADMIN_HTML, ADMIN_JS } from './admin-web.assets';
import { LOGO_MARK_PNG, LOGO_WORDMARK_LIGHT_PNG, LOGO_WORDMARK_PNG } from './admin-web.brand';

// The web admin panel (https://<backend>/admin). Static files are embedded in
// the code so they're always part of the Vercel function bundle.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

@Controller('admin')
export class AdminWebController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', CSP)
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  index() {
    return ADMIN_HTML;
  }

  @Get('app.js')
  js(@Res() res: any) {
    res.set({ 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.send(ADMIN_JS);
  }

  @Get('app.css')
  css(@Res() res: any) {
    res.set({ 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.send(ADMIN_CSS);
  }

  @Get('logo-mark.png')
  logoMark(@Res() res: any) {
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.send(LOGO_MARK_PNG);
  }

  @Get('logo.png')
  logo(@Res() res: any) {
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.send(LOGO_WORDMARK_PNG);
  }

  @Get('logo-light.png')
  logoLight(@Res() res: any) {
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.send(LOGO_WORDMARK_LIGHT_PNG);
  }
}
