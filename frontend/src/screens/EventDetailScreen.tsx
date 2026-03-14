import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { spacing, typography, borderRadius } from '../constants/theme';
import { eventAPI, savedAPI, reviewAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import EventChat from '../components/EventChat';

interface EventDetailScreenProps {
  navigation: any;
  route: any;
}

const EVENT_CATEGORIES: any = {
  social: { label: 'Social', icon: 'people', color: '#3DDC91' },
  academic: { label: 'Academic', icon: 'school', color: '#05A357' },
  sports: { label: 'Sports', icon: 'fitness', color: '#E5A200' },
  club: { label: 'Club', icon: 'flag', color: '#9747FF' },
  party: { label: 'Party', icon: 'beer', color: '#E11900' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#757575' },
};

export default function EventDetailScreen({ navigation, route }: EventDetailScreenProps) {
  const { showAlert, showToast } = useAlert();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [userRsvpStatus, setUserRsvpStatus] = useState<'going' | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const eventId = route.params?.eventId;

  useEffect(() => {
    loadEvent();
    loadEventMetadata();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getById(eventId);
      const eventData = response.data?.event || response.event;
      setEvent(eventData);

      if (user && eventData?.attendees) {
        const myRsvp = eventData.attendees.find(
          (a: any) => a.user_id === user.id && a.status === 'going'
        );
        setUserRsvpStatus(myRsvp ? 'going' : null);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      showAlert('Failed to load event', 'Could not load event details. Try again?', [
        { text: 'Go back', style: 'cancel', onPress: () => navigation.goBack() },
        { text: 'Retry', onPress: () => loadEvent() },
      ]);
    } finally { setLoading(false); }
  };

  const loadEventMetadata = async () => {
    try {
      const savedResponse = await savedAPI.checkSaved('event', eventId);
      setIsSaved(savedResponse.data?.isSaved || false);
      const reviewsResponse = await reviewAPI.getReviews('event', eventId);
      setAverageRating(reviewsResponse.data?.rating?.average || 0);
      setReviewCount(reviewsResponse.data?.rating?.count || 0);
    } catch (error) {
      console.error('Error loading event metadata:', error);
    }
  };

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        await savedAPI.unsaveItem('event', eventId);
        setIsSaved(false);
      } else {
        await savedAPI.saveItem('event', eventId);
        setIsSaved(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        showAlert('Session Expired', 'Please log in again', [{ text: 'Log In', onPress: () => navigation.navigate('Login') }]);
      } else { showToast('Failed to save event', 'error'); }
    }
  };

  const handleRSVP = async () => {
    if (!event) return;
    if (event.max_attendees && event.current_attendees >= event.max_attendees) {
      showAlert('Event Full', 'This event has reached its capacity limit.', [{ text: 'OK' }]);
      return;
    }
    if (event.max_attendees) {
      const spotsLeft = event.max_attendees - event.current_attendees;
      if (spotsLeft <= 5 && spotsLeft > 0) {
        showAlert('Limited Spots', `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} remaining!`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'RSVP Anyway', onPress: () => performRSVP() },
        ]);
        return;
      }
    }
    performRSVP();
  };

  const performRSVP = async () => {
    if (!user) {
      showToast('Please log in to RSVP', 'info');
      return;
    }
    try {
      setRsvpLoading(true);
      await eventAPI.rsvp(eventId, 'going');
      setUserRsvpStatus('going');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadEvent();
      showToast("You're going!", 'success');
    } catch (error: any) {
      if (error.response?.status === 401) {
        showAlert('Session Expired', 'Please log in again to RSVP.', [{ text: 'Log In', onPress: () => navigation.navigate('Login') }]);
      } else if (error.response?.data?.message?.includes('capacity') || error.message?.includes('capacity')) {
        showAlert('Event Full', 'This event has reached its capacity limit.');
      } else {
        showToast(`Failed to RSVP: ${error.response?.data?.message || error.message || 'Unknown error'}`, 'error');
      }
    } finally { setRsvpLoading(false); }
  };

  const handleCancelRSVP = async () => {
    showAlert('Cancel RSVP', 'Are you sure you want to cancel your RSVP?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            setRsvpLoading(true);
            await eventAPI.cancelRsvp(eventId);
            setUserRsvpStatus(null);
            await loadEvent();
            showToast('RSVP cancelled.', 'success');
          } catch (error: any) {
            if (error.response?.status === 401) {
              showAlert('Session Expired', 'Please log in again.', [{ text: 'Log In', onPress: () => navigation.navigate('Login') }]);
            } else { showToast('Failed to cancel RSVP', 'error'); }
          } finally { setRsvpLoading(false); }
        },
      },
    ]);
  };

  const getEventCoordinates = (ev: any): { lat: number; lng: number } | null => {
    let lng, lat;
    if (ev.event_lat !== undefined && ev.event_lng !== undefined) { lng = Number(ev.event_lng); lat = Number(ev.event_lat); }
    else if (ev.location && typeof ev.location === 'object') { lng = Number(ev.location.lng || ev.location.longitude); lat = Number(ev.location.lat || ev.location.latitude); }
    else if (ev.coordinates) {
      if (Array.isArray(ev.coordinates)) { lng = Number(ev.coordinates[0]); lat = Number(ev.coordinates[1]); }
      else { lng = Number(ev.coordinates.lng || ev.coordinates.longitude); lat = Number(ev.coordinates.lat || ev.coordinates.latitude); }
    } else { lng = Number(ev.lng || ev.longitude); lat = Number(ev.lat || ev.latitude); }
    if (isNaN(lng) || isNaN(lat)) return null;
    return { lat, lng };
  };

  const handleStartRoute = () => {
    if (!event) return;
    const coords = getEventCoordinates(event);
    if (!coords) { showToast('Event location not available', 'error'); return; }
    navigation.navigate('Main', { targetLocation: coords, targetName: event.title, startNavigation: true });
  };

  const formatDay = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const getTimeUntil = () => {
    if (!event?.start_time) return null;
    const diff = new Date(event.start_time).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    return `${Math.floor(diff / 60000)}m`;
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '85%',
        },
        handle: {
          alignSelf: 'center',
          width: 36, height: 4,
          borderRadius: 2,
          backgroundColor: colors.lightGray,
          marginTop: 10,
          marginBottom: 6,
        },

        heroSection: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        },
        titleRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        titleText: {
          flex: 1,
          fontSize: 22, fontWeight: '800', color: colors.text,
          lineHeight: 28, letterSpacing: -0.3,
          paddingRight: spacing.sm,
        },
        timeBadge: {
          backgroundColor: colors.surfaceGray,
          paddingHorizontal: 10, paddingVertical: 6,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          minWidth: 48,
        },
        timeBadgeValue: {
          fontSize: 18, fontWeight: '800', color: colors.text,
        },
        timeBadgeLabel: {
          ...typography.caption, color: colors.textMuted, fontSize: 10,
          marginTop: 1,
        },
        subtitleText: {
          ...typography.bodySmall, color: colors.textSecondary,
          marginTop: 6,
        },
        coverContainer: {
          marginHorizontal: spacing.md,
          marginTop: spacing.sm,
          borderRadius: borderRadius.md,
          overflow: 'hidden',
          backgroundColor: colors.surfaceGray,
        },
        coverImage: {
          width: '100%',
          height: 180,
        },

        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.borderLight,
          marginHorizontal: spacing.md,
        },

        infoRow: {
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: spacing.md, paddingHorizontal: spacing.md,
          gap: spacing.md,
        },
        infoIcon: {
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center', alignItems: 'center',
        },
        infoMain: { ...typography.bodySmallMedium, color: colors.text },
        infoSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

        organizerRow: {
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: spacing.md, paddingHorizontal: spacing.md,
          gap: spacing.md,
        },
        avatar: {
          width: 44, height: 44, borderRadius: 22,
          justifyContent: 'center', alignItems: 'center',
        },
        avatarText: { fontWeight: '700', fontSize: 17 },
        orgName: { ...typography.bodySmallMedium, color: colors.text },
        orgSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

        descSection: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        },
        descText: {
          ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22,
        },

        actionsRow: {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
        actionBtn: {
          flex: 1, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center',
          paddingVertical: 12,
          backgroundColor: colors.surfaceGray,
          borderRadius: borderRadius.sm,
          gap: 6,
        },
        actionText: { ...typography.bodySmallMedium, color: colors.text, fontSize: 13 },

        reviewRow: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingVertical: 12, paddingHorizontal: spacing.md,
        },
        starsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        starsRow: { flexDirection: 'row', gap: 1 },

        footer: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
        },
        rsvpBtn: {
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          gap: spacing.xs, paddingVertical: 16, borderRadius: borderRadius.md,
        },
        goingBtn: { backgroundColor: colors.interactiveBg },
        rsvpDisabled: { opacity: 0.4 },
        goingText: { ...typography.button, color: colors.interactiveText },
        cancelRow: {
          flexDirection: 'row', gap: spacing.sm,
        },
        routeBtn: {
          flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          gap: spacing.xs, paddingVertical: 16, borderRadius: borderRadius.md,
          backgroundColor: colors.accentDark,
        },
        routeText: { ...typography.button, color: colors.textLight },
        cancelBtn: {
          flex: 1, justifyContent: 'center', alignItems: 'center',
          paddingVertical: 16, borderRadius: borderRadius.md,
          backgroundColor: colors.surfaceGray,
        },
        cancelText: { ...typography.button, color: colors.error },
        chatModal: { flex: 1, backgroundColor: colors.surface },
        chatHeader: {
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
        },
        chatHeaderBtn: {
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.surfaceGray,
          justifyContent: 'center', alignItems: 'center',
        },
        chatHeaderCenter: { flex: 1, alignItems: 'center' },
        chatHeaderTitle: { ...typography.h4, color: colors.text },
        chatHeaderSpacer: { width: 36 },
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[s.sheet, { paddingVertical: spacing.xxl, alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[s.sheet, { paddingVertical: spacing.xxl, alignItems: 'center' }]}>
          <Text style={{ ...typography.body, color: colors.error }}>Event not found</Text>
        </View>
      </View>
    );
  }

  const cat = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.other;
  const isAtCapacity = event.max_attendees && event.current_attendees >= event.max_attendees;
  const isEventEnded = event.end_time && new Date(event.end_time) < new Date();
  const current = event.current_attendees || 0;
  const timeUntil = getTimeUntil();
  const eventCoverUri = event.photo_url || event.photoUrl || null;

  return (
    <View style={s.overlay}>
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={s.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Hero: title + time badge */}
          <View style={s.heroSection}>
            <View style={s.titleRow}>
              <Text style={s.titleText}>{event.title}</Text>
              {isEventEnded ? (
                <View style={[s.timeBadge, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[s.timeBadgeValue, { color: colors.textMuted }]}>Ended</Text>
                </View>
              ) : timeUntil ? (
                <View style={s.timeBadge}>
                  <Text style={s.timeBadgeValue}>{timeUntil}</Text>
                  <Text style={s.timeBadgeLabel}>away</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.subtitleText}>
              {cat.label}
              {event.creator ? ` · ${event.creator.name || 'Unknown'}` : ''}
              {` · ${current} going`}
            </Text>
          </View>
          {eventCoverUri ? (
            <View style={s.coverContainer}>
              <Image source={{ uri: eventCoverUri }} style={s.coverImage} resizeMode="cover" />
            </View>
          ) : null}

          <View style={s.divider} />

          {/* Organizer + save */}
          <View style={s.organizerRow}>
            {event.creator ? (
              <>
                <View style={[s.avatar, { backgroundColor: cat.color + '18' }]}>
                  <Text style={[s.avatarText, { color: cat.color }]}>
                    {event.creator.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.orgName}>{event.creator.name || 'Unknown'}</Text>
                  <Text style={s.orgSub}>
                    Organizer{event.creator.reputation_score ? ` · ${event.creator.reputation_score} rep` : ''}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity onPress={handleToggleSave} activeOpacity={0.7}>
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? colors.accent : colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.divider} />

          {/* Date + Location info rows */}
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoMain}>{formatDay(event.start_time)}</Text>
              <Text style={s.infoSub}>{formatTime(event.start_time)} – {formatTime(event.end_time)}</Text>
            </View>
          </View>

          {event.location_name && (
            <TouchableOpacity style={s.infoRow} onPress={handleStartRoute} activeOpacity={0.7}>
              <View style={s.infoIcon}>
                <Ionicons name="location-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoMain}>{event.location_name}</Text>
                {(event.building || event.room) && (
                  <Text style={s.infoSub}>
                    {[event.building, event.room && `Room ${event.room}`].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {event.max_attendees && (
            <View style={s.infoRow}>
              <View style={s.infoIcon}>
                <Ionicons name="people-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoMain}>{current} / {event.max_attendees}</Text>
                <Text style={s.infoSub}>
                  {isAtCapacity ? 'Event is full' : `${event.max_attendees - current} spots left`}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {event.description ? (
            <>
              <View style={s.divider} />
              <View style={s.descSection}>
                <Text style={s.descText}>{event.description}</Text>
              </View>
            </>
          ) : null}

          <View style={s.divider} />

          {/* Action buttons */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => setChatVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
              <Text style={s.actionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => navigation.navigate('CreateReview', { itemType: 'event', itemId: eventId, itemTitle: event.title })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={s.actionText}>Review</Text>
            </TouchableOpacity>
            {reviewCount > 0 && (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => navigation.navigate('ItemReviews', { itemType: 'event', itemId: eventId, itemTitle: event.title })}
                activeOpacity={0.7}
              >
                <View style={s.starsRow}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                </View>
                <Text style={s.actionText}>{averageRating.toFixed(1)} ({reviewCount})</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={s.footer}>
          {isEventEnded ? (
            <TouchableOpacity style={[s.rsvpBtn, s.goingBtn, s.rsvpDisabled]} disabled activeOpacity={1}>
              <Text style={[s.goingText, { color: colors.textMuted }]}>Event ended</Text>
            </TouchableOpacity>
          ) : userRsvpStatus === 'going' ? (
            <View style={s.cancelRow}>
              <TouchableOpacity style={s.routeBtn} onPress={handleStartRoute} disabled={rsvpLoading} activeOpacity={0.8}>
                <Ionicons name="navigate" size={18} color={colors.textLight} />
                <Text style={s.routeText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRSVP} disabled={rsvpLoading} activeOpacity={0.7}>
                {rsvpLoading ? <ActivityIndicator color={colors.error} /> : <Text style={s.cancelText}>Cancel</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.rsvpBtn, s.goingBtn, isAtCapacity && s.rsvpDisabled]}
              onPress={handleRSVP} disabled={rsvpLoading || isAtCapacity} activeOpacity={0.8}
            >
              {rsvpLoading ? (
                <ActivityIndicator color={colors.interactiveText} />
              ) : (
                <Text style={s.goingText}>{isAtCapacity ? 'Event full' : "I'm going"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={chatVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={s.chatModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.chatHeader, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity
              style={s.chatHeaderBtn}
              onPress={() => setChatVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={s.chatHeaderCenter}>
              <Text style={s.chatHeaderTitle}>Event Chat</Text>
            </View>
            <View style={s.chatHeaderSpacer} />
          </View>
          {user && (
            <EventChat eventId={eventId} currentUserId={user.id} />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
