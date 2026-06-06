import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, Sp, R, Ty, cardShadow } from './theme';

// ─── Types ────────────────────────────────────────────────────
export interface Activity {
  time: string;
  endTime?: string;
  name: string;
  type: string;
  tags?: string[];
  hours?: string;
  hoursVerified?: boolean;
  description: string;
  duration?: string;
  cost?: string;
  location?: string;
  photo?: string;
  warning?: string;
  mapsUrl?: string;
  mustDo?: boolean;
  icon?: string;
}

export interface Transit {
  after: number;
  mode: 'walk' | 'taxi' | 'auto' | 'boat';
  duration: string;
}

interface Props {
  activity: Activity;
  index: number;
  isLast: boolean;
  isActive?: boolean;
  isPast?: boolean;
  transit?: Transit;
  destination: string;
}

// ─── Tag colour mapping ───────────────────────────────────────
function resolveTagStyle(tag: string, isMustDo?: boolean): { bg: string; color: string } {
  if (isMustDo) return { bg: C.goldTint, color: C.gold };
  const t = tag.toLowerCase();
  if (['scenic', 'nature', 'park', 'beach', 'lake', 'viewpoint'].some(k => t.includes(k)))
    return { bg: C.sageTint, color: C.sage };
  if (['easy'].includes(t)) return { bg: C.sageTint, color: '#5A8A60' };
  if (['moderate'].includes(t)) return { bg: '#FFF8E6', color: '#A0761C' };
  if (['hard', 'strenuous'].some(k => t.includes(k))) return { bg: C.coralTint, color: C.coral };
  if (['heritage', 'cultural', 'culture', 'historic'].some(k => t.includes(k)))
    return { bg: C.blueTint, color: '#2563AB' };
  return { bg: C.neutralTint, color: C.textMuted };
}

// ─── Shimmer placeholder ──────────────────────────────────────
function ShimmerBlock({ style }: { style?: object }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ backgroundColor: '#E8E4DC', borderRadius: R.m }, style, animStyle]}
    />
  );
}

