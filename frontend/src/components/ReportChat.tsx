import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useReportChat } from '../hooks/useReportChat';

interface ReportChatProps {
  reportId: string;
  currentUserId: string;
}

function TypingDots({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: color,
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
}

export default function ReportChat({ reportId, currentUserId }: ReportChatProps) {
  const { colors } = useTheme();
  const { isAnonymous, toggleAnonymous } = useAuth();
  const [inputText, setInputText] = useState('');
  const {
    messages,
    loading,
    connected,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
  } = useReportChat(reportId, isAnonymous);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
    stopTyping();
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.trim()) startTyping();
    else stopTyping();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        scrollArea: {
          flex: 1,
        },
        messagesArea: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.xxl,
        },
        emptyText: {
          ...typography.bodySmall,
          color: colors.textMuted,
          marginTop: spacing.sm,
        },
        messageRow: {
          flexDirection: 'row',
          marginBottom: spacing.sm,
          alignItems: 'flex-end',
        },
        ownMessageRow: { justifyContent: 'flex-end' },
        otherMessageRow: { justifyContent: 'flex-start' },
        avatar: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 6,
        },
        avatarAnon: { backgroundColor: colors.lightGray },
        avatarText: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.text,
        },
        avatarTextAnon: { color: colors.textMuted },
        bubble: {
          maxWidth: '72%',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
        },
        ownBubble: {
          backgroundColor: colors.interactiveBg,
          borderBottomRightRadius: 4,
        },
        otherBubble: {
          backgroundColor: colors.surfaceGray,
          borderBottomLeftRadius: 4,
        },
        senderName: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 2,
        },
        messageText: {
          ...typography.bodySmall,
          color: colors.text,
          lineHeight: 18,
        },
        ownMessageText: { color: colors.interactiveText },
        timestamp: {
          fontSize: 10,
          color: colors.textMuted,
          marginTop: 2,
        },
        ownTimestamp: { color: colors.interactiveText + 'AA' },
        typingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 34,
          marginBottom: spacing.xs,
        },
        typingBubble: {
          backgroundColor: colors.surfaceGray,
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: 8,
          gap: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        anonButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surfaceGray,
        },
        anonButtonActive: { backgroundColor: colors.interactiveBg },
        input: {
          flex: 1,
          backgroundColor: colors.surfaceGray,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 9 : 7,
          maxHeight: 80,
          ...typography.bodySmall,
          lineHeight: 18,
          color: colors.text,
        },
        sendButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.interactiveBg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sendButtonDisabled: { backgroundColor: colors.surfaceGray },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xxl,
        },
      }),
    [colors]
  );

  const renderMessage = (item: any) => {
    const isOwnMessage = item.user_id === currentUserId;
    const isAnon = item.is_anonymous && !isOwnMessage;

    return (
      <View
        key={item.id}
        style={[
          styles.messageRow,
          isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isOwnMessage && (
          <View style={[styles.avatar, isAnon && styles.avatarAnon]}>
            <Text style={[styles.avatarText, isAnon && styles.avatarTextAnon]}>
              {isAnon ? '?' : item.user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.senderName}>
              {isAnon ? 'Anonymous' : item.user?.name || 'Unknown'}
            </Text>
          )}
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const recentMessages = messages.slice(-30);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.messagesArea}>
          {recentMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            <>
              {recentMessages.map(renderMessage)}
              {typingUsers.length > 0 && (
                <View style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <TypingDots color={colors.textMuted} />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.anonButton, isAnonymous && styles.anonButtonActive]}
          onPress={toggleAnonymous}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isAnonymous ? 'eye-off' : 'eye-off-outline'}
            size={18}
            color={isAnonymous ? colors.interactiveText : colors.textMuted}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={isAnonymous ? 'Anonymous message...' : 'Say something...'}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={inputText.trim() ? colors.interactiveText : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
