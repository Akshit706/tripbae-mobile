/**
 * TravelBae Itinerary — Design Tokens
 * Aesthetic: Warm editorial, Condé Nast Traveller × luxury hotel app
 *
 * Dependencies:
 *   npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans
 *   npx expo install expo-linear-gradient react-native-reanimated
 */
import { Platform } from 'react-native';

// ─── Colours ──────────────────────────────────────────────────
export const C = {
  // Base surfaces
  bg:      '#FAF8F4',
  surface: '#FFFFFF',

  // Brand palette
  espresso: '#1C1410',
  gold:     '#C9913A',
  sage:     '#7A9E7E',
  coral:    '#E8715A',
  blue:     '#378ADD',

  // Text hierarchy
  textPrimary:   '#1C1410',
  textSecondary: '#5C504A',
  textMuted:     '#8A7E76',
  textLight:     '#C5BBB3',

  // Tinted backgrounds (tags / chips)
  goldTint:    '#FDF3E3',
  sageTint:    '#EBF3EC',
  coralTint:   '#FDF0EE',
  blueTint:    '#E6F1FB',
  greenTint:   '#F1EFE8',
  neutralTint: '#F4F2EE',

  // Structural
  border:  'rgba(28,20,16,0.08)',
  divider: 'rgba(28,20,16,0.06)',

  // Timeline
  dotActive: '#C9913A',
  dotPast:   '#D3CFC8',
  lineColor: 'rgba(28,20,16,0.10)',
} as const;

// ─── Font families ────────────────────────────────────────────
export const F = {
  playfair:     'PlayfairDisplay_400Regular',
  playfairIt:   'PlayfairDisplay_400Regular_Italic',
  playfairBold: 'PlayfairDisplay_700Bold',
  dm:           'DMSans_400Regular',
  dmMd:         'DMSans_500Medium',
  dmSemi:       'DMSans_700Bold',   // use 700 as safe semibold fallback
  dmBold:       'DMSans_700Bold',
} as const;

// ─── Spacing ──────────────────────────────────────────────────
export const Sp = {
  xs: 4, s: 8, sm: 12, m: 16, ml: 20, l: 24, xl: 32, xxl: 48,
} as const;

// ─── Border radius ────────────────────────────────────────────
export const R = {
  xs: 4, s: 6, m: 10, l: 14, xl: 20, full: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1C1410',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
}) as object;

export const elevatedShadow = Platform.select({
  ios: {
    shadowColor: '#1C1410',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
  },
  android: { elevation: 6 },
  default: {},
}) as object;

// ─── Typography presets ───────────────────────────────────────
export const Ty = {
  tripTitle: {
    fontFamily: F.playfair,
    fontSize: 26,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    lineHeight: 34,
  },
  dayTheme: {
    fontFamily: F.playfairIt,
    fontSize: 19,
    color: C.espresso,
    lineHeight: 26,
  },
  activityName: {
    fontFamily: F.dmSemi,
    fontSize: 15,
    color: C.textPrimary,
    lineHeight: 21,
  },
  timePrimary: {
    fontFamily: F.dmMd,
    fontSize: 13,
    color: C.textPrimary,
  },
  timeSecondary: {
    fontFamily: F.dm,
    fontSize: 11,
    color: C.textMuted,
  },
  tag: {
    fontFamily: F.dmMd,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  body: {
    fontFamily: F.dm,
    fontSize: 13,
    lineHeight: 20,
    color: C.textSecondary,
  },
  meta: {
    fontFamily: F.dm,
    fontSize: 12,
    color: C.textMuted,
  },
  sectionDate: {
    fontFamily: F.dmMd,
    fontSize: 11,
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase' as const,
  },
  pill: {
    fontFamily: F.dmMd,
    fontSize: 11,
    letterSpacing: 0.3,
  },
};
