// Keeps every buyer <-> seller conversation inside the app: blocks phone
// numbers, emails, links, messaging-app handles and "contact me outside"
// requests (English, Sinhala, Tamil and Singlish) — including the usual
// tricks: spelled-out or Sinhala/Tamil digit words, letter-for-digit swaps
// (O for 0, l for 1), fancy Unicode digits, invisible characters, and
// numbers split across several messages. Part numbers (e.g. "90915-10003",
// "04465-12592") are still allowed, and so are Genuine Parts.lk product /
// store share links (validated separately in the chat service).

const DIGIT_WORDS: Record<string, string> = {
  // English
  zero: '0', oh: '0', nil: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
  // Sinhala (script + common Singlish spellings)
  'බින්දුව': '0', 'බිංදුව': '0', 'බින්දු': '0', 'එක': '1', 'දෙක': '2', 'තුන': '3', 'හතර': '4',
  'පහ': '5', 'හය': '6', 'හත': '7', 'අට': '8', 'නවය': '9', 'නමය': '9',
  binduwa: '0', bindu: '0', deka: '2', thuna: '3', hathara: '4', hatara: '4',
  haya: '6', hatha: '7', hata: '7', nawaya: '9', namaya: '9',
  // Tamil
  'பூஜ்யம்': '0', 'பூஜ்ஜியம்': '0', 'ஒன்று': '1', 'இரண்டு': '2', 'மூன்று': '3', 'நான்கு': '4',
  'ஐந்து': '5', 'ஆறு': '6', 'ஏழு': '7', 'எட்டு': '8', 'ஒன்பது': '9',
};
const WORD_RE = new RegExp(
  `(?<![\\p{L}\\p{M}])(${Object.keys(DIGIT_WORDS).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}\\p{M}])`,
  'giu',
);

// Sri Lankan mobiles (07X XXX XXXX, with or without +94/94/0094) — the real
// WhatsApp vector — are always blocked. Landlines (0XX XXX XXXX) only when
// written with the country code, because a bare "0XXXX-XXXXX" is very often
// a Toyota/Nissan part number (e.g. 04465-12592).
const SL_MOBILE = /(?:\+?94|0094|0)7\d{8}(?!\d)/;
const SL_MOBILE_NO_ZERO = /(?<!\d)7[01245678]\d{7}(?!\d)/; // "77 123 4567" with the leading 0 dropped
const SL_LANDLINE_INTL = /(?:\+94|0094)[1-9]\d{8}(?!\d)/;
const INTL_PHONE = /\+\d{9,15}(?!\d)/;

const EMAIL = /[a-z0-9._%+-]+\s*(?:@|＠|\(at\)|\[at\]|\{at\}|\bat\b)\s*[a-z0-9-]+\s*(?:\.|\(dot\)|\[dot\]|\{dot\}|\bdot\b)\s*[a-z]{2,}/i;
const EMAIL_PROVIDERS = /\b(?:g\s*mail|gmial|yahoo|hotmail|outlook|icloud|proton\s*mail|ymail)\b/i;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z][a-z0-9+.-]*:\/\/\S+/i;
const DOMAIN = /\b[a-z0-9-]{2,}\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*(?:com|lk|net|org|io|me|co|info|biz|app|link|ly|gl|to)\b/i;
const MESSAGING_APPS =
  /\b(?:whats\s*app|whatsapp|watsapp|wtsapp|wa\s*\.?\s*me|viber|telegram|t\s*\.\s*me|imo|signal|messenger|wechat|line\s*app|botim|skype|zoom)\b|වට්ස්|වයිබර්|வாட்ஸ்/i;
const SOCIALS = /\b(?:instagram|insta|ig\s*id|facebook|fb\s*(?:page|id|eke|account)|tik\s*tok|snapchat|twitter|linkedin)\b|(?<![\w.])@[a-z0-9_.]{3,}/i;
const OFF_PLATFORM = new RegExp(
  [
    // English
    'call me', 'ring me', 'text me', 'sms me', 'msg me (?:on|in)', 'contact me', 'reach me', 'dm me', 'inbox me',
    'my (?:number|no\\.?|phone|mobile|contact|email|mail|whats)', 'phone (?:number|no)', 'mobile (?:number|no)',
    'contact (?:number|no|details)', 'give (?:me )?your (?:number|no|contact)', 'send (?:me )?your (?:number|no|contact)',
    'your (?:number|no\\.?|contact)', 'email me', 'outside (?:the )?app', 'off[- ]?(?:platform|app)', 'deal directly',
    'pay (?:me )?directly', 'bank (?:transfer|deposit)', 'account (?:number|no)', 'come to (?:my|our) shop',
    // Singlish
    'number(?:a)? eka', 'nambar', 'no(?:\\.)? eka', 'call (?:karanna|ekak|ganna|denna|karapan|karala)', 'kol karanna',
    'whatsapp (?:karanna|ekata)', 'msg (?:karanna|ekak)', 'number (?:denna|denna puluwanda|ewanna)', 'account eka',
    // Sinhala / Tamil script
    'අංකය', 'නම්බර්', 'කෝල්', 'ඇමතුම', 'දුරකථන', 'ගිණුම් අංක', 'தொலைபேசி', 'எண்ணை', 'அழை',
  ].join('|'),
  'iu',
);

