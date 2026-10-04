import { Platform } from 'react-native';

export const colors = {
  // brand — Genuine Parts.lk logo: red "e" + navy wordmark
  accent: '#D2262B',
  accentDark: '#A81D21',
  accentSoft: '#FDECEC',
  navy: '#2E2D7C',
  navyDark: '#1C1B54',
  navySoft: '#ECECF8',
  black: '#0D0D0D',
  headerBg: '#23226A',
  headerElevated: '#36358C',
  // surfaces
  bg: '#F4F4F6',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  // text
  text: '#111114',
  textMuted: '#6B6B73',
  textFaint: '#9C9CA3',
  // lines
  border: '#E6E6EA',
  divider: '#F0F0F2',
  // status
  success: '#16803C',
  successSoft: '#E7F6EC',
  warning: '#B25E09',
  warningSoft: '#FFF4E5',
  info: '#1D5FD6',
  infoSoft: '#EAF1FE',
  star: '#F5A623',
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const font = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8 },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

// Top padding under the status bar for our custom dark headers.
export const HEADER_TOP = Platform.OS === 'ios' ? 54 : 44;