// ─── Photo with shimmer ───────────────────────────────────────
function ActivityPhoto({ url, label }: { url: string; label: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={styles.photoWrapper}>
      {!loaded && <ShimmerBlock style={StyleSheet.absoluteFillObject as object} />}
      <Image
        source={{ uri: url }}
        style={styles.photo}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        accessible
        accessibilityLabel={label}
      />
      {loaded && (
        <LinearGradient
          colors={['transparent', 'rgba(28,20,16,0.22)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: R.m }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

// ─── Category icon fallback map ───────────────────────────────
const CATEGORY_ICON: Record<string, string> = {
  attraction: '🏛', food: '🍽', experience: '✨', hotel: '🏨',
  shopping: '🛍', transport: '🚗', temple: '🛕', museum: '🖼',
  park: '🌿', beach: '🏖', viewpoint: '🔭', neighbourhood: '🏘',
};

// ─── Transit chip ─────────────────────────────────────────────
function TransitChip({ transit }: { transit: Transit }) {
  const icon = transit.mode === 'walk' ? '🚶' : transit.mode === 'boat' ? '⛵' : '🚕';
  return (
    <View style={styles.transitRow}>
      <View style={styles.transitLine} />
      <View style={styles.transitChip}>
        <Text style={styles.transitIcon}>{icon}</Text>
        <Text style={styles.transitText}>{transit.duration} {transit.mode}</Text>
      </View>
      <View style={styles.transitLine} />
    </View>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────
export function ActivityCard({
  activity,
  index,
  isLast,
  isActive = false,
  transit,
  destination,
}: Props) {
  const {
    time, endTime, name, type, tags, hours, hoursVerified,
    description, duration, cost, photo, warning, mapsUrl, mustDo, icon,
  } = activity;

  // Description expand / collapse
  const descNeedsExpand = description.length > 180;
  const [expanded, setExpanded] = useState(false);

  // Pulsing dot for active time slot
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (!isActive) return;
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 700 }),
        withTiming(1,    { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [isActive]);
  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  // Build tag list (MUST DO always first)
  const allTags = [
    ...(mustDo ? ['MUST DO'] : []),
    ...(tags ?? []).filter(t => !['must do', 'must-do'].includes(t.toLowerCase())),
  ];

  const catIcon = icon ?? CATEGORY_ICON[type] ?? '📍';
  const showActions = type !== 'hotel' && type !== 'transport' && type !== 'travel';

  const handleMaps = () => mapsUrl && Linking.openURL(mapsUrl).catch(() => null);
  const handleKnowMore = () =>
    Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(`${name} ${destination}`)}`,
    ).catch(() => null);

  return (
    <View>
      {/* ── Timeline row ── */}
      <View style={styles.timelineRow}>
        {/* Time column */}
        <View style={styles.timeCol}>
          <Text style={Ty.timePrimary}>{time}</Text>
          {endTime ? <Text style={Ty.timeSecondary}>{endTime}</Text> : null}
        </View>

        {/* Dot + connector line */}
        <View style={styles.connectorCol}>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: isActive ? C.dotActive : C.dotPast },
              dotAnimStyle,
            ]}
          />
          {!isLast && <View style={styles.connectorLine} />}
        </View>

        {/* Card */}
        <Animated.View
          entering={FadeInDown.delay(index * 60).duration(300).springify().damping(18)}
          style={[styles.card, cardShadow]}
        >
          {/* Row 1 — name + category icon */}
          <View style={styles.nameRow}>
            <Text style={[Ty.activityName, styles.nameFlex]} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.catIcon}>{catIcon}</Text>
          </View>

          {/* Row 2 — tags */}
          {allTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContent}
            >
              {allTags.map((tag, i) => {
                const s = resolveTagStyle(tag, tag === 'MUST DO');
                return (
                  <Pressable
                    key={i}
                    style={[styles.tagPill, { backgroundColor: s.bg }]}
                    onPress={() => {/* gentle press feedback only */}}
                  >
                    <Text style={[Ty.tag, { color: s.color, textTransform: 'uppercase' }]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Row 3 — opening hours */}
          {hours ? (
            <View style={styles.hoursRow}>
              <Text style={styles.rowIcon}>🕐</Text>
              <Text style={styles.hoursText}>{hours}</Text>
              {hoursVerified
                ? <View style={styles.verifiedDot} />
                : <Text style={styles.estLabel}>est.</Text>
              }
            </View>
          ) : null}

          {/* Row 4 — description */}
          <View style={styles.descBlock}>
            <Text
              style={Ty.body}
              numberOfLines={expanded ? undefined : 3}
            >
              {description}
            </Text>
            {descNeedsExpand && !expanded && (
              <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
                <Text style={styles.readMore}>Read more</Text>
              </Pressable>
            )}
            {descNeedsExpand && expanded && (
              <Pressable onPress={() => setExpanded(false)} hitSlop={8}>
                <Text style={styles.readMore}>Show less</Text>
              </Pressable>
            )}
          </View>

          {/* Row 5 — duration + cost + location */}
          {(duration || cost || activity.location) ? (
            <View style={styles.metaRow}>
              {duration ? (
                <View style={styles.metaItem}>
                  <Text style={styles.rowIcon}>⏱</Text>
                  <Text style={Ty.meta}>{duration}</Text>
                </View>
              ) : null}
              {cost ? (
                <View style={styles.metaItem}>
                  <Text style={styles.rowIcon}>🔥</Text>
                  <Text style={[Ty.meta, { color: C.gold }]}>{cost}</Text>
                </View>
              ) : null}
              {activity.location ? (
                <View style={[styles.metaItem, { flex: 1 }]}>
                  <Text style={styles.rowIcon}>📍</Text>
                  <Text style={[Ty.meta, { flex: 1 }]} numberOfLines={1}>
                    {activity.location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Row 6 — photo */}
          {photo ? <ActivityPhoto url={photo} label={name} /> : null}

          {/* Row 7 — action pills */}
          {showActions ? (
            <View style={styles.actionRow}>
              {mapsUrl ? (
                <Pressable
                  onPress={handleMaps}
                  style={[styles.actionPill, { backgroundColor: C.blueTint }]}
                >
                  <Text style={styles.rowIcon}>📍</Text>
                  <Text style={[styles.actionLabel, { color: '#2563AB' }]}>Maps</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleKnowMore}
                style={[styles.actionPill, { backgroundColor: C.greenTint }]}
              >
                <Text style={styles.rowIcon}>🔍</Text>
                <Text style={[styles.actionLabel, { color: C.textMuted }]}>Know more</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Row 8 — warning bar */}
          {warning ? (
            <View style={styles.warningBar}>
              <Text style={styles.rowIcon}>⚠️</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* Transit chip */}
      {transit ? <TransitChip transit={transit} /> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: Sp.m,
    marginBottom: Sp.sm,
  },
  timeCol: {
    width: 58,
    paddingTop: 3,
    alignItems: 'flex-end',
    paddingRight: Sp.xs,
  },
  connectorCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: C.lineColor,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: R.l,
    padding: Sp.m,
    marginLeft: Sp.sm,
    marginBottom: Sp.s,
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Sp.s,
  },
  nameFlex: { flex: 1 },
  catIcon: { fontSize: 16, marginTop: 2 },

  // Tags
  tagsScroll: { marginTop: Sp.s },
  tagsContent: { gap: Sp.xs, paddingRight: Sp.xs },
  tagPill: {
    paddingHorizontal: Sp.s,
    paddingVertical: 4,
    borderRadius: R.full,
  },

  // Hours
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Sp.s,
    gap: 5,
  },
  hoursText: { fontFamily: F.dm, fontSize: 12, color: C.textMuted },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.sage,
    marginLeft: 3,
  },
  estLabel: {
    fontFamily: F.dm,
    fontSize: 11,
    color: C.textLight,
    fontStyle: 'italic',
    marginLeft: 3,
  },

  // Description
  descBlock: { marginTop: Sp.s },
  readMore: {
    fontFamily: F.dmMd,
    fontSize: 12,
    color: C.gold,
    marginTop: 3,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Sp.s,
    gap: Sp.m,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rowIcon: { fontSize: 12 },

  // Photo
  photoWrapper: {
    marginTop: Sp.sm,
    borderRadius: R.m,
    overflow: 'hidden',
    height: 148,
  },
  photo: { width: '100%', height: 148 },

  // Action pills
  actionRow: {
    flexDirection: 'row',
    gap: Sp.s,
    marginTop: Sp.sm,
    flexWrap: 'wrap',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Sp.sm,
    paddingVertical: 6,
    borderRadius: R.full,
  },
  actionLabel: { fontFamily: F.dmMd, fontSize: 12, letterSpacing: 0.2 },

  // Warning
  warningBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.coralTint,
    borderRadius: R.s,
    padding: Sp.s,
    marginTop: Sp.sm,
    gap: 6,
  },
  warningText: {
    fontFamily: F.dm,
    fontSize: 12,
    color: '#C0432A',
    flex: 1,
    lineHeight: 17,
  },

  // Transit chip
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Sp.m,
    paddingVertical: Sp.xs,
    marginBottom: Sp.xs,
  },
  transitLine: { flex: 1, height: 1, backgroundColor: C.divider },
  transitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.neutralTint,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginHorizontal: Sp.s,
  },
  transitIcon: { fontSize: 12 },
  transitText: { fontFamily: F.dm, fontSize: 11, color: C.textMuted },
});
