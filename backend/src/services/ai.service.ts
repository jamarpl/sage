import { openai } from '../config/openai';
import logger from '../utils/logger';

export interface ParsedIntent {
  // Ordered list of pin types to search, most relevant first.
  // Valid values: bathroom, food, pharmacy, study, coffee, parking, safe_walk, open_late, event, other
  pinTypes: string[];
  urgency: 'low' | 'medium' | 'high';
  preferences: string[];
  safetyFocus: boolean;
  // "now" = searching right now (weights freshness heavily)
  // "tonight" = late-night context (weights open_late pins + late-hour reports)
  // "anytime" = no time pressure
  timeContext: 'now' | 'tonight' | 'anytime';
  // Original single type kept for backward-compat with callers that still use it
  type: string;
  category?: string;
}

// Maps common natural language concepts to pin types
const PIN_TYPE_MAP: Record<string, string[]> = {
  bathroom:   ['bathroom'],
  toilet:     ['bathroom'],
  restroom:   ['bathroom'],
  washroom:   ['bathroom'],
  food:       ['food', 'coffee'],
  eat:        ['food', 'coffee'],
  hungry:     ['food'],
  drink:      ['food', 'coffee'],
  coffee:     ['coffee', 'food'],
  cafe:       ['coffee', 'food'],
  pharmacy:   ['pharmacy'],
  medicine:   ['pharmacy'],
  study:      ['study'],
  studying:   ['study'],
  work:       ['study', 'coffee'],
  quiet:      ['study'],
  parking:    ['parking'],
  park:       ['parking'],
  safe:       ['safe_walk'],
  safety:     ['safe_walk'],
  walk:       ['safe_walk'],
  escort:     ['safe_walk'],
  late:       ['open_late', 'food', 'coffee'],
  'open late':['open_late'],
  tonight:    ['open_late'],
  night:      ['open_late'],
  event:      ['event'],
  events:     ['event'],
  charging:   ['other'],
};

