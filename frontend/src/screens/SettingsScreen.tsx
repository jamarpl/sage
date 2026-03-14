import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { spacing, typography, borderRadius } from '../constants/theme';
import { scheduleContributionReminder } from '../hooks/usePushNotifications';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDarkMode, setTheme } = useTheme();
  const { isAnonymous, toggleAnonymous, logout, deleteAccount } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { showAlert } = useAlert();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          // Match the header bar so the whole page feels like one surface
          backgroundColor: themeColors.surface,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          marginBottom: spacing.sm,
          // Match ProfileScreen: header sits on the same surface as the page
          backgroundColor: themeColors.surface,
        },
        headerSpacer: {
          width: 40,
        },
        title: {
          ...typography.h3,
          color: themeColors.text,
        },
        section: {
          marginHorizontal: spacing.md,
          marginTop: spacing.md,
          marginBottom: spacing.xs,
          borderRadius: borderRadius.lg,
          // Match ProfileScreen tiles/sections: soft card on top of surface
          backgroundColor: themeColors.surfaceGray,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: themeColors.border,
          overflow: 'hidden',
        },
        sectionTitle: {
          ...typography.captionMedium,
          color: themeColors.textMuted,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        optionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: themeColors.border,
        },
        optionLabel: {
          ...typography.body,
          color: themeColors.text,
        },
        optionDescription: {
          ...typography.caption,
          color: themeColors.textSecondary,
          marginTop: 2,
        },
        linkRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: themeColors.border,
        },
        linkLabel: {
          ...typography.body,
          color: themeColors.text,
        },
        destructiveLabel: {
          ...typography.body,
          color: themeColors.error,
        },
        versionText: {
          ...typography.caption,
          color: themeColors.textMuted,
          textAlign: 'center',
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        },
        backButton: {
          width: 40,
          height: 40,
          borderRadius: 9999,
          backgroundColor: themeColors.surfaceGray,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [themeColors, isDarkMode]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.optionRow}>
            <View>
              <Text style={styles.optionLabel}>Dark Mode</Text>
              <Text style={styles.optionDescription}>Use the dark interface style</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
              trackColor={{
                false: themeColors.borderDark,
                true: themeColors.accentTint30,
              }}
              thumbColor={isDarkMode ? themeColors.accent : themeColors.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.optionRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.optionLabel}>Anonymous Mode</Text>
              <Text style={styles.optionDescription}>
                Your name will appear as "Anonymous" in chats and reports
              </Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={toggleAnonymous}
              trackColor={{
                false: themeColors.borderDark,
                true: themeColors.accentTint30,
              }}
              thumbColor={isAnonymous ? themeColors.accent : themeColors.textMuted}
            />
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer</Text>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={async () => {
                // Schedules a test notification in 5 seconds — background the app to see it
                let Notifications: any;
                try { Notifications = require('expo-notifications'); } catch { return; }
                await Notifications.cancelAllScheduledNotificationsAsync();
                await Notifications.scheduleNotificationAsync({
                  content: { title: 'Push is working! 📍', body: 'Community Map push notifications are set up correctly.' },
                  trigger: { type: 'timeInterval', seconds: 5, repeats: false },
                });
                Alert.alert('Test sent', 'Background the app — a notification will arrive in 5 seconds.');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.linkLabel}>Test push notification</Text>
              <Ionicons name="notifications-outline" size={16} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('mailto:kimanimac56@gmail.com?subject=Feedback')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Send feedback</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('TermsOfService')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              Alert.alert('Log out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: () => logout() },
              ])
            }
            activeOpacity={0.7}
          >
            <Text style={styles.destructiveLabel}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              showAlert(
                'Delete account',
                'This will permanently delete your account, all your pins, reports, and events. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      showAlert(
                        'Are you sure?',
                        'Your account and all data will be deleted immediately.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Yes, delete',
                            style: 'destructive',
                            onPress: async () => {
                              setDeletingAccount(true);
                              try {
                                await deleteAccount();
                              } catch (err: any) {
                                setDeletingAccount(false);
                                Alert.alert('Error', err?.message || 'Failed to delete account. Please try again.');
                              }
                            },
                          },
                        ]
                      ),
                  },
                ]
              )
            }
            disabled={deletingAccount}
            activeOpacity={0.7}
          >
            {deletingAccount
              ? <ActivityIndicator size="small" color={themeColors.error ?? '#EF4444'} />
              : <Text style={styles.destructiveLabel}>Delete account</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version {(require('../../app.json')?.expo?.version) ?? '—'}</Text>
      </ScrollView>
    </View>
  );
}
