import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { reportAPI } from '../services/api';

interface ReportItem {
  id: string;
  type: string;
  content?: string | null;
  created_at: string;
  image_url?: string | null;
  [key: string]: unknown;
}

interface ReportCluster {
  reports: ReportItem[];
  summary: string;
  centroid: { lat: number; lng: number };
}

interface ReportsListModalProps {
  visible: boolean;
  onClose: () => void;
  pinId?: string;
  pinTitle?: string;
  lat: number;
  lng: number;
  onRequestWriteReport?: () => void;
}

export default function ReportsListModal({
  visible,
  onClose,
  pinId,
  pinTitle,
  lat,
  lng,
  onRequestWriteReport,
}: ReportsListModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [clusters, setClusters] = useState<ReportCluster[]>([]);
  const [flatReports, setFlatReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [writeReportTappable, setWriteReportTappable] = useState(false);

  const isPinMode = !!pinId;

  useEffect(() => {
    if (!visible) {
      setWriteReportTappable(false);
      return;
    }
    const t = setTimeout(() => setWriteReportTappable(true), 400);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (pinId) {
        loadByPin();
      } else if (lat && lng) {
        loadClusters();
      }
    }
  }, [visible, pinId, lat, lng]);

  const loadByPin = async () => {
    if (!pinId) return;
    setLoading(true);
    try {
      const response = await reportAPI.getByPin(pinId);
      const data = response?.data ?? response;
      setFlatReports(data?.reports || []);
      setClusters([]);
    } catch {
      setFlatReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClusters = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getNearbyClustered(lat, lng, 500);
      const data = response?.data ?? response;
      setClusters(data?.clusters || []);
      setFlatReports([]);
    } catch {
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const formatAbsoluteTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
        modalContent: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
          maxHeight: '70%',
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
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
        },
        title: { ...typography.h3, color: colors.text },
        closeButton: {
          width: 36,
          height: 36,
          borderRadius: borderRadius.round,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
        listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
        clusterCard: {
          backgroundColor: colors.surfaceGray,
          borderRadius: borderRadius.sm,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        clusterSummary: { ...typography.bodyMedium, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
        clusterMeta: { ...typography.caption, color: colors.textSecondary },
        reportItem: {
          paddingVertical: spacing.sm,
          paddingLeft: spacing.md,
          borderLeftWidth: 2,
          borderLeftColor: colors.border,
          marginTop: spacing.sm,
        },
        reportItemWithImage: { flexDirection: 'row', alignItems: 'flex-start' },
        reportImage: {
          width: 60,
          height: 60,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.surfaceGray,
          marginRight: spacing.sm,
        },
        reportContent: { ...typography.bodySmall, color: colors.text, flex: 1 },
        reportTime: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
        emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxl },
        writeReportButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          paddingVertical: 14,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.interactiveBg,
          gap: spacing.sm,
        },
        writeReportText: { ...typography.button, color: colors.interactiveText },
      }),
    [colors]
  );

  const renderReportItem = (r: ReportItem) => (
    <View key={r.id} style={[styles.reportItem, r.image_url && styles.reportItemWithImage]}>
      {r.image_url && <Image source={{ uri: r.image_url }} style={styles.reportImage} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.reportContent}>{r.content || r.type}</Text>
        <Text style={styles.reportTime}>
          {formatTime(r.created_at)} · {formatAbsoluteTime(r.created_at)}
        </Text>
      </View>
    </View>
  );

  const hasData = isPinMode ? flatReports.length > 0 : clusters.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {isPinMode && pinTitle ? `Reports for ${pinTitle}` : isPinMode ? 'Reports' : 'Reports nearby'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {onRequestWriteReport && !isPinMode && (
            <TouchableOpacity
              style={[styles.writeReportButton, !writeReportTappable && { opacity: 0.5 }]}
              disabled={!writeReportTappable}
              onPress={() => writeReportTappable && onRequestWriteReport()}
              activeOpacity={0.8}
            >
              <Ionicons name="flag-outline" size={20} color={colors.interactiveText} />
              <Text style={styles.writeReportText}>Report something</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !hasData ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <Text style={styles.emptyText}>No reports yet.</Text>
              {onRequestWriteReport && !isPinMode && (
                <TouchableOpacity
                  style={[styles.writeReportButton, { marginTop: spacing.md }, !writeReportTappable && { opacity: 0.5 }]}
                  disabled={!writeReportTappable}
                  onPress={() => writeReportTappable && onRequestWriteReport()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flag-outline" size={20} color={colors.interactiveText} />
                  <Text style={styles.writeReportText}>Report something</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : isPinMode ? (
            <FlatList
              data={flatReports}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => renderReportItem(item)}
            />
          ) : (
            <FlatList
              data={clusters}
              keyExtractor={(item) => item.reports[0]?.id || item.summary}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isExpanded = expandedId === item.reports[0]?.id;
                return (
                  <TouchableOpacity
                    style={styles.clusterCard}
                    onPress={() =>
                      setExpandedId(isExpanded ? null : item.reports[0]?.id || null)
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clusterSummary}>{item.summary}</Text>
                    <Text style={styles.clusterMeta}>
                      {item.reports.length} {item.reports.length === 1 ? 'report' : 'reports'} •{' '}
                      {formatTime(item.reports[0]?.created_at || '')}
                    </Text>
                    {isExpanded && item.reports.map((r) => renderReportItem(r))}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
