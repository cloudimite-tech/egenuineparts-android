import { Platform } from 'react-native';

// Two palettes. `colors` is one shared object whose values are swapped when
// the theme changes; styles are built lazily through `themed()` so they pick
// up the new values, and the app re-renders from the root.
const light = {
  // brand - AutoGuide logo: red + charcoal. (The `navy*` keys are kept for
  // compatibility; they hold the logo charcoal.)
  accent: '#E5120B',
  accentDark: '#B80D07',
  accentSoft: '#FFECEA',
  navy: '#231F20',
  navyDark: '#161314',
  navySoft: '#EFEEEE',
  black: '#0D0D0D',
  headerBg: '#1B1819',
  headerElevated: '#2E2A2B',
  headerGradient: ['#161314', '#231F20', '#3A3536'] as [string, string, string],
  // surfaces
  bg: '#F4F4F6',
  surface: '#FFFFFF',
  white: '#FFFFFF', // always white (text/icons on red or dark)
  paper: '#FFFFFF', // always-white chips on dark/colourful backgrounds
  ink: '#111114', // always-dark text on those chips
  // text
  text: '#111114',
  textMuted: '#6B6B73',
  textFaint: '#9C9CA3',
  link: '#231F20', // charcoal text/icons that must stay readable in dark mode
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
  muted: '#EFEFF2',
  overlay: 'rgba(0,0,0,0.45)',
};

const dark: typeof light = {
  accent: '#F0291F',
  accentDark: '#FF6B61',
  accentSoft: '#3A1614',
  navy: '#454041',
  navyDark: '#2A2627',
  navySoft: '#2A2627',
  black: '#3A3536',
  headerBg: '#0B0A0A',
  headerElevated: '#252122',
  headerGradient: ['#060505', '#110F0F', '#1F1B1C'],
  bg: '#0E0C0C',
  surface: '#1A1717',
  white: '#FFFFFF',
  paper: '#FFFFFF',
  ink: '#111114',
  text: '#F2EFEF',
  textMuted: '#ABA5A5',
  textFaint: '#7A7474',
  link: '#EDE8E8',
  border: '#332E2E',
  divider: '#272323',
  success: '#3BB273',
  successSoft: '#11291C',
  warning: '#F0A54A',
  warningSoft: '#33240F',
  info: '#6E9CF5',
  infoSoft: '#142240',
  star: '#F5B23A',
  muted: '#2A2627',
  overlay: 'rgba(0,0,0,0.65)',
};

export type ThemeMode = 'light' | 'dark';
export const colors = { ...light };
let themeVersion = 0;
export let themeMode: ThemeMode = 'light';

/** Switches every colour in place. Call before re-rendering the app. */
export function applyTheme(mode: ThemeMode) {
  if (mode === themeMode && themeVersion > 0) return;
  Object.assign(colors, mode === 'dark' ? dark : light);
  applyShadow(mode);
  themeMode = mode;
  themeVersion++;
}

/** Lazily-built style sheet / colour map that is rebuilt after a theme change. */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  let builtFor = -1;
  const current = () => {
    if (!cache || builtFor !== themeVersion) {
      cache = factory();
      builtFor = themeVersion;
    }
    return cache as any;
  };
  return new Proxy({} as T, {
    get: (_t, key) => current()[key],
    has: (_t, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_t, key) => ({ ...Object.getOwnPropertyDescriptor(current(), key), configurable: true }),
  });
}

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

// Card elevation. Shadows don't show on a dark background, so in dark mode
// cards get a hairline border instead (updated in place by applyTheme).
const lightShadow = Platform.select<any>({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});
const darkShadow = { borderWidth: 1, borderColor: '#2B2626' };
export const shadow: Record<string, any> = { ...lightShadow };
function applyShadow(mode: ThemeMode) {
  for (const k of Object.keys(shadow)) delete shadow[k];
  Object.assign(shadow, mode === 'dark' ? darkShadow : lightShadow);
}

// Top padding under the status bar for our custom dark headers.
export const HEADER_TOP = Platform.OS === 'ios' ? 54 : 44;
