import aiService, { type ParsedIntent } from './ai.service';
import pinService from './pin.service';
import eventService from './event.service';
import reportService from './report.service';
import placeStatusService from './placeStatus.service';

type AppMode = 'open_world' | 'campus';

interface RecommendationRequest {
  query: string;
  location: { lat: number; lng: number };
  radius?: number;
  mode?: AppMode;
}

interface RecommendationSignal {
  statusNow: string;
  accessRules: string[];
  confidence: number;
  reportCount: number;
  lastUpdatedAt: string | null;
  freshnessLabel: string;
}

export interface RecommendationItem {
  kind: 'pin' | 'event';
  title: string;
  distanceMeters: number;
  etaMinutes: number;
  statusNow: string;
  accessRules: string[];
  confidence: number;
  worthItScore: number;
  whyThis: string[];
  item: Record<string, unknown>;
}

export interface RecommendationResult {
  intent: ParsedIntent;
  aiResponse: string;
  mode: AppMode;
  effectiveRadius: number;
  recommendations: RecommendationItem[];
}

interface LatLng {
  lat: number;
  lng: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function getEffectiveRadius(intent: ParsedIntent, requestRadius?: number, mode: AppMode = 'open_world'): number {
  if (typeof requestRadius === 'number' && requestRadius > 0) {
    return requestRadius;
  }
  const byUrgency: Record<ParsedIntent['urgency'], number> = {
    high: 1200,
    medium: 2200,
    low: 3400,
  };
  const base = byUrgency[intent.urgency] ?? 2200;
  return mode === 'campus' ? Math.min(base, 1800) : base;
}

function extractLatLng(item: Record<string, unknown>): LatLng | null {
  const lat = typeof item.lat === 'number' ? item.lat : typeof item.event_lat === 'number' ? item.event_lat : null;
  const lng = typeof item.lng === 'number' ? item.lng : typeof item.event_lng === 'number' ? item.event_lng : null;
  if (lat != null && lng != null) return { lat, lng };

  const location = item.location as Record<string, unknown> | undefined;
  if (location) {
    const locLat = typeof location.lat === 'number' ? location.lat : null;
    const locLng = typeof location.lng === 'number' ? location.lng : null;
    if (locLat != null && locLng != null) return { lat: locLat, lng: locLng };
  }
  return null;
}

function estimateEtaMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / 80));
}

/**
 * Score a candidate result. Intent-aware: boosts/penalises based on
 * what the user actually asked for, not just distance + signal.
 */
function scoreCandidate(
  distanceMeters: number,
  signal: RecommendationSignal,
  kind: 'pin' | 'event',
  pinType: string,
  intent: ParsedIntent,
  textContext: { likelyOpenLate: boolean; likelySafe: boolean; likelyQuiet: boolean },
): number {
  const distanceScore = clamp(100 - distanceMeters / 25, 20, 100);
  const confidenceScore = signal.confidence * 100;

  // Base signal bonus
  const signalBonus =
    signal.statusNow.includes('usable') ? 12
    : signal.statusNow.includes('busy') ? -8
    : signal.statusNow.includes('closed') ? -25
    : signal.statusNow.includes('safety risk') ? -30
    : 0;

  const eventPenalty = kind === 'event' ? 4 : 0;

  // Intent-aware bonuses
  let intentBonus = 0;

  // Safety focus: reward safe_walk pins and penalise unsafe signals
  if (intent.safetyFocus) {
    if (pinType === 'safe_walk') intentBonus += 20;
    if (textContext.likelySafe) intentBonus += 10;
    if (signal.statusNow.includes('safety risk')) intentBonus -= 20;
    if (signal.statusNow.includes('usable') || signal.statusNow.includes('quiet')) intentBonus += 8;
  }

  // Time context: tonight / late night
  if (intent.timeContext === 'tonight') {
    if (pinType === 'open_late') intentBonus += 20;
    if (textContext.likelyOpenLate) intentBonus += 15;
    // A fresh report at this hour saying "open" is a strong signal
    if (signal.freshnessLabel === 'fresh' && signal.statusNow.includes('usable')) intentBonus += 10;
    // Penalise stale signals at night — unreliable
    if (signal.freshnessLabel === 'stale') intentBonus -= 10;
  }

  // Urgency: weight distance even more heavily when urgent
  const urgencyDistMult = intent.urgency === 'high' ? 1.2 : intent.urgency === 'low' ? 0.85 : 1.0;

  // Quiet preference
  if (intent.preferences.includes('quiet')) {
    if (textContext.likelyQuiet) intentBonus += 8;
    if (signal.statusNow.includes('busy')) intentBonus -= 10;
  }

  // Accessible preference
  if (intent.preferences.includes('accessible')) {
    const accessible = signal.accessRules.some(r => r.toLowerCase().includes('accessible') && !r.toLowerCase().includes('not') && !r.toLowerCase().includes('limited'));
    if (accessible) intentBonus += 8;
  }

  const weighted =
    distanceScore * 0.48 * urgencyDistMult +
    confidenceScore * 0.34 +
    signalBonus +
    intentBonus -
    eventPenalty;

  return clamp(Math.round(weighted), 0, 100);
}

