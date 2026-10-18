import { Body, Controller, Get, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { deleteAccount } from '../users/account-deletion';
import { clientIp, hit } from '../security/rate-limit';
import { esc, page, WEB_PAGE_CSP } from './layout';
import { PRIVACY, TERMS } from './legal';

const deleteForm = (msg = '', email = '') => `
<h1>Delete your account</h1>
<p>Permanently delete your AutoGuide account and personal data. You don’t need the app for this.</p>
<p class="muted">What happens: your profile, address, phone, garage, cart, wishlist and any seller verification files are erased, and your store (if you have one) is closed. Order records are kept with your details removed, for the sellers’ accounting. Accounts with unfinished orders can be deleted once those orders are delivered or cancelled. Forgot your password? Use “Forgot password” in the app first.</p>
${msg}
<form method="post" action="/account/delete">
<label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(email)}">
<label for="password">Password</label><input id="password" name="password" type="password" required autocomplete="current-password">
<label style="font-weight:400"><input type="checkbox" name="confirm" value="yes" required> I understand this can’t be undone.</label>
<button type="submit">Delete my account</button>
</form>`;

// Public pages linked from the app and the Google Play listing.
@Controller()
export class WebController {
  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', WEB_PAGE_CSP)
  terms() {
    return page('Terms of Use', TERMS);
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', WEB_PAGE_CSP)
  privacy() {
    return page('Privacy Policy', PRIVACY);
  }

  @Get('account/delete')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', WEB_PAGE_CSP)
  deletePage() {
    return page('Delete account', deleteForm());
  }

  @Post('account/delete')
  @HttpCode(200)
  async deleteSubmit(@Body() body: any, @Req() req: any, @Res() res: any) {
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': WEB_PAGE_CSP });
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 255);
    try {
      await hit(`web-delete:${clientIp(req)}`, 10, 3600);
      if (body?.confirm !== 'yes') throw new Error('Please tick the confirmation box.');
      const user = await db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) });
      if (!user) throw new Error('Incorrect email or password.');
      await deleteAccount(user.id, String(body?.password ?? ''));
      return res.send(page('Account deleted', `<h1>Your account has been deleted</h1><p class="ok">Your AutoGuide account and personal data have been removed. Thank you for using AutoGuide.</p>`));
    } catch (e: any) {
      const msg = e?.response?.message ?? e?.message ?? 'Something went wrong.';
      const text = /incorrect password/i.test(msg) ? 'Incorrect email or password.' : msg;
      return res.send(page('Delete account', deleteForm(`<p class="err">${esc(text)}</p>`, email)));
    }
  }
}
