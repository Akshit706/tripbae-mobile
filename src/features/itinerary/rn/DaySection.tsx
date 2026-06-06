import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F, Sp, R, Ty, cardShadow } from './theme';
import { ActivityCard, Activity, Transit } from './ActivityCard';

// ─── Types ────────────────────────────────────────────────────
export interface DayData {
  date: string;
  theme: string;
  tempHigh: number;
  tempLow: number;
  budget: string;
  localTip?: string;
  activities: Activity[];
  transits?: Transit[];
}

interface Props {
  day: DayData;
  dayIndex: number;
  destination: string;
}

// ─── Detect the current active activity ───────────────────────
function isCurrentSlot(time: string, endTime?: string): boolean {
  if (!endTime) return false;
  const parseTime = (t: string): Date => {
    const [tp, period] = t.split(' ');
    const [h, m] = tp.split(':').map(Number);
    let hours = h;
    if (period === 'PM' && h !== 12) hours += 12;
    if (period === 'AM' && h === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, m, 0, 0);
    return d;
  };
  const now = new Date();
  return now >= parseTime(time) && now <= parseTime(endTime);
}

// ─── DaySection ───────────────────────────────────────────────
export function DaySection({ day, dayIndex, destination }: Props) {
  const { date, theme, tempHigh, tempLow, budget, localTip, activities, transits } = day;

  return (
    <View style={styles.container}>
      {/* ── Day header: gold left border, date, italic theme ── */}
      <View style={styles.header}>
        <View style={styles.goldBar} />
        <View style={styles.headerBody}>
          <View style={styles.headerTopRow}>
            <Text style={Ty.sectionDate}>{date}</Text>
            <View style={styles.tempRow}>
              <Text style={styles.tempHigh}>{tempHigh}°</Text>
              <Text style={styles.tempLow}> / {tempLow}°</Text>
            </View>
          </View>
          <View style={styles.headerBottomRow}>
            <Text style={Ty.dayTheme} numberOfLines={1}>{theme}</Text>
            <View style={styles.budgetPill}>
              <Text style={styles.budgetText}>{budget}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Local insider tip ── */}
      {localTip ? (
        <View style={styles.localTip}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>{localTip}</Text>
        </View>
      ) : null}

      {/* ── Activity cards ── */}
      <View>
        {activities.map((activity, i) => {
          const transit = transits?.find(t => t.after === i);
          return (
            <ActivityCard
              key={i}
              activity={activity}
              index={i}
              isLast={i === activities.length - 1}
              isActive={isCurrentSlot(activity.time, activity.endTime)}
              transit={transit}
              destination={destination}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: Sp.l,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(250,248,244,0.97)',
    paddingVertical: Sp.sm,
    paddingRight: Sp.m,
    marginBottom: Sp.sm,
  },
  goldBar: {
    width: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginHorizontal: Sp.m,
  },
  headerBody: { flex: 1 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  headerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Sp.s,
  },
  tempRow: { flexDirection: 'row', alignItems: 'baseline' },
  tempHigh: { fontFamily: F.dmMd, fontSize: 13, color: C.coral },
  tempLow:  { fontFamily: F.dm,   fontSize: 12, color: C.textMuted },
  budgetPill: {
    backgroundColor: C.goldTint,
    borderRadius: R.full,
    paddingHorizontal: Sp.s,
    paddingVertical: 3,
    flexShrink: 0,
  },
  budgetText: { fontFamily: F.dmMd, fontSize: 12, color: C.gold },

  // Local tip
  localTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBF5',
    marginHorizontal: Sp.m,
    marginBottom: Sp.sm,
    borderRadius: R.m,
    padding: Sp.s,
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
  },
  tipIcon: { fontSize: 13, marginTop: 1 },
  tipText: {
    fontFamily: F.dm,
    fontSize: 12,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
