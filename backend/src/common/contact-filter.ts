// Keeps every buyer <-> seller conversation inside the app: blocks phone
// numbers, emails, links, messaging-app handles and "contact me outside"
// requests — while still letting people talk about part numbers
// (e.g. "90915-10003", "P 83 152", "04465-12592"), which a naive
// "any long run of digits" rule would wrongly block on a parts marketplace.

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
};

// Sri Lankan mobiles (07X XXX XXXX, with or without +94/94/0094) — the real
// WhatsApp vector — are always blocked. Landlines (0XX XXX XXXX) are only
// blocked when written with the country code, because a bare "0XXXX-XXXXX"
// is very often a Toyota/Nissan part number (e.g. 04465-12592).
// Checked against a copy of the message with separators stripped, so
// "077 123 4567", "077-123-4567" and "+94 77 123 4567" are all caught.
const SL_MOBILE = /(?:\+?94|0094|0)7\d{8}(?!\d)/;
const SL_LANDLINE_INTL = /(?:\+94|0094)[1-9]\d{8}(?!\d)/;

// Any other international-looking number: a "+" followed by 9–15 digits.
const INTL_PHONE = /\+\d{9,15}(?!\d)/;

const EMAIL = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\bat\b)\s*[a-z0-9-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*[a-z]{2,}/i;
const URL = /\b(?:https?:\/\/|www\.)\S+/i;
const DOMAIN = /\b[a-z0-9-]{2,}\.(?:com|lk|net|org|io|me|co|info|biz)\b/i;
const MESSAGING_APPS = /\b(?:whats\s*app|whatsapp|wa\.me|viber|telegram|imo|signal|messenger|wechat|line app)\b/i;
const SOCIALS = /\b(?:instagram|insta|facebook|fb\s*page|tiktok|snapchat)\b|@[a-z0-9_.]{3,}/i;
const OFF_PLATFORM =
  /\b(?:call me|ring me|text me|sms me|contact me|reach me|my (?:number|no|phone|mobile|email)|phone number|mobile number|give me your number|send (?:me )?your number|email me|outside (?:the )?app|off[- ]?platform|deal directly|pay (?:me )?directly|bank transfer to me)\b/i;

export interface FilterResult {
  blocked: boolean;
  reason?: string;
}

const BLOCK_REASON =
  'For your safety, phone numbers, emails, links and requests to deal outside Genuine Parts.lk aren’t allowed in chat.';

function digitsOnly(text: string) {
  // Collapse spelled-out digits ("zero seven seven…") and strip separators.
  const spelled = text
    .toLowerCase()
    .replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => NUMBER_WORDS[w]);
  return spelled.replace(/[\s().\-_/]+/g, '');
}

export function checkForContactInfo(rawMessage: string): FilterResult {
  const message = rawMessage.trim();
  const compact = digitsOnly(message);

  const checks = [
    SL_MOBILE.test(compact),
    SL_LANDLINE_INTL.test(compact),
    INTL_PHONE.test(compact),
    EMAIL.test(message),
    URL.test(message),
    DOMAIN.test(message),
    MESSAGING_APPS.test(message),
    SOCIALS.test(message),
    OFF_PLATFORM.test(message),
  ];

  return checks.some(Boolean) ? { blocked: true, reason: BLOCK_REASON } : { blocked: false };
}
