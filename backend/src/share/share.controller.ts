import { Controller, Get, Header, NotFoundException, Param, Req, Res } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { productImages, products, stores } from '../db/schema';
import { presentPrice } from '../products/pricing';

const PACKAGE = 'lk.genuineparts.app';
const SCHEME = 'genuineparts';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const money = (amount: number | string, currency = 'LKR') =>
  currency === 'USD' ? `$${Number(amount).toFixed(2)}` : `Rs. ${Math.round(Number(amount)).toLocaleString('en-LK')}`;

function origin(req: any) {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'https';
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

function absolute(url: string | null | undefined, base: string) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function page(o: { base: string; path: string; title: string; description: string; image: string | null; heading: string; sub: string; price?: string; was?: string }) {
  const appUrl = `${SCHEME}://${o.path}`;
  const download = process.env.APP_DOWNLOAD_URL;
  const fallback = encodeURIComponent(download || `${o.base}/${o.path}`);
  const intent = `intent://${o.path}#Intent;scheme=${SCHEME};package=${PACKAGE};S.browser_fallback_url=${fallback};end`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Genuine Parts.lk">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(`${o.base}/${o.path}`)}">
${o.image ? `<meta property="og:image" content="${esc(o.image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#2E2D7C">
<style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F4F6;color:#111114}
header{background:linear-gradient(135deg,#1C1B54,#2E2D7C 60%,#3B3AA0);color:#fff;padding:16px 20px;border-bottom:3px solid #D2262B;font-weight:900;font-size:18px}
header span{color:#ff8a8d}main{max-width:520px;margin:0 auto;padding:16px}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06)}
.img{width:100%;aspect-ratio:1/0.86;object-fit:cover;background:#ECECF8;display:block}
.body{padding:18px}h1{font-size:20px;margin:0 0 6px}.sub{color:#6B6B73;margin:0 0 12px}
.price{font-size:26px;font-weight:900;color:#D2262B}.was{color:#9C9CA3;text-decoration:line-through;margin-left:8px}
.btn{display:block;text-align:center;text-decoration:none;font-weight:800;border-radius:14px;padding:15px;margin-top:12px}
.primary{background:#D2262B;color:#fff}.ghost{border:1.5px solid #2E2D7C;color:#2E2D7C}
.note{color:#6B6B73;font-size:13px;text-align:center;margin-top:14px}
</style></head>
<body><header>Genuine Parts<span>.lk</span></header><main><div class="card">
${o.image ? `<img class="img" src="${esc(o.image)}" alt="">` : ''}
<div class="body"><h1>${esc(o.heading)}</h1><p class="sub">${esc(o.sub)}</p>
${o.price ? `<div><span class="price">${esc(o.price)}</span>${o.was ? `<span class="was">${esc(o.was)}</span>` : ''}</div>` : ''}
<a class="btn primary" href="${esc(intent)}" onclick="if(!/Android/i.test(navigator.userAgent)){this.href='${esc(appUrl)}'}">Open in the app</a>
${download ? `<a class="btn ghost" href="${esc(download)}">Get the Genuine Parts.lk app</a>` : ''}
</div></div><p class="note">Cash on delivery island-wide · Verified sellers · Chat safely in the app</p></main></body></html>`;
}

// Public share pages (outside the /api prefix): rich previews in WhatsApp /
// Facebook / SMS, and an "Open in the app" button that deep-links straight
// to the product or store.
@Controller()
export class ShareController {
  @Get('p/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  async product(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const p = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.isActive, true)),
      with: { images: { orderBy: asc(productImages.position), limit: 1 }, store: { columns: { name: true, status: true } } },
    });
    if (!p || p.store.status !== 'APPROVED') throw new NotFoundException('This part is no longer available.');
    const base = origin(req);
    const v = presentPrice(p);
    const price = money(v.price, v.currency);
    const usdNote = v.currency === 'USD' ? ` (≈ ${money(v.priceLkr)})` : '';
    res.send(
      page({
        base,
        path: `p/${p.id}`,
        title: `${p.title} – ${price} | Genuine Parts.lk`,
        description: `${p.brand}${p.partNumber ? ` · ${p.partNumber}` : ''} · ${price}${usdNote} · Sold by ${p.store.name} on Genuine Parts.lk`,
        image: absolute(p.images[0]?.url, base),
        heading: p.title,
        sub: `${p.brand}${p.partNumber ? ` · Part no. ${p.partNumber}` : ''} · ${p.store.name}`,
        price: price + usdNote,
        was: v.compareAtPrice ? money(v.compareAtPrice, v.currency) : undefined,
      }),
    );
  }

  @Get('s/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  async store(@Param('slug') slug: string, @Req() req: any, @Res() res: any) {
    const s = await db.query.stores.findFirst({ where: and(eq(stores.slug, slug), eq(stores.status, 'APPROVED')) });
    if (!s) throw new NotFoundException('Store not found.');
    const base = origin(req);
    res.send(
      page({
        base,
        path: `s/${s.slug}`,
        title: `${s.name} | Genuine Parts.lk`,
        description: s.bio || `Verified seller on Genuine Parts.lk${s.shipsFrom ? ` · Ships from ${s.shipsFrom}` : ''}`,
        image: absolute(s.logoUrl, base),
        heading: s.name,
        sub: `Verified seller${s.shipsFrom ? ` · Ships from ${s.shipsFrom}` : ''}`,
      }),
    );
  }

  // Android App Links: lets https share links open the app directly once the
  // release signing certificate fingerprint is set in ANDROID_CERT_SHA256.
  @Get('.well-known/assetlinks.json')
  @Header('Content-Type', 'application/json')
  assetlinks() {
    const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((f) => f.trim().toUpperCase()).filter(Boolean);
    if (!fingerprints.length) return [];
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: PACKAGE, sha256_cert_fingerprints: fingerprints },
      },
    ];
  }
}
