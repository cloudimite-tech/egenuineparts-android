// Store numbers as +94XXXXXXXXX whether typed as 077…, 77… or +94 77…
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('94')) return `+${d}`;
  if (d.startsWith('0')) return `+94${d.slice(1)}`;
  return `+94${d}`;
}

export function isValidSlPhone(raw: string) {
  return /^\+94\d{9}$/.test(normalizePhone(raw));
}

// "+94771234567" → "77 123 4567" for editing inside a "+94" prefixed field
export function localPart(phone?: string | null) {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '').replace(/^94/, '');
  return d.replace(/^(\d{2})(\d{3})(\d{0,4}).*$/, '$1 $2 $3').trim();
}
