import { randomBytes } from 'crypto';

// Collision-resistant, URL-safe IDs (cuid-style: lowercase letter + 23 chars).
// Replaces @paralleldrive/cuid2, which is ESM-only and can't be loaded by
// Vercel's CommonJS runtime.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createId(length = 24): string {
  const bytes = randomBytes(length);
  let out = ALPHABET[bytes[0] % 26]; // always start with a letter
  for (let i = 1; i < length; i++) out += ALPHABET[bytes[i] % 36];
  return out;
}
