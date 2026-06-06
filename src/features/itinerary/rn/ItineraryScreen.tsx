/**
 * ItineraryScreen — Premium editorial travel itinerary for React Native / Expo
 *
 * Required dependencies (run in your Expo project root):
 *   npx expo install expo-linear-gradient
 *   npx expo install react-native-reanimated
 *   npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans
 *   npx expo install expo-font
 *
 * Usage:
 *   import ItineraryScreen from './rn/ItineraryScreen';
 *   import { UDAIPUR_SAMPLE } from './rn/sampleData';
 *   <ItineraryScreen itinerary={UDAIPUR_SAMPLE} />
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  // @ts-ignore — italic variant name varies across expo-google-fonts versions
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { C, F, Sp, R, Ty, cardShadow } from './theme';
import { DaySection, DayData } from './DaySection';

// ─── Data types ───────────────────────────────────────────────
export interface ItineraryData {
  tripTitle: string;
  destination: string;
  totalBudget: string;
  arrivalWindow: string;
  departureWindow: string;
  heroPhoto?: string;
  tips: string[];
  days: DayData[];
}

interface Props {
  itinerary?: ItineraryData;
  loading?: boolean;
}

// ─── Skeleton blocks ──────────────────────────────────────────
function SkeletonBlock({ w, h, style }: { w?: number | string; h: number; style?: object }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900 }),
        withTiming(0.4,  { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: w as any, height: h, backgroundColor: '#E8E4DC', borderRadius: R.m }, style, anim]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={{ paddingHorizontal: Sp.m, marginBottom: Sp.ml }}>
      <View style={{ flexDirection: 'row', gap: Sp.sm }}>
        {/* Time column */}
        <View style={{ width: 58, gap: 5 }}>
          <SkeletonBlock w={44} h={14} />
          <SkeletonBlock w={34} h={11} />
        </View>
        {/* Connector */}
        <View style={{ width: 20, alignItems: 'center', paddingTop: 4 }}>
          <SkeletonBlock w={10} h={10} style={{ borderRadius: 5 }} />
        </View>
        {/* Card */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFF',
            borderRadius: R.l,
            padding: Sp.m,
            ...(cardShadow as object),
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sp.s }}>
            <SkeletonBlock w="58%" h={16} />
            <SkeletonBlock w={26} h={26} style={{ borderRadius: R.full }} />
          </View>
          <View style={{ flexDirection: 'row', gap: Sp.s, marginBottom: Sp.s }}>
            <SkeletonBlock w={72} h={22} style={{ borderRadius: R.full }} />
            <SkeletonBlock w={60} h={22} style={{ borderRadius: R.full }} />
          </View>
          <SkeletonBlock w="100%" h={13} style={{ marginBottom: 6 }} />
          <SkeletonBlock w="82%"  h={13} style={{ marginBottom: 6 }} />
          <SkeletonBlock w="92%"  h={13} style={{ marginBottom: Sp.sm }} />
          <SkeletonBlock w="100%" h={130} style={{ borderRadius: R.m }} />
        </View>
      </View>
    </View>
  );
}

// ─── Hero section ─────────────────────────────────────────────
function Hero({ data }: { data: ItineraryData }) {
  const { tripTitle, totalBudget, arrivalWindow, departureWindow, heroPhoto } = data;

  const overlay = (
    <>
      <LinearGradient
        colors={['transparent', 'rgba(28,20,16,0.48)', 'rgba(28,20,16,0.90)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={styles.heroContent}
      >
        {/* Arrival / departure badges */}
        <View style={styles.heroBadgesRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>✈ {arrivalWindow}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🛬 {departureWindow}</Text>
          </View>
        </View>

        {/* Trip title */}
        <Text style={Ty.tripTitle}>{tripTitle}</Text>

        {/* Budget */}
        <Text style={styles.heroBudget}>🔥 {totalBudget} total</Text>
      </Animated.View>
    </>
  );

  if (heroPhoto) {
    return (
      <ImageBackground source={{ uri: heroPhoto }} style={styles.hero}>
        {overlay}
      </ImageBackground>
    );
  }

  // Fallback gradient when no photo
  return (
    <LinearGradient
      colors={['#2C1810', '#8B5E3C', '#C9913A']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {overlay}
    </LinearGradient>
  );
}

// ─── Quick tips (collapsible horizontal scroll) ───────────────
function QuickTips({ tips }: { tips: string[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Animated.View
      entering={FadeInDown.delay(120).duration(300)}
      style={styles.tipsCard}
    >
      <Pressable style={styles.tipsToggleRow} onPress={() => setOpen(o => !o)}>
        <Text style={styles.tipsToggleLabel}>💡 Quick Tips</Text>
        <Text style={styles.tipsToggleArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsPillsRow}
        >
          {tips.map((tip, i) => (
            <View key={i} style={styles.tipPill}>
              <Text style={styles.tipPillIcon}>💡</Text>
              <Text style={styles.tipPillText}>{tip}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function ItineraryScreen({ itinerary, loading = false }: Props) {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Don't render until fonts are ready (avoids flash of unstyled text)
  if (!fontsLoaded) return null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        {itinerary && <Hero data={itinerary} />}

        <View style={styles.body}>
          {/* Quick tips */}
          {itinerary && itinerary.tips.length > 0 && (
            <QuickTips tips={itinerary.tips} />
          )}

          {/* Day sections or skeleton */}
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            itinerary?.days.map((day, i) => (
              <DaySection
                key={i}
                day={day}
                dayIndex={i}
                destination={itinerary.destination}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Sp.xxl },
  body: { paddingTop: Sp.m },

  // ── Hero ──
  hero: {
    height: 220,
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: Sp.m,
    paddingBottom: Sp.l,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    gap: Sp.s,
    marginBottom: Sp.sm,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderRadius: R.full,
    paddingHorizontal: Sp.sm,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroBadgeText: {
    fontFamily: F.dmMd,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroBudget: {
    fontFamily: F.dmMd,
    fontSize: 13,
    color: '#F5D9A8',
    letterSpacing: 0.3,
    marginTop: Sp.s,
  },

  // ── Quick tips ──
  tipsCard: {
    marginHorizontal: Sp.m,
    marginBottom: Sp.m,
    backgroundColor: C.surface,
    borderRadius: R.l,
    overflow: 'hidden',
    ...(cardShadow as object),
  },
  tipsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Sp.m,
    paddingVertical: Sp.sm,
  },
  tipsToggleLabel: {
    fontFamily: F.dmMd,
    fontSize: 13,
    color: C.espresso,
  },
  tipsToggleArrow: {
    fontFamily: F.dm,
    fontSize: 11,
    color: C.textMuted,
  },
  tipsPillsRow: {
    paddingHorizontal: Sp.m,
    paddingBottom: Sp.sm,
    gap: Sp.s,
  },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.coralTint,
    borderRadius: R.m,
    paddingHorizontal: Sp.sm,
    paddingVertical: Sp.s,
    gap: 5,
    maxWidth: 230,
  },
  tipPillIcon: { fontSize: 13 },
  tipPillText: {
    fontFamily: F.dm,
    fontSize: 12,
    color: C.coral,
    lineHeight: 18,
    flex: 1,
  },
});
