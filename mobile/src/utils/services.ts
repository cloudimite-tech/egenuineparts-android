import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../api/config';
import { getAuthToken } from '../api/authToken';
import { colors } from '../theme/theme';
import { Appointment } from '../types';
import { formatPrice } from './format';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Ionicon for a service type (admins pick from a fixed list). */
export function serviceIcon(name?: string | null): IconName {
  return name && name in Ionicons.glyphMap ? (name as IconName) : 'construct-outline';
}

export function priceRange(from: number | null, to: number | null) {
  if (from == null) return 'Price on request';
  if (to != null && to > from) return `${formatPrice(from)} - ${formatPrice(to)}`;
  return `From ${formatPrice(from)}`;
}

export function durationLabel(min?: number | null) {
  if (!min) return null;
  if (min < 60) return `About ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h >= 24) return `About ${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'}`;
  return `About ${h} h${m ? ` ${m} min` : ''}`;
}

export function appointmentWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function appointmentStatus(a: Pick<Appointment, 'status' | 'expired' | 'scheduledAt'>) {
  if (a.expired) return { label: 'Expired', fg: colors.textMuted, bg: colors.muted, icon: 'time-outline' as IconName };
  switch (a.status) {
    case 'REQUESTED':
      return { label: 'Waiting for reply', fg: colors.warning, bg: colors.warningSoft, icon: 'hourglass-outline' as IconName };
    case 'ACCEPTED':
      return new Date(a.scheduledAt).getTime() < Date.now()
        ? { label: 'Accepted · past', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle-outline' as IconName }
        : { label: 'Confirmed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' as IconName };
    case 'DECLINED':
      return { label: 'Declined', fg: colors.accentDark, bg: colors.accentSoft, icon: 'close-circle-outline' as IconName };
    case 'CANCELLED':
      return { label: 'Cancelled', fg: colors.textMuted, bg: colors.muted, icon: 'ban-outline' as IconName };
    case 'COMPLETED':
      return { label: 'Completed', fg: colors.info, bg: colors.infoSoft, icon: 'flag-outline' as IconName };
  }
}

/** Uploads a photo and returns its URL (same endpoint as product photos). */
export async function uploadImage(localUri: string): Promise<string> {
  const name = localUri.split('/').pop() || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const form = new FormData();
  form.append('file', { uri: localUri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Upload failed.');
  return data.url as string;
}
