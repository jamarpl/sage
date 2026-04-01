import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SkeletonBox } from './Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius, shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { eventAPI } from '../services/api';
import {
  shareViaWhatsApp,
  shareViaInstagram,
  shareViaMessages,
  shareViaEmail,
  shareViaSystemDialog,
  copyToClipboard,
  generateShareUrl,
  EventShareData,
} from '../utils/sharing';

interface ShareEventModalProps {
  visible: boolean;
  onClose: () => void;
  event: EventShareData;
}

export default function ShareEventModal({ visible, onClose, event }: ShareEventModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !shareUrl) {
      generateShareLink();
    }
  }, [visible]);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      
      if (event.shareToken) {
        const url = generateShareUrl(event.shareToken);
        setShareUrl(url);
      } else {
        const response = await eventAPI.generateShareToken(event.id);
        const url = response.data?.shareUrl || generateShareUrl(response.data?.shareToken);
        setShareUrl(url);
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareUrl(generateShareUrl(event.id));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    if (!shareUrl) return;

    let success = false;
    switch (platform) {
      case 'whatsapp':
        success = await shareViaWhatsApp(event, shareUrl);
        break;
      case 'instagram':
        success = await shareViaInstagram(event, shareUrl);
        break;
      case 'messages':
        success = await shareViaMessages(event, shareUrl);
        break;
      case 'email':
        success = await shareViaEmail(event, shareUrl);
        break;
      case 'more':
        success = await shareViaSystemDialog(event, shareUrl);
        break;
      case 'copy':
        success = await copyToClipboard(shareUrl);
        break;
    }

    if (success && platform !== 'copy') {
      onClose();
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: borderRadius.xxl,
          borderTopRightRadius: borderRadius.xxl,
          maxHeight: '70%',
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          ...shadows.sheet,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        },
        title: {
          ...typography.h3,
          color: colors.text,
        },
        loadingContainer: {
          padding: spacing.xxl,
          alignItems: 'center',
        },
        loadingText: {
          ...typography.body,
          color: colors.textSecondary,
          marginTop: spacing.md,
        },
        eventInfo: {
          padding: spacing.lg,
        },
        eventTitle: {
          ...typography.h4,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        urlContainer: {
          borderRadius: borderRadius.sm,
          backgroundColor: colors.surfaceGray,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        urlText: {
          ...typography.caption,
          color: colors.textSecondary,
        },
        optionsContainer: {
          paddingHorizontal: spacing.lg,
        },
        optionsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          marginTop: spacing.lg,
        },
        shareOption: {
          width: '30%',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        iconCircle: {
          width: 64,
          height: 64,
          borderRadius: borderRadius.sm,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        optionLabel: {
          ...typography.caption,
          color: colors.text,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Event</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <SkeletonBox width="90%" height={60} radius={12} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                {[0, 1, 2].map((i) => <SkeletonBox key={i} width={64} height={64} radius={12} />)}
              </View>
            </View>
          ) : (
            <>
              {/* Event Info */}
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                {shareUrl && (
                  <View style={styles.urlContainer}>
                    <Text style={styles.urlText} numberOfLines={1}>
                      {shareUrl}
                    </Text>
                  </View>
                )}
              </View>

              {/* Share Options */}
              <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.optionsGrid}>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('whatsapp')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                      <Ionicons name="logo-whatsapp" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.optionLabel}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('instagram')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#E4405F' }]}>
                      <Ionicons name="logo-instagram" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.optionLabel}>Instagram</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('messages')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#0084FF' }]}>
                      <Ionicons name="chatbubble" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.optionLabel}>Messages</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('email')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#EA4335' }]}>
                      <Ionicons name="mail" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.optionLabel}>Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('copy')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.interactiveBg }]}>
                      <Ionicons name="copy" size={28} color={colors.interactiveText} />
                    </View>
                    <Text style={styles.optionLabel}>Copy Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare('more')}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.interactiveBg }]}>
                      <Ionicons name="ellipsis-horizontal" size={28} color={colors.interactiveText} />
                    </View>
                    <Text style={styles.optionLabel}>More</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