function buildWhyLines(
  distanceMeters: number,
  etaMinutes: number,
  signal: RecommendationSignal,
  textContext: { likelyOpenLate: boolean; likelySafe: boolean; likelyQuiet: boolean },
  pinType: string,
): string[] {
  const lines: string[] = [`~${distanceMeters}m away (${etaMinutes} min walk)`];
  lines.push(signal.statusNow);
  lines.push(`Signal freshness: ${signal.freshnessLabel}`);

  if (signal.reportCount > 0) {
    lines.push(`${signal.reportCount} recent report${signal.reportCount === 1 ? '' : 's'} nearby`);
  } else {
    lines.push('No nearby reports yet — confidence is lower');
  }

  // Surface text-mined context clues
  if (textContext.likelyOpenLate) lines.push('Description suggests open late');
  if (textContext.likelySafe) lines.push('Description suggests well-lit or monitored');
  if (textContext.likelyQuiet) lines.push('Description suggests quiet space');
  if (pinType === 'safe_walk') lines.push('This is a community-marked safe walk spot');

  return lines;
}

export class RecommendationService {
  async getRecommendations(payload: RecommendationRequest): Promise<RecommendationResult> {
    const intent = await aiService.parseIntent(payload.query);
    const mode: AppMode = payload.mode === 'campus' ? 'campus' : 'open_world';
    const effectiveRadius = getEffectiveRadius(intent, payload.radius, mode);

    // Fetch pins for ALL relevant types in parallel, then deduplicate by id
    const pinTypes = intent.pinTypes.filter(t => t !== 'event' && t !== 'other');

    // For safety queries also always pull safe_walk even if not top type
    if (intent.safetyFocus && !pinTypes.includes('safe_walk')) {
      pinTypes.push('safe_walk');
    }
    // For tonight queries also always pull open_late
    if (intent.timeContext === 'tonight' && !pinTypes.includes('open_late')) {
      pinTypes.push('open_late');
    }

    const [pinsRaw, eventsRaw, reportsRaw] = await Promise.all([
      // If we have specific types, fetch each type and merge; otherwise fetch all
      pinTypes.length > 0
        ? Promise.all(
            pinTypes.map(t =>
              pinService.searchNearby({
                lat: payload.location.lat,
                lng: payload.location.lng,
                radius: effectiveRadius,
                type: t,
                tags: intent.preferences.length ? intent.preferences : undefined,
                limit: 30,
              })
            )
          ).then(results => {
            // Deduplicate by id across type-fetches
            const seen = new Set<string>();
            const merged: unknown[] = [];
            results.flat().forEach((pin: any) => {
              const id = pin?.id ?? JSON.stringify(pin);
              if (!seen.has(id)) { seen.add(id); merged.push(pin); }
            });
            return merged;
          })
        : pinService.searchNearby({
            lat: payload.location.lat,
            lng: payload.location.lng,
            radius: effectiveRadius,
            limit: 30,
          }),
      eventService.getUpcomingEvents(
        payload.location.lat,
        payload.location.lng,
        Math.round(effectiveRadius * 1.6),
        72,
      ),
      reportService.getReportsNearby(
        payload.location.lat,
        payload.location.lng,
        Math.max(900, effectiveRadius),
        {},
      ),
    ]);

    const pins = Array.isArray(pinsRaw) ? pinsRaw : [];
    const events = Array.isArray(eventsRaw) ? eventsRaw : [];
    const reports = (Array.isArray(reportsRaw) ? reportsRaw : []) as Array<Record<string, unknown>>;
    const userPoint: LatLng = { lat: payload.location.lat, lng: payload.location.lng };

    const pinRecommendations: RecommendationItem[] = [];
    pins.forEach((pin) => {
      const item = pin as Record<string, unknown>;
      const point = extractLatLng(item);
      const distanceMeters =
        typeof item.distance_meters === 'number'
          ? Math.max(0, Math.round(item.distance_meters))
          : point
            ? Math.round(haversineDistanceMeters(userPoint, point))
            : effectiveRadius + 1;
      if (!point && distanceMeters > effectiveRadius) return;

      const signal = placeStatusService.getSignalForPoint(reports, point ?? userPoint);
      const pinType = typeof item.type === 'string' ? item.type : 'other';

      // Mine text for context clues since we have no structured hours
      const textContext = aiService.inferPlaceContextFromText(
        typeof item.title === 'string' ? item.title : '',
        typeof item.description === 'string' ? item.description : undefined,
        Array.isArray(item.tags) ? (item.tags as string[]) : undefined,
        typeof item.access_notes === 'string' ? item.access_notes : undefined,
      );

      const etaMinutes = estimateEtaMinutes(distanceMeters);
      const worthItScore = scoreCandidate(distanceMeters, signal, 'pin', pinType, intent, textContext);
      const title = typeof item.title === 'string' ? item.title : 'Nearby place';

      pinRecommendations.push({
        kind: 'pin',
        title,
        distanceMeters,
        etaMinutes,
        statusNow: signal.statusNow,
        accessRules: signal.accessRules,
        confidence: signal.confidence,
        worthItScore,
        whyThis: buildWhyLines(distanceMeters, etaMinutes, signal, textContext, pinType),
        item: {
          ...item,
          distance_meters: distanceMeters,
          recommendation_status: signal.statusNow,
          recommendation_confidence: signal.confidence,
          recommendation_score: worthItScore,
          recommendation_report_count: signal.reportCount,
          recommendation_last_updated: signal.lastUpdatedAt,
          recommendation_freshness: signal.freshnessLabel,
        },
      });
    });

    // Only include events if the intent asks for them or is general
    const includeEvents =
      intent.pinTypes.includes('event') ||
      (intent.pinTypes.length === 1 && intent.pinTypes[0] === 'other') ||
      intent.pinTypes[0] === 'other';

    const eventRecommendations: RecommendationItem[] = [];
    if (includeEvents) {
      events.forEach((event) => {
        const item = event as Record<string, unknown>;
        const point = extractLatLng(item);
        const distanceMeters =
          typeof item.distance_meters === 'number'
            ? Math.max(0, Math.round(item.distance_meters))
            : point
              ? Math.round(haversineDistanceMeters(userPoint, point))
              : effectiveRadius + 1;
        if (!point && distanceMeters > effectiveRadius * 2) return;

        const signal = placeStatusService.getSignalForPoint(reports, point ?? userPoint);
        const textContext = { likelyOpenLate: false, likelySafe: false, likelyQuiet: false };
        const etaMinutes = estimateEtaMinutes(distanceMeters);
        const worthItScore = scoreCandidate(distanceMeters, signal, 'event', 'event', intent, textContext);
        const title = typeof item.title === 'string' ? item.title : 'Nearby event';

        eventRecommendations.push({
          kind: 'event',
          title,
          distanceMeters,
          etaMinutes,
          statusNow: signal.statusNow,
          accessRules: signal.accessRules,
          confidence: signal.confidence,
          worthItScore,
          whyThis: buildWhyLines(distanceMeters, etaMinutes, signal, textContext, 'event'),
          item: {
            ...item,
            type: 'event',
            distance_meters: distanceMeters,
            recommendation_status: signal.statusNow,
            recommendation_confidence: signal.confidence,
            recommendation_score: worthItScore,
            recommendation_report_count: signal.reportCount,
            recommendation_last_updated: signal.lastUpdatedAt,
            recommendation_freshness: signal.freshnessLabel,
          },
        });
      });
    }

    const recommendations = [...pinRecommendations, ...eventRecommendations]
      .sort((a, b) => b.worthItScore - a.worthItScore || a.distanceMeters - b.distanceMeters)
      .slice(0, 20);

    const aiResponse = await aiService.generateResponse(
      intent,
      recommendations.length,
      recommendations.slice(0, 3).map(r => ({
        title: r.title,
        distanceMeters: r.distanceMeters,
        statusNow: r.statusNow,
        kind: r.kind,
      })),
    );

    return {
      intent,
      aiResponse,
      mode,
      effectiveRadius,
      recommendations,
    };
  }
}

export default new RecommendationService();
