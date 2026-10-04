// "Rs. 14,500" for rupees, "$45.00" for dollars.
export function formatPrice(value: string | number | null | undefined, currency: string = 'LKR') {
  const n = Number(value ?? 0);
  if (currency === 'USD') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `Rs. ${Math.round(n).toLocaleString('en-US')}`;
}

export const currencySymbol = (currency: string = 'LKR') => (currency === 'USD' ? '$' : 'Rs.');

export function discountPercent(price: string | number, compareAt?: string | number | null) {
  if (!compareAt) return null;
  const p = Number(price);
  const c = Number(compareAt);
  if (!c || c <= p) return null;
  return Math.round(((c - p) / c) * 100);
}

export function timeAgo(date: string | Date) {
  const d = new Date(date).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function clockTime(date: string | Date) {
  const d = new Date(date);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function dayLabel(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function shortDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function orderNumber(id: string) {
  return `GP-${id.slice(-6).toUpperCase()}`;
}

export function initials(name?: string | null) {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara',
  'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];
