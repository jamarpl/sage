import aiService from './ai.service';
import logger from '../utils/logger';

const CLUSTER_RADIUS_METERS = 50;
const MIN_QUALITY_SCORE = 0.3;
const MAX_CLUSTERS_FOR_SUMMARY = 5;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ReportWithLocation {
  id: string;
  type: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  lat: number;
  lng: number;
  [key: string]: unknown;
}

export interface ReportCluster {
  reports: ReportWithLocation[];
  summary: string;
  centroid: { lat: number; lng: number };
}

export interface ClusterResult {
  clusters: ReportCluster[];
  filteredOut: number;
}

export class ReportClusterService {
  /**
   * Cluster reports by location, filter low-quality, generate summaries.
   */
  async clusterAndFilterReports(rawReports: ReportWithLocation[]): Promise<ClusterResult> {
    if (rawReports.length === 0) {
      return { clusters: [], filteredOut: 0 };
    }

    const radius = CLUSTER_RADIUS_METERS;

    // Optional: filter by AI quality (skip to save cost for MVP; enable when needed)
    let reports = rawReports;
    let filteredOut = 0;
    const useQualityFilter = process.env.ENABLE_REPORT_QUALITY_FILTER === 'true';
    if (useQualityFilter) {
      const scored: Array<{ report: ReportWithLocation; score: number }> = [];
      for (const r of reports) {
        const score = await aiService.scoreReportQuality(r);
        if (score >= MIN_QUALITY_SCORE) scored.push({ report: r, score });
        else filteredOut++;
      }
      reports = scored.map((s) => s.report);
    }

    if (reports.length === 0) {
      return { clusters: [], filteredOut: filteredOut + rawReports.length };
    }

    // Spatial clustering (greedy)
    const clusters: ReportWithLocation[][] = [];
    const used = new Set<string>();

    for (const report of reports) {
      if (used.has(report.id)) continue;

      const cluster: ReportWithLocation[] = [report];
      used.add(report.id);

      const lat = report.lat;
      const lng = report.lng;

      for (const other of reports) {
        if (used.has(other.id)) continue;
        const dist = haversineDistance(lat, lng, other.lat, other.lng);
        if (dist <= radius) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    // Generate summaries for clusters with 2+ reports (limit to save cost)
    const clustersToSummarize = clusters
      .filter((c) => c.length >= 2)
      .slice(0, MAX_CLUSTERS_FOR_SUMMARY);

    const resultClusters: ReportCluster[] = [];

    for (const clusterReports of clusters) {
      const centroid = {
        lat: clusterReports.reduce((s, r) => s + r.lat, 0) / clusterReports.length,
        lng: clusterReports.reduce((s, r) => s + r.lng, 0) / clusterReports.length,
      };

      let summary: string;
      if (clusterReports.length === 1) {
        const r = clusterReports[0];
        summary = r.content?.slice(0, 60) || `${r.type} report`;
      } else if (clustersToSummarize.includes(clusterReports)) {
        try {
          summary = await aiService.summarizeReportCluster(clusterReports);
        } catch (error) {
          logger.error('Error summarizing cluster:', error);
          summary = `${clusterReports.length} reports in this area`;
        }
      } else {
        summary = `${clusterReports.length} reports in this area`;
      }

      resultClusters.push({
        reports: clusterReports,
        summary,
        centroid,
      });
    }

    return {
      clusters: resultClusters.sort((a, b) => b.reports.length - a.reports.length),
      filteredOut,
    };
  }
}

export default new ReportClusterService();
