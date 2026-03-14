import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { eventChatAPI } from '../services/api';
import EventChat from './EventChat';

interface EventChatModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    category?: string;
  } | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  social: 'people-outline',
  academic: 'book-outline',
  sports: 'football-outline',
  club: 'ribbon-outline',
  party: 'musical-notes-outline',
  music: 'headset-outline',
  other: 'calendar-outline',
};

export default function EventChatModal({ visible, onClose, event }: EventChatModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const iconName = event ? (CATEGORY_ICONS[event.category || ''] || 'calendar-outline') : 'calendar-outline';
  const categoryLabel = event?.category
    ? event.category.charAt(0).toUpperCase() + event.category.slice(1)
    : 'Event';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: borderRadius.xxl,
          borderTopRightRadius: borderRadius.xxl,
          height: '75%',
          ...shadows.sheet,
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
          alignItems: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        },
        eventIcon: {
          width: 40,
          height: 40,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerInfo: {
          flex: 1,
        },
        eventTitle: {
          ...typography.bodySmallMedium,
          color: colors.text,
        },
        eventMeta: {
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: 2,
        },
        closeButton: {
          width: 36,
          height: 36,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        chatContainer: {
          flex: 1,
        },
      }),
    [colors]
  );

  // Mark event chat as read when the modal opens
  useEffect(() => {
    if (visible && event?.id) {
      eventChatAPI.markAsRead(event.id).catch(() => {});
    }
  }, [visible, event?.id]);

  if (!event || !user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.eventIcon}>
              <Ionicons name={iconName as any} size={20} color={colors.text} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={styles.eventMeta}>{categoryLabel} · Event chat</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.chatContainer, { paddingBottom: insets.bottom }]}>
            <EventChat eventId={event.id} currentUserId={user.id} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