export interface FilterResult {
  blocked: boolean;
  reason?: string;
}

const BLOCK_REASON =
  'For your safety, phone numbers, emails, links, social media and requests to deal outside Genuine Parts.lk aren’t allowed in chat.';

/** Undo the usual disguises so patterns see what a human would read. */
export function normalize(text: string) {
  return (
    text
      .normalize('NFKC') // fullwidth / bold / circled digits → 0-9
      .replace(/[​-‍⁠﻿­]/g, '') // invisible characters
      // other Unicode decimal digits (Sinhala archaic, Tamil, Arabic-Indic…)
      .replace(/\p{Nd}/gu, (d) => {
        const v = d.charCodeAt(0);
        if (v >= 48 && v <= 57) return d;
        for (const base of [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0be6, 0x0de6, 0xff10]) if (v >= base && v <= base + 9) return String(v - base);
        return d;
      })
  );
}

/** Message reduced to a digit stream ("zero seven seven…" → "077…"). */
export function digitStream(text: string) {
  let t = normalize(text).toLowerCase().replace(WORD_RE, (w) => DIGIT_WORDS[w.toLowerCase()] ?? DIGIT_WORDS[w] ?? w);
  // Letter-for-digit swaps, only inside tokens that are mostly digits
  // ("O77-l234567"), so ordinary words are never turned into numbers.
  t = t.replace(/[0-9oOlI|!]+(?:[\s().\-_/+]*[0-9oOlI|!]+)*/g, (tok) => {
    const digits = (tok.match(/\d/g) ?? []).length;
    const letters = (tok.match(/[oOlI|!]/g) ?? []).length;
    return digits >= 3 && digits >= letters * 2 ? tok.replace(/[oO]/g, '0').replace(/[lI|!]/g, '1') : tok;
  });
  return t.replace(/[\s().\-_/,*#~:;'"`=+]+/g, (m) => (m.includes('+') ? '+' : ''));
}

function hasPhone(stream: string) {
  return SL_MOBILE.test(stream) || SL_MOBILE_NO_ZERO.test(stream) || SL_LANDLINE_INTL.test(stream) || INTL_PHONE.test(stream);
}

export function checkForContactInfo(rawMessage: string): FilterResult {
  const message = normalize(rawMessage.trim());
  const stream = digitStream(message);
  const checks = [
    hasPhone(stream),
    EMAIL.test(message),
    EMAIL_PROVIDERS.test(message),
    URL.test(message),
    DOMAIN.test(message),
    MESSAGING_APPS.test(message),
    SOCIALS.test(message),
    OFF_PLATFORM.test(message),
  ];
  return checks.some(Boolean) ? { blocked: true, reason: BLOCK_REASON } : { blocked: false };
}

/**
 * Catches a number sent in pieces ("077", "123", "4567") across the sender's
 * recent messages (oldest → newest), even with chatter in between. Only
 * messages that are mostly digits are joined, and only full-format numbers
 * (07X…, +94…, +country…) count, so prices and part numbers aren't affected.
 */
export function checkSplitNumber(previous: string[], current: string): FilterResult {
  const numberish = (s: string) => {
    const st = digitStream(s);
    const digits = (st.match(/\d/g) ?? []).length;
    return digits >= 2 && digits / Math.max(1, st.replace(/\s/g, '').length) >= 0.6 ? st.replace(/[^\d+]/g, '') : null;
  };
  const cur = numberish(current);
  if (!cur) return { blocked: false };
  const joined = [...previous.map(numberish).filter(Boolean), cur].join('');
  const strict = SL_MOBILE.test(joined) || SL_LANDLINE_INTL.test(joined) || INTL_PHONE.test(joined);
  return strict ? { blocked: true, reason: BLOCK_REASON } : { blocked: false };
}
