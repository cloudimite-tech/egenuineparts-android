import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// RFC 6238 time-based one-time passwords (Google Authenticator, Microsoft
// Authenticator, Authy…) - used for the admin panel's two-step login.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string) {
  const clean = str.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpAt(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
  return code;
}

/** Accepts the current 30-second code and one step either side (clock drift). */
export function verifyTotp(secret: string, token: string, now = Date.now()) {
  const t = (token ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(t)) return false;
  const counter = Math.floor(now / 30000);
  for (const c of [counter - 1, counter, counter + 1]) {
    const expected = Buffer.from(totpAt(secret, c));
    if (timingSafeEqual(expected, Buffer.from(t))) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = 'AutoGuide Admin') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
