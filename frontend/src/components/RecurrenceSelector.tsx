import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'custom';
  daysOfWeek?: number[];
  endDate?: string;
}

interface RecurrenceSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (pattern: RecurrencePattern) => void;
  initialPattern?: RecurrencePattern;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'S', full: 'Sun' },
  { value: 1, label: 'M', full: 'Mon' },
  { value: 2, label: 'T', full: 'Tue' },
  { value: 3, label: 'W', full: 'Wed' },
  { value: 4, label: 'T', full: 'Thu' },
  { value: 5, label: 'F', full: 'Fri' },
  { value: 6, label: 'S', full: 'Sat' },
];

const FREQUENCY_OPTIONS: { value: 'daily' | 'weekly'; label: string; icon: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', icon: 'sunny-outline', desc: 'Repeats every day' },
  { value: 'weekly', label: 'Weekly', icon: 'calendar-outline', desc: 'Pick specific days' },
];

export default function RecurrenceSelector({
  visible,
  onClose,
  onSelect,
  initialPattern,
}: RecurrenceSelectorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>(
    initialPattern?.frequency || 'weekly'
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialPattern?.daysOfWeek || [1]
  );

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleConfirm = () => {
    const pattern: RecurrencePattern = {
      frequency,
      daysOfWeek: frequency === 'weekly' ? selectedDays : undefined,
    };
    onSelect(pattern);
    onClose();
  };

  const getPreviewText = () => {
    if (frequency === 'daily') return 'Every day';
    if (frequency === 'weekly' && selectedDays.length > 0) {
      const dayNames = selectedDays.map(d => DAYS_OF_WEEK[d].full).join(', ');
      return `Every ${dayNames}`;
    }
    return 'Select days';
  };

  const isConfirmDisabled = frequency === 'weekly' && selectedDays.length === 0;

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '75%',
        },
        handleBar: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.lightGray,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
        },
        closeButton: {
          width: 36,
          height: 36,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerInfo: { flex: 1, alignItems: 'center' },
        headerTitle: { ...typography.h4, color: colors.text },
        headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
        headerSpacer: { width: 36 },

        scrollView: { paddingHorizontal: spacing.md },

        section: { marginBottom: spacing.lg },
        label: {
          ...typography.bodySmallSemibold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: 12,
          marginBottom: spacing.sm,
        },

        freqRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        freqCard: {
          flex: 1,
          backgroundColor: colors.surfaceGray,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          alignItems: 'center',
          gap: spacing.xs,
        },
        freqCardActive: {
          backgroundColor: colors.interactiveBg,
        },
        freqIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 2,
        },
        freqIconWrapActive: {
          backgroundColor: colors.interactiveText + '20',
        },
        freqLabel: {
          ...typography.bodySmallSemibold,
          color: colors.text,
        },
        freqLabelActive: {
          color: colors.interactiveText,
        },
        freqDesc: {
          ...typography.caption,
          color: colors.textMuted,
          fontSize: 11,
        },
        freqDescActive: {
          color: colors.interactiveText,
          opacity: 0.7,
        },

        daysRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        dayCircle: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        dayCircleActive: {
          backgroundColor: colors.interactiveBg,
        },
        dayText: {
          ...typography.bodySmallSemibold,
          fontSize: 14,
          color: colors.text,
        },
        dayTextActive: {
          color: colors.interactiveText,
        },

        previewCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceGray,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          gap: spacing.sm,
        },
        previewIcon: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.accent + '18',
          justifyContent: 'center',
          alignItems: 'center',
        },
        previewTextWrap: { flex: 1 },
        previewMain: { ...typography.bodySmallSemibold, color: colors.text },
        previewSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

        footer: {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          gap: spacing.sm,
        },
        cancelButton: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          backgroundColor: colors.surfaceGray,
        },
        cancelText: { ...typography.button, color: colors.text },
        confirmButton: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          backgroundColor: colors.interactiveBg,
        },
        confirmDisabled: { opacity: 0.4 },
        confirmText: { ...typography.button, color: colors.interactiveText },
      }),
    [colors]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handleBar} />
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={s.headerInfo}>
              <Text style={s.headerTitle}>Repeat event</Text>
              <Text style={s.headerSubtitle}>Set a recurring schedule</Text>
            </View>
            <View style={s.headerSpacer} />
          </View>

          <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
            <View style={s.section}>
              <Text style={s.label}>Frequency</Text>
              <View style={s.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => {
                  const active = frequency === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.freqCard, active && s.freqCardActive]}
                      onPress={() => setFrequency(opt.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.freqIconWrap, active && s.freqIconWrapActive]}>
                        <Ionicons
                          name={opt.icon as any}
                          size={20}
                          color={active ? colors.interactiveText : colors.text}
                        />
                      </View>
                      <Text style={[s.freqLabel, active && s.freqLabelActive]}>{opt.label}</Text>
                      <Text style={[s.freqDesc, active && s.freqDescActive]}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {frequency === 'weekly' && (
              <View style={s.section}>
                <Text style={s.label}>Repeat on</Text>
                <View style={s.daysRow}>
                  {DAYS_OF_WEEK.map((day) => {
                    const active = selectedDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[s.dayCircle, active && s.dayCircleActive]}
                        onPress={() => toggleDay(day.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.dayText, active && s.dayTextActive]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={s.section}>
              <Text style={s.label}>Preview</Text>
              <View style={s.previewCard}>
                <View style={s.previewIcon}>
                  <Ionicons name="repeat" size={18} color={colors.accent} />
                </View>
                <View style={s.previewTextWrap}>
                  <Text style={s.previewMain}>{getPreviewText()}</Text>
                  <Text style={s.previewSub}>Repeats for up to 90 days</Text>
                </View>
              </View>
            </View>

            <View style={{ height: spacing.md }} />
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity style={s.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmButton, isConfirmDisabled && s.confirmDisabled]}
              onPress={handleConfirm}
              disabled={isConfirmDisabled}
              activeOpacity={0.8}
            >
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
