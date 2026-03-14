interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceStatusSignal {
  statusNow: string;
  accessRules: string[];
  confidence: number;
  reportCount: number;
  lastUpdatedAt: string | null;
  freshnessLabel: string;
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

function freshnessWeight(createdAt?: string): number {
  if (!createdAt) return 0.2;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs <= 15 * 60_000) return 1;
  if (ageMs <= 45 * 60_000) return 0.82;
  if (ageMs <= 90 * 60_000) return 0.62;
  if (ageMs <= 3 * 60 * 60_000) return 0.42;
  if (ageMs <= 6 * 60 * 60_000) return 0.28;
  return 0.15;
}

function freshnessLabel(createdAt?: string): string {
  if (!createdAt) return 'stale';
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs <= 45 * 60_000) return 'fresh';
  if (ageMs <= 3 * 60 * 60_000) return 'recent';
  return 'stale';
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

export class PlaceStatusService {
  getSignalForPoint(reports: Array<Record<string, unknown>>, point: LatLng): PlaceStatusSignal {
    const closeReports = reports.filter((report) => {
      const lat = typeof report.lat === 'number' ? report.lat : null;
      const lng = typeof report.lng === 'number' ? report.lng : null;
      if (lat == null || lng == null) return false;
      return haversineDistanceMeters(point, { lat, lng }) <= 180;
    });

    if (closeReports.length === 0) {
      return {
        statusNow: 'No recent live signals',
        accessRules: [],
        confidence: 0.32,
        reportCount: 0,
        lastUpdatedAt: null,
        freshnessLabel: 'stale',
      };
    }

    let closedScore = 0;
    let openScore = 0;
    let crowdedScore = 0;
    let quietScore = 0;
    let safeScore = 0;
    let cautionScore = 0;
    let unsafeScore = 0;
    let confidenceWeight = 0;
    let totalWeight = 0;
    const accessRules = new Set<string>();
    let newestTimestamp = 0;

    closeReports.forEach((report) => {
      const metadata = (report.metadata as Record<string, unknown> | undefined) ?? {};
      const createdAt = typeof report.created_at === 'string' ? report.created_at : undefined;
      const weight = freshnessWeight(createdAt);
      totalWeight += weight;
      confidenceWeight += weight;

      const statusLegacy = toStringValue(metadata.status || metadata.subtype);
      const openNow = toStringValue(metadata.open_now);
      const crowdLevel = toStringValue(metadata.crowd_level);
      const purchaseRequired = toStringValue(metadata.purchase_required);
      const accessibilityLevel = toStringValue(metadata.accessibility_level);
      const safetyLevel = toStringValue(metadata.safety_level);

      if (openNow === 'closed' || statusLegacy === 'closed') closedScore += weight * 1.1;
      if (openNow === 'open' || openNow === 'limited' || statusLegacy === 'open') openScore += weight;

      if (crowdLevel === 'packed' || crowdLevel === 'busy' || statusLegacy === 'crowded' || statusLegacy === 'busy' || statusLegacy === 'slow') {
        crowdedScore += weight;
      }
      if (crowdLevel === 'quiet' || crowdLevel === 'moderate' || statusLegacy === 'quiet') {
        quietScore += weight;
      }

      if (safetyLevel === 'safe') safeScore += weight;
      if (safetyLevel === 'caution') cautionScore += weight;
      if (safetyLevel === 'unsafe') unsafeScore += weight * 1.2;

      if (purchaseRequired === 'yes') accessRules.add('Purchase required');
      if (purchaseRequired === 'maybe') accessRules.add('Purchase may be required');
      if (purchaseRequired === 'no') accessRules.add('No purchase required');
      if (accessibilityLevel === 'accessible') accessRules.add('Accessible');
      if (accessibilityLevel === 'limited') accessRules.add('Limited accessibility');
      if (accessibilityLevel === 'not_accessible') accessRules.add('Not accessibility-friendly');

      const explicitAccessRule = metadata.accessRule;
      if (typeof explicitAccessRule === 'string' && explicitAccessRule.trim()) {
        accessRules.add(explicitAccessRule.trim());
      }

      if (createdAt) {
        const ts = new Date(createdAt).getTime();
        if (!isNaN(ts) && ts > newestTimestamp) newestTimestamp = ts;
      }
    });

    const newestIso = newestTimestamp ? new Date(newestTimestamp).toISOString() : null;
    const freshness = freshnessLabel(newestIso || undefined);
    const baseConfidence = totalWeight > 0 ? confidenceWeight / Math.max(totalWeight, 1) : 0.3;
    const confidence = clamp(0.4 + baseConfidence * 0.35 + Math.min(closeReports.length, 8) * 0.04, 0.3, 0.98);

    let statusNow = 'Live status mixed';
    if (closedScore > openScore && closedScore >= crowdedScore) {
      statusNow = 'Likely closed right now';
    } else if (unsafeScore > safeScore && unsafeScore >= cautionScore) {
      statusNow = 'Safety risk reported nearby';
    } else if (crowdedScore > quietScore) {
      statusNow = 'Likely busy right now';
    } else if (openScore >= closedScore && quietScore >= crowdedScore) {
      statusNow = 'Likely usable right now';
    }

    return {
      statusNow,
      accessRules: Array.from(accessRules),
      confidence,
      reportCount: closeReports.length,
      lastUpdatedAt: newestIso,
      freshnessLabel: freshness,
    };
  }
}

export default new PlaceStatusService();
