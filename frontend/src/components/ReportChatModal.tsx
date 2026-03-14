import React, { useMemo, useEffect, useRef } from 'react';
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
import ReportChat from './ReportChat';
import { reportChatAPI } from '../services/api';

const REPORT_ICONS: Record<string, string> = {
  hazard: 'warning-outline',
  food_status: 'restaurant-outline',
  campus_update: 'school-outline',
  safety: 'shield-outline',
  accessibility: 'accessibility-outline',
};

interface ReportChatModalProps {
  visible: boolean;
  onClose: () => void;
  report: {
    id: string;
    type: string;
    content?: string | null;
    created_at: string;
  } | null;
}

export default function ReportChatModal({ visible, onClose, report }: ReportChatModalProps) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Mark as read when modal opens
  const lastMarkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (visible && report?.id && report.id !== lastMarkedRef.current) {
      lastMarkedRef.current = report.id;
      reportChatAPI.markAsRead(report.id).catch(() => {});
    }
    if (!visible) {
      lastMarkedRef.current = null;
    }
  }, [visible, report?.id]);

  const typeLabel = report
    ? (report.type || 'report').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : '';

  const iconName = report ? (REPORT_ICONS[report.type] || 'flag-outline') : 'flag-outline';

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

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
        reportIcon: {
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
        reportContent: {
          ...typography.bodySmallMedium,
          color: colors.text,
        },
        reportMeta: {
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

  if (!report || !user) return null;

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
            <View style={styles.reportIcon}>
              <Ionicons name={iconName as any} size={20} color={colors.text} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.reportContent} numberOfLines={2}>
                {report.content || typeLabel}
              </Text>
              <Text style={styles.reportMeta}>
                {typeLabel} · {formatTime(report.created_at)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.chatContainer, { paddingBottom: insets.bottom }]}>
            <ReportChat reportId={report.id} currentUserId={user.id} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