export class AIService {
  /**
   * Parse user's natural language query into structured intent.
   * Uses GPT to extract rich context, then falls back to keyword matching on error.
   */
  async parseIntent(query: string): Promise<ParsedIntent> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You parse queries for a community map app into structured JSON. The map has user-submitted pins of these types:
- bathroom: public/campus bathrooms
- food: food spots, restaurants, snack places
- coffee: cafes, coffee spots
- pharmacy: medical/pharmacy
- study: study spots, quiet spaces
- parking: parking spots
- safe_walk: safe walk routes/escorts, safety-related spots
- open_late: places reported open late at night
- event: community events
- other: anything else

Extract from the query:
- pinTypes: array of relevant pin types ordered by relevance (1-3 types). If the query is about safety or feeling unsafe, always include "safe_walk". If it's late-night related, include "open_late".
- urgency: "low" | "medium" | "high" (high = urgent/now/emergency)
- preferences: array of preference words e.g. ["quiet", "clean", "accessible", "cheap", "fast", "nearby"]
- safetyFocus: true if the query is about safety, feeling unsafe, or needing an escort
- timeContext: "now" | "tonight" | "anytime" — "tonight" if query implies late night

Respond ONLY with valid JSON. Example:
{"pinTypes":["safe_walk"],"urgency":"high","preferences":["nearby"],"safetyFocus":true,"timeContext":"now"}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        max_tokens: 200,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) throw new Error('No response from AI');

      const parsed = JSON.parse(raw);

      // Normalise and validate
      const pinTypes: string[] = Array.isArray(parsed.pinTypes) && parsed.pinTypes.length
        ? parsed.pinTypes
        : this._keywordFallbackTypes(query);

      const intent: ParsedIntent = {
        pinTypes,
        type: pinTypes[0] ?? 'other',
        urgency: (['low', 'medium', 'high'] as const).includes(parsed.urgency) ? parsed.urgency : 'medium',
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
        safetyFocus: Boolean(parsed.safetyFocus),
        timeContext: (['now', 'tonight', 'anytime'] as const).includes(parsed.timeContext) ? parsed.timeContext : 'anytime',
      };

      logger.info('Parsed intent:', { query, intent });
      return intent;
    } catch (error) {
      logger.error('Error parsing intent, using keyword fallback:', error);
      return this._keywordFallbackIntent(query);
    }
  }

  /** Pure keyword fallback — no API call */
  private _keywordFallbackTypes(query: string): string[] {
    const q = query.toLowerCase();
    const matched = new Set<string>();
    for (const [keyword, types] of Object.entries(PIN_TYPE_MAP)) {
      if (q.includes(keyword)) types.forEach(t => matched.add(t));
    }
    return matched.size ? Array.from(matched) : ['other'];
  }

  private _keywordFallbackIntent(query: string): ParsedIntent {
    const q = query.toLowerCase();
    const pinTypes = this._keywordFallbackTypes(q);
    const safetyFocus = /safe|unsafe|scared|escort|walk with|danger/.test(q);
    const timeContext: ParsedIntent['timeContext'] = /tonight|late|night|midnight/.test(q) ? 'tonight' : /now|urgent|asap|quick/.test(q) ? 'now' : 'anytime';
    const urgency: ParsedIntent['urgency'] = /urgent|asap|emergency|now|quick|nearest/.test(q) ? 'high' : 'medium';
    return { pinTypes, type: pinTypes[0], urgency, preferences: [], safetyFocus, timeContext };
  }

  /**
   * Generate a contextual AI response referencing actual top results.
   */
  async generateResponse(
    intent: ParsedIntent,
    resultsCount: number,
    topResults: Array<{ title: string; distanceMeters: number; statusNow: string; kind: string }> = [],
  ): Promise<string> {
    if (resultsCount === 0) {
      const focus = intent.safetyFocus ? 'safe walk spots or escorts' : intent.pinTypes[0] === 'other' ? 'places' : intent.pinTypes[0].replace(/_/g, ' ') + ' spots';
      return `No ${focus} found nearby yet — be the first to add one or try a wider area.`;
    }

    try {
      const top3 = topResults.slice(0, 3).map((r, i) =>
        `${i + 1}. "${r.title}" — ${r.distanceMeters}m away, ${r.statusNow}`
      ).join('\n');

      const contextHints = [
        intent.safetyFocus ? 'The user is looking for safety.' : '',
        intent.timeContext === 'tonight' ? 'It is night time.' : '',
        intent.urgency === 'high' ? 'The user needs this urgently.' : '',
      ].filter(Boolean).join(' ');

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful community map assistant. Write ONE short sentence (max 20 words) summarising what was found for the user. Be specific — mention the closest place and its status. Do not say "I found". ${contextHints}`,
          },
          {
            role: 'user',
            content: `Query: "${intent.pinTypes.join(', ')}" — top results:\n${top3}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 60,
      });

      return completion.choices[0]?.message?.content?.trim() || `Here's what's nearby:`;
    } catch {
      // Template fallback
      const closest = topResults[0];
      if (closest) {
        return `Closest is "${closest.title}" ~${closest.distanceMeters}m away — ${closest.statusNow.toLowerCase()}.`;
      }
      return `Found ${resultsCount} spot${resultsCount === 1 ? '' : 's'} nearby.`;
    }
  }

  /**
   * Score report quality (0-1). Low scores indicate spam or low-quality.
   */
  async scoreReportQuality(report: { type: string; content?: string | null; metadata?: Record<string, unknown> }): Promise<number> {
    try {
      const text = [report.type, report.content || '', JSON.stringify(report.metadata || {})].join(' ');
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Score this community report quality from 0 (spam/low-quality) to 1 (helpful, clear). Reply with ONLY a number 0-1.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        max_tokens: 5
      });
      const response = completion.choices?.[0]?.message?.content?.trim();
      const score = parseFloat(response || '0.5');
      return Math.min(1, Math.max(0, isNaN(score) ? 0.5 : score));
    } catch (error) {
      logger.error('Error scoring report quality:', error);
      return 0.5;
    }
  }

  /**
   * Generate short headline for a cluster of reports.
   */
  async summarizeReportCluster(
    reports: Array<{ type: string; content?: string | null }>,
    locationDesc?: string
  ): Promise<string> {
    try {
      const snippet = reports.slice(0, 5).map(r => `- ${r.type}: ${(r.content || 'no details').slice(0, 50)}`).join('\n');
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize these community reports in one short headline (max 15 words). Be specific. E.g. "3 reports: Crowded at café, slow service"'
          },
          { role: 'user', content: `${reports.length} reports${locationDesc ? ` near ${locationDesc}` : ''}:\n${snippet}` }
        ],
        temperature: 0.3,
        max_tokens: 40
      });
      const response = completion.choices?.[0]?.message?.content?.trim();
      return response || `${reports.length} reports in this area`;
    } catch (error) {
      logger.error('Error summarizing cluster:', error);
      return `${reports.length} reports in this area`;
    }
  }

  /**
   * Generate embedding for text (for semantic search)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Extract context clues about a place from its description/tags/title.
   * Used when there are no structured hours — we mine text for signals.
   */
  inferPlaceContextFromText(title: string, description?: string, tags?: string[], accessNotes?: string): {
    likelyOpenLate: boolean;
    likelySafe: boolean;
    likelyQuiet: boolean;
  } {
    const text = [title, description, (tags || []).join(' '), accessNotes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const likelyOpenLate = /open late|24.?hour|24\/7|overnight|midnight|all night|late night|night owl|always open|open 24/.test(text)
      || (tags || []).some(t => ['open_late', 'late', '24h', '24/7'].includes(t.toLowerCase()));

    const likelySafe = /safe|well.?lit|lit|security|guard|camera|escort|campus police|bright|monitored/.test(text)
      || (tags || []).some(t => ['safe', 'well-lit', 'monitored', 'security'].includes(t.toLowerCase()));

    const likelyQuiet = /quiet|silent|calm|peaceful|empty|low traffic|not busy|uncrowded/.test(text)
      || (tags || []).some(t => ['quiet', 'calm', 'peaceful'].includes(t.toLowerCase()));

    return { likelyOpenLate, likelySafe, likelyQuiet };
  }
}

export default new AIService();
