import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

function LollipopPin({ color }: { color: string }) {
  const HEAD = 20;
  const STICK_W = 3;
  const STICK_H = 13;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: HEAD, height: HEAD, borderRadius: HEAD / 2, backgroundColor: color }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', position: 'absolute', top: 3, left: 4 }} />
      </View>
      <View style={{ width: STICK_W, height: STICK_H, backgroundColor: color, borderBottomLeftRadius: STICK_W / 2, borderBottomRightRadius: STICK_W / 2, marginTop: -1 }} />
    </View>
  );
}

interface SelectTypeScreenProps {
  navigation: any;
  route?: any;
}

export default function SelectTypeScreen({ navigation, route }: SelectTypeScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const prefillLocation = route?.params?.prefillLocation;

  const options = useMemo(() => [
    {
      key: 'pin',
      icon: 'location',
      title: 'Pin',
      subtitle: 'Mark a place',
      description: 'Bathrooms, study spots, food, charging stations, and more',
      tint: colors.text,
      tags: ['Bathroom', 'Food', 'Study', 'Charging'],
      onPress: () => navigation.navigate('PlacePin', prefillLocation ? { prefillLocation } : undefined),
    },
    {
      key: 'event',
      icon: 'calendar',
      title: 'Event',
      subtitle: 'Plan a gathering',
      description: 'Meetups, parties, study groups, and activities near you',
      tint: colors.accent,
      tags: ['Meetup', 'Party', 'Study group', 'Activity'],
      onPress: () => navigation.navigate('PlacePin', { forEvent: true, ...(prefillLocation ? { prefillLocation } : {}) }),
    },
    {
      key: 'report',
      icon: 'flag',
      title: 'Report',
      subtitle: 'Flag something',
      description: 'Hazards, safety concerns, campus updates, or general notes',
      tint: colors.warning,
      tags: ['Hazard', 'Safety', 'Campus', 'General'],
      onPress: () => navigation.navigate('PlacePin', { forReport: true, ...(prefillLocation ? { prefillLocation } : {}) }),
    },
  ], [colors, navigation, prefillLocation]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface },

        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        },
        closeButton: {
          width: 32,
          height: 32,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerSpacer: { width: 32 },
        headerCenter: { flex: 1, alignItems: 'center' },
        headerLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, fontSize: 11, textTransform: 'uppercase' as const },

        content: {
          flex: 1,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
        },

        heading: {
          ...typography.h2,
          color: colors.text,
          letterSpacing: -0.8,
          marginBottom: spacing.xs,
          fontSize: 26,
        },
        subheading: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginBottom: spacing.md,
          lineHeight: 18,
          fontSize: 14,
        },

        cardsContainer: {
          flexGrow: 0,
          gap: spacing.sm,
        },

        // ── Option card ──
        card: {
          borderRadius: borderRadius.xl,
          padding: spacing.md,
          justifyContent: 'flex-start',
          backgroundColor: colors.surfaceGray,
          overflow: 'hidden' as const,
          minHeight: 138,
        },

        cardTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        cardIconWrap: {
          width: 42,
          height: 42,
          borderRadius: borderRadius.md,
          justifyContent: 'center',
          alignItems: 'center',
        },
        cardArrow: {
          width: 32,
          height: 32,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        },

        cardBottom: {
          gap: 4,
          marginTop: spacing.sm,
        },
        cardTitle: {
          ...typography.h4,
          color: colors.text,
          fontSize: 18,
          letterSpacing: -0.3,
        },
        cardSubtitle: {
          ...typography.caption,
          color: colors.textSecondary,
          fontWeight: '500',
          fontSize: 11,
        },
        cardTagRow: {
          flexDirection: 'row',
          flexWrap: 'wrap' as const,
          gap: 5,
          marginTop: spacing.xs,
        },
        cardTag: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surface,
        },
        cardTagText: {
          ...typography.caption,
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: '500',
        },
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={s.headerSpacer} />
        <View style={s.headerCenter}>
          <Text style={s.headerLabel}>New</Text>
        </View>
        <TouchableOpacity style={s.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <Text style={s.heading}>What are you{'\n'}adding?</Text>
        <Text style={s.subheading}>Share something useful with your community</Text>

        <View style={s.cardsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={s.card}
              onPress={opt.onPress}
              activeOpacity={0.75}
            >
              <View style={s.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={[s.cardIconWrap, { backgroundColor: opt.tint + '18' }]}>
                    {opt.key === 'pin' ? (
                      <LollipopPin color={opt.tint} />
                    ) : (
                      <Ionicons name={opt.icon as any} size={20} color={opt.tint} />
                    )}
                  </View>
                  <Text style={s.cardTitle}>{opt.title}</Text>
                </View>
                <View style={s.cardArrow}>
                  <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
                </View>
              </View>

              <View style={s.cardBottom}>
                <Text style={s.cardSubtitle}>{opt.description}</Text>
                <View style={s.cardTagRow}>
                  {opt.tags.map((tag) => (
                    <View key={tag} style={s.cardTag}>
                      <Text style={s.cardTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: insets.bottom + spacing.lg }} />
      </View>
    </View>
  );
}
