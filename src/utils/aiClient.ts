import { setAmbientVoiceDucking } from './ambientBgm';
import type { SpeechChunk } from './speechSync';

export type AiVoiceName = 'Kore' | 'Aoede' | 'Puck' | 'Fenrir' | 'Charon';
export type AiVoiceEngine = 'gemini' | 'browser';

export type AiErrorCode =
  | 'passcode_invalid'
  | 'passcode_unconfigured'
  | 'not_configured'
  | 'rate_limited'
  | 'network'
  | 'aborted'
  | 'unknown';

export class AiClientError extends Error {
  code: AiErrorCode;
  status: number;

  constructor(message: string, code: AiErrorCode = 'unknown', status = 500) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
    this.status = status;
  }
}

export interface AiStatus {
  configured: boolean;
  passcodeRequired: boolean;
  allowPublic: boolean;
  textModel: string;
  ttsModel: string;
}

export interface AiUsageMeta {
  promptTokens: number;
  outputTokens: number;
  ttsRequested?: boolean;
}

export interface AiUsageSnapshot {
  month: string; // YYYY-MM
  requests: number;
  promptTokens: number;
  outputTokens: number;
  ttsCalls: number;
  estimatedUsd: number;
}

export interface AiVoicePrefs {
  voiceName: AiVoiceName;
  engine: AiVoiceEngine;
}

export interface AiTutorContext {
  currentYear: number;
  eraName?: string;
  subPeriodName?: string;
  event?: {
    title: string;
    dateDisplay: string;
    locationName: string;
    summary: string;
    politics?: string;
    economy?: string;
    culture?: string;
    consequence?: string;
  } | null;
  figure?: {
    name: string;
    title: string;
    lifespanDisplay: string;
    oneLiner: string;
    coreContributions?: string;
    historicalImpact?: string;
  } | null;
  country?: {
    name: string;
    tagline: string;
    geography?: string;
    politics?: string;
    economy?: string;
    culture?: string;
  } | null;
}

export type AiStoryboardSpotIcon =
  | 'city'
  | 'landmark'
  | 'port'
  | 'trade'
  | 'military'
  | 'culture'
  | 'climate'
  | 'ruler';

export interface AiStoryboardZone {
  center: [number, number];
  radiusKm: number;
  label?: string;
  color: string;
}

export interface AiStoryboardFlow {
  from: [number, number];
  to: [number, number];
  label: string;
  color: string;
  kind: 'trade' | 'diffusion' | 'military' | 'voyage' | 'influence';
  bidirectional?: boolean;
}

export interface AiStoryboardSpot {
  coords: [number, number];
  label: string;
  sublabel?: string;
  color: string;
  icon?: AiStoryboardSpotIcon;
}

export interface AiStoryboardStep {
  title: string;
  caption: string;
  matchSnippet?: string;
  year: number;
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
  zones?: AiStoryboardZone[];
  spots: AiStoryboardSpot[];
  flows: AiStoryboardFlow[];
}

export interface AiStoryboard {
  title: string;
  steps: AiStoryboardStep[];
}

export interface AiDocumentaryBeat {
  title: string;
  narration: string;
}

export interface AiDocumentaryPlan {
  script: string;
  beats: AiDocumentaryBeat[];
  storyboard: AiStoryboard;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  storyboard?: AiStoryboard | null;
}

export interface AiComparisonResult {
  title: string;
  thesis: string;
  dimensions: {
    geopolitics: string;
    politics: string;
    economy: string;
    culture: string;
  };
  commonalities: string[];
  divergences: string[];
  modernEcho: string;
}

export interface AiPolityCard {
  tagline: string;
  peakPeriod: string;
  capital: string;
  geography: string;
  politics: string;
  economy: string;
  culture: string;
  riseAndFall: string;
  funFact: string;
  keyFigures: string[];
}

export interface AiNarrationResult {
  script: string;
  audioBlobUrl: string | null;
  ttsFallback: boolean;
  ttsError?: string;
  usedBrowserFallback?: boolean;
}

export const AI_VOICE_OPTIONS: Array<{ id: AiVoiceName; label: string; desc: string }> = [
  { id: 'Kore', label: '沉稳女声 (Kore)', desc: '纪录片感，清晰自然' },
  { id: 'Charon', label: '厚重男声 (Charon)', desc: '史诗质感，适合帝国篇' },
  { id: 'Aoede', label: '温润女声 (Aoede)', desc: '柔和叙事，适合人文篇' },
  { id: 'Puck', label: '明快讲述 (Puck)', desc: '节奏轻快，适合导览' },
  { id: 'Fenrir', label: '浑厚解说 (Fenrir)', desc: '低沉有力，适合战役篇' },
];

const PASSCODE_STORAGE_KEY = 'world-history-atlas:ai-passcode:v1';
const VOICE_PREFS_KEY = 'world-history-atlas:ai-voice-prefs:v1';
const USAGE_STORAGE_KEY = 'world-history-atlas:ai-usage:v1';
const POLITY_CACHE_KEY = 'world-history-atlas:ai-polity-cards:v1';
const COMPARE_CACHE_KEY = 'world-history-atlas:ai-compares:v1';

// Approximate Gemini 2.5 Flash pricing (USD per 1M tokens) + estimated audio cost per clip
const PRICE_INPUT_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 2.5;
const EST_TTS_CLIP_USD = 0.002;

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getStoredPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPasscode(code: string): void {
  try {
    const trimmed = code.trim();
    if (!trimmed) {
      localStorage.removeItem(PASSCODE_STORAGE_KEY);
    } else {
      localStorage.setItem(PASSCODE_STORAGE_KEY, trimmed);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getVoicePrefs(): AiVoicePrefs {
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    if (!raw) return { voiceName: 'Kore', engine: 'gemini' };
    const parsed = JSON.parse(raw) as Partial<AiVoicePrefs>;
    const validVoice = AI_VOICE_OPTIONS.some((v) => v.id === parsed.voiceName)
      ? (parsed.voiceName as AiVoiceName)
      : 'Kore';
    const engine: AiVoiceEngine = parsed.engine === 'browser' ? 'browser' : 'gemini';
    return { voiceName: validVoice, engine };
  } catch {
    return { voiceName: 'Kore', engine: 'gemini' };
  }
}

export function saveVoicePrefs(prefs: AiVoicePrefs): void {
  try {
    localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

export function getAiUsage(): AiUsageSnapshot {
  const month = getCurrentMonthKey();
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiUsageSnapshot>;
      if (parsed.month === month) {
        return {
          month,
          requests: Number(parsed.requests || 0),
          promptTokens: Number(parsed.promptTokens || 0),
          outputTokens: Number(parsed.outputTokens || 0),
          ttsCalls: Number(parsed.ttsCalls || 0),
          estimatedUsd: Number(parsed.estimatedUsd || 0),
        };
      }
    }
  } catch {
    // Fallback to empty
  }
  return {
    month,
    requests: 0,
    promptTokens: 0,
    outputTokens: 0,
    ttsCalls: 0,
    estimatedUsd: 0,
  };
}

function recordAiUsage(meta?: AiUsageMeta): AiUsageSnapshot {
  const cur = getAiUsage();
  const promptTokens = meta?.promptTokens || 0;
  const outputTokens = meta?.outputTokens || 0;
  const ttsCalls = meta?.ttsRequested ? 1 : 0;
  const deltaUsd =
    (promptTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M +
    ttsCalls * EST_TTS_CLIP_USD;

  const next: AiUsageSnapshot = {
    month: cur.month,
    requests: cur.requests + 1,
    promptTokens: cur.promptTokens + promptTokens,
    outputTokens: cur.outputTokens + outputTokens,
    ttsCalls: cur.ttsCalls + ttsCalls,
    estimatedUsd: cur.estimatedUsd + deltaUsd,
  };
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

// ---------- Cached Polity Cards & Comparisons (LRU via localStorage) ----------

interface CachedEntry<T> {
  key: string;
  label: string;
  ts: number;
  data: T;
}

function readCacheList<T>(storageKey: string): CachedEntry<T>[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedEntry<T>[]) : [];
  } catch {
    return [];
  }
}

function writeCacheEntry<T>(storageKey: string, maxItems: number, entry: CachedEntry<T>): void {
  try {
    const existing = readCacheList<T>(storageKey).filter((item) => item.key !== entry.key);
    const updated = [entry, ...existing].slice(0, maxItems);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function getCachedPolityCard(cacheKey: string): AiPolityCard | null {
  const list = readCacheList<AiPolityCard>(POLITY_CACHE_KEY);
  return list.find((item) => item.key === cacheKey)?.data || null;
}

export function saveCachedPolityCard(cacheKey: string, label: string, card: AiPolityCard): void {
  writeCacheEntry(POLITY_CACHE_KEY, 60, {
    key: cacheKey,
    label,
    ts: Date.now(),
    data: card,
  });
}

export function listCachedComparisons(): Array<{
  key: string;
  subjectA: string;
  subjectB: string;
  angle: string;
  ts: number;
  data: AiComparisonResult;
  storyboard?: AiStoryboard | null;
}> {
  const list = readCacheList<{
    subjectA: string;
    subjectB: string;
    angle: string;
    result: AiComparisonResult;
    storyboard?: AiStoryboard | null;
  }>(COMPARE_CACHE_KEY);
  return list.map((item) => ({
    key: item.key,
    subjectA: item.data.subjectA,
    subjectB: item.data.subjectB,
    angle: item.data.angle,
    ts: item.ts,
    data: item.data.result,
    storyboard: item.data.storyboard ?? null,
  }));
}

// ---------- Core HTTP Transport ----------

async function apiJson<T>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; passcode?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const passcode = opts.passcode !== undefined ? opts.passcode : getStoredPasscode();
  if (passcode) {
    headers['X-Atlas-Passcode'] = passcode;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    if ((err instanceof DOMException && err.name === 'AbortError') || opts.signal?.aborted) {
      throw new AiClientError('已停止朗读', 'aborted', 0);
    }
    throw new AiClientError('网络请求失败，请检查网络连接后重试', 'network', 0);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new AiClientError(
      'AI 服务接口未就绪（本地静态预览不含 Pages Functions，请访问线上部署站点或通过 wrangler pages dev 启动）',
      'not_configured',
      res.status,
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | { error?: string; code?: AiErrorCode; usage?: AiUsageMeta }
    | null;

  if (!res.ok) {
    const code: AiErrorCode =
      payload?.code ||
      (res.status === 401
        ? 'passcode_invalid'
        : res.status === 403
          ? 'passcode_unconfigured'
          : res.status === 503
            ? 'not_configured'
            : res.status === 429
              ? 'rate_limited'
              : 'unknown');
    const msg = payload?.error || `AI 请求失败 (HTTP ${res.status})`;
    throw new AiClientError(msg, code, res.status);
  }

  if (payload?.usage) {
    recordAiUsage(payload.usage);
  }
  return payload as T;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  return apiJson<AiStatus>('/api/ai/status', { method: 'GET' });
}

export async function verifyAiPasscode(passcode: string): Promise<AiStatus> {
  const trimmed = passcode.trim();
  const res = await apiJson<{
    ok: boolean;
    configured: boolean;
    textModel: string;
    ttsModel: string;
  }>('/api/ai/status', {
    method: 'POST',
    body: {},
    passcode: trimmed,
  });
  setStoredPasscode(trimmed);
  return {
    configured: res.configured,
    passcodeRequired: true,
    allowPublic: false,
    textModel: res.textModel,
    ttsModel: res.ttsModel,
  };
}

export async function askAiTutor(params: {
  question: string;
  history: AiChatMessage[];
  context: AiTutorContext;
}): Promise<{ reply: string; storyboard?: AiStoryboard | null; usage?: AiUsageMeta }> {
  return apiJson<{ reply: string; storyboard?: AiStoryboard | null; usage?: AiUsageMeta }>(
    '/api/ai/tutor',
    {
      method: 'POST',
      body: {
        mode: 'chat',
        question: params.question,
        history: params.history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        context: params.context,
      },
    },
  );
}

export async function compareWithAi(params: {
  subjectA: string;
  subjectB: string;
  angle?: string;
}): Promise<{ comparison: AiComparisonResult; storyboard?: AiStoryboard | null; cached: boolean }> {
  const a = params.subjectA.trim();
  const b = params.subjectB.trim();
  const angle = (params.angle || '').trim();
  const cacheKey = `${a.toLowerCase()}::${b.toLowerCase()}::${angle.toLowerCase()}`;
  const hit = listCachedComparisons().find((c) => c.key === cacheKey);
  if (hit && hit.storyboard) {
    return { comparison: hit.data, storyboard: hit.storyboard, cached: true };
  }

  const res = await apiJson<{
    comparison: AiComparisonResult;
    storyboard?: AiStoryboard | null;
    usage?: AiUsageMeta;
  }>('/api/ai/tutor', {
    method: 'POST',
    body: {
      mode: 'compare',
      subjectA: a,
      subjectB: b,
      angle: angle || undefined,
    },
  });

  writeCacheEntry(COMPARE_CACHE_KEY, 30, {
    key: cacheKey,
    label: `${a} vs ${b}`,
    ts: Date.now(),
    data: {
      subjectA: a,
      subjectB: b,
      angle,
      result: res.comparison,
      storyboard: res.storyboard ?? null,
    },
  });

  return { comparison: res.comparison, storyboard: res.storyboard ?? null, cached: false };
}

export async function generatePolityCardWithAi(params: {
  cacheKey: string;
  zhName: string;
  enName: string;
  snapshotYear: number;
  region: string;
  modernCountryName?: string;
  ledgerSummary?: string;
  forceRefresh?: boolean;
}): Promise<{ card: AiPolityCard; cached: boolean }> {
  if (!params.forceRefresh) {
    const cached = getCachedPolityCard(params.cacheKey);
    if (cached) return { card: cached, cached: true };
  }

  const res = await apiJson<{ card: AiPolityCard; usage?: AiUsageMeta }>('/api/ai/polity-card', {
    method: 'POST',
    body: {
      zhName: params.zhName,
      enName: params.enName,
      snapshotYear: params.snapshotYear,
      region: params.region,
      modernCountryName: params.modernCountryName,
      ledgerSummary: params.ledgerSummary,
    },
  });

  saveCachedPolityCard(params.cacheKey, params.zhName, res.card);
  return { card: res.card, cached: false };
}

// ---------- In-Memory Audio Cache & Unified Narration Playback ----------

interface CachedAudioClip {
  script: string;
  audioBlobUrl: string | null;
  ttsFallback: boolean;
  ttsError?: string;
}

const audioClipCache = new Map<string, CachedAudioClip>();
let activeAudioEl: HTMLAudioElement | null = null;
let activePlaybackToken = 0;
let cancelPendingWait: (() => void) | null = null;
let activeTtsController: AbortController | null = null;
let activeNarrationPlaybackRate = 1.0;
const narrationStopListeners = new Set<() => void>();

export function mapTimelineSpeedToAudioRate(playSpeed: number): number {
  const table: Record<number, number> = {
    0.5: 0.85,
    0.75: 0.92,
    1: 1.0,
    1.25: 1.12,
    1.5: 1.25,
    2: 1.45,
    3: 1.72,
    4: 1.85,
  };
  const mapped = table[playSpeed] ?? (playSpeed <= 1 ? 0.85 + playSpeed * 0.15 : 1 + (playSpeed - 1) * 0.35);
  return Math.max(0.75, Math.min(1.85, mapped));
}

export function setNarrationPlaybackRate(rate: number): void {
  const clamped = Math.max(0.75, Math.min(1.85, rate));
  activeNarrationPlaybackRate = clamped;
  if (activeAudioEl) {
    try {
      activeAudioEl.playbackRate = clamped;
      (activeAudioEl as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    } catch {
      // Ignore
    }
  }
}

export function subscribeNarrationStop(listener: () => void): () => void {
  narrationStopListeners.add(listener);
  return () => {
    narrationStopListeners.delete(listener);
  };
}

function cleanSpeechText(rawText: string): string {
  return rawText
    .replace(/[*#`>_~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitTextIntoSpeechChunks(
  rawText: string,
  firstMax = 78,
  nextMax = 145,
): string[] {
  const cleaned = cleanSpeechText(rawText).slice(0, 4000);
  if (!cleaned) return [];

  const sentences = cleaned
    .split(/(?<=[。！？；\n])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1 && cleaned.length <= nextMax) {
    return [cleaned];
  }

  const expanded: string[] = [];
  for (const s of sentences.length > 0 ? sentences : [cleaned]) {
    if (s.length <= nextMax) {
      expanded.push(s);
    } else {
      const subParts = s
        .split(/(?<=[，、：])/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of subParts.length > 0 ? subParts : [s]) {
        if (p.length <= nextMax) {
          expanded.push(p);
        } else {
          for (let i = 0; i < p.length; i += nextMax) {
            expanded.push(p.slice(i, i + nextMax));
          }
        }
      }
    }
  }

  const chunks: string[] = [];
  let buf = '';
  for (const s of expanded) {
    const limit = chunks.length === 0 ? firstMax : nextMax;
    if (!buf) {
      buf = s;
    } else if (buf.length + s.length <= limit) {
      buf += s;
    } else {
      chunks.push(buf);
      buf = s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function base64WavToBlobUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

const DOC_PLAN_CACHE_KEY = 'world-history-atlas:ai-doc-plans:v2';
const docPlanMemoryCache = new Map<string, AiDocumentaryPlan>();

export function getCachedDocumentaryPlan(cacheKey: string): AiDocumentaryPlan | null {
  const memHit = docPlanMemoryCache.get(cacheKey);
  if (memHit) return memHit;

  const stored = readCacheList<AiDocumentaryPlan>(DOC_PLAN_CACHE_KEY).find(
    (entry) => entry.key === cacheKey,
  );
  if (stored?.data?.beats?.length && stored.data?.storyboard?.steps?.length) {
    docPlanMemoryCache.set(cacheKey, stored.data);
    return stored.data;
  }
  return null;
}

export async function generateDocumentaryPlan(params: {
  cacheKey: string;
  title: string;
  year: number;
  yearDisplay?: string;
  coords: [number, number];
  eraName?: string;
  subPeriodName?: string;
  regionLabel?: string;
  summary: string;
  geography?: string;
  politics?: string;
  economy?: string;
  culture?: string;
  consequence?: string;
  causesText?: string;
  effectsText?: string;
  keyFiguresText?: string;
  debate?: string;
  depth?: 'story' | 'concise';
  signal?: AbortSignal;
}): Promise<AiDocumentaryPlan> {
  const memHit = docPlanMemoryCache.get(params.cacheKey);
  if (memHit) return memHit;

  const stored = readCacheList<AiDocumentaryPlan>(DOC_PLAN_CACHE_KEY).find(
    (entry) => entry.key === params.cacheKey,
  );
  if (stored?.data?.beats?.length && stored.data?.storyboard?.steps?.length) {
    docPlanMemoryCache.set(params.cacheKey, stored.data);
    return stored.data;
  }

  const res = await apiJson<{
    script: string;
    beats: AiDocumentaryBeat[];
    storyboard: AiStoryboard;
    usage?: AiUsageMeta;
  }>('/api/ai/narrate', {
    method: 'POST',
    signal: params.signal,
    body: {
      withStoryboard: true,
      depth: params.depth ?? 'story',
      title: params.title,
      year: params.year,
      yearDisplay: params.yearDisplay,
      coords: params.coords,
      eraName: params.eraName,
      subPeriodName: params.subPeriodName,
      regionLabel: params.regionLabel,
      summary: params.summary,
      geography: params.geography,
      politics: params.politics,
      economy: params.economy,
      culture: params.culture,
      consequence: params.consequence,
      causesText: params.causesText,
      effectsText: params.effectsText,
      keyFiguresText: params.keyFiguresText,
      debate: params.debate,
    },
  });

  const plan: AiDocumentaryPlan = {
    script: res.script,
    beats: Array.isArray(res.beats) ? res.beats : [],
    storyboard: res.storyboard,
  };
  docPlanMemoryCache.set(params.cacheKey, plan);
  writeCacheEntry(DOC_PLAN_CACHE_KEY, 40, {
    key: params.cacheKey,
    label: params.title,
    ts: Date.now(),
    data: plan,
  });
  return plan;
}

export async function generateNarration(params: {
  cacheKey: string;
  script?: string;
  title?: string;
  yearDisplay?: string;
  eraName?: string;
  subPeriodName?: string;
  regionLabel?: string;
  summary?: string;
  politics?: string;
  economy?: string;
  culture?: string;
  consequence?: string;
  voicePrefs?: AiVoicePrefs;
  signal?: AbortSignal;
}): Promise<AiNarrationResult> {
  const prefs = params.voicePrefs || getVoicePrefs();
  const fullKey = `${params.cacheKey}::${prefs.engine}::${prefs.voiceName}`;
  const hit = audioClipCache.get(fullKey);
  if (hit) {
    return {
      script: hit.script,
      audioBlobUrl: hit.audioBlobUrl,
      ttsFallback: hit.ttsFallback,
      ttsError: hit.ttsError,
    };
  }

  const res = await apiJson<{
    script: string;
    audioBase64Wav: string | null;
    ttsFallback: boolean;
    ttsError?: string;
    usage?: AiUsageMeta;
  }>('/api/ai/narrate', {
    method: 'POST',
    signal: params.signal,
    body: {
      script: params.script,
      voiceName: prefs.voiceName,
      preferBrowserTts: prefs.engine === 'browser',
      title: params.title,
      yearDisplay: params.yearDisplay,
      eraName: params.eraName,
      subPeriodName: params.subPeriodName,
      regionLabel: params.regionLabel,
      summary: params.summary,
      politics: params.politics,
      economy: params.economy,
      culture: params.culture,
      consequence: params.consequence,
    },
  });

  const audioBlobUrl = res.audioBase64Wav ? base64WavToBlobUrl(res.audioBase64Wav) : null;
  const clip: CachedAudioClip = {
    script: res.script,
    audioBlobUrl,
    ttsFallback: Boolean(res.ttsFallback),
    ttsError: res.ttsError,
  };
  if (audioClipCache.size > 36) {
    const oldestKey = audioClipCache.keys().next().value;
    if (oldestKey) {
      const oldClip = audioClipCache.get(oldestKey);
      if (oldClip?.audioBlobUrl) URL.revokeObjectURL(oldClip.audioBlobUrl);
      audioClipCache.delete(oldestKey);
    }
  }
  audioClipCache.set(fullKey, clip);

  return clip;
}

export function stopActiveNarration(notifyListeners = true): void {
  setAmbientVoiceDucking(false);
  activePlaybackToken += 1;
  if (activeTtsController) {
    try {
      activeTtsController.abort();
    } catch {
      // Ignore
    }
    activeTtsController = null;
  }
  if (cancelPendingWait) {
    const cb = cancelPendingWait;
    cancelPendingWait = null;
    cb();
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // Ignore
    }
    activeAudioEl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
  if (notifyListeners) {
    for (const listener of narrationStopListeners) {
      try {
        listener();
      } catch {
        // Ignore
      }
    }
  }
}

export async function speakWithBrowserSpeech(
  text: string,
  existingToken?: number,
  onProgress?: (ratio: number) => void,
  playbackRate?: number,
): Promise<void> {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, Math.min(18000, Math.max(2200, cleaned.length * 65)));
    });
    return;
  }

  const segments = splitTextIntoSpeechChunks(cleaned, 130, 140);
  if (segments.length === 0) return;

  const token = existingToken !== undefined ? existingToken : ++activePlaybackToken;
  const totalChars = Math.max(
    1,
    segments.reduce((sum, s) => sum + s.length, 0),
  );

  try {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const zhVoice =
      voices.find((v) => /Xiaoxiao|Yunxi|Yunjian|Google 普通话/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('zh') && v.localService) ||
      voices.find((v) => v.lang.startsWith('zh'));

    setAmbientVoiceDucking(true);
    let spokenChars = 0;

    for (const seg of segments) {
      if (token !== activePlaybackToken) break;
      await new Promise<void>((resolve) => {
        if (token !== activePlaybackToken) {
          resolve();
          return;
        }
        const utter = new SpeechSynthesisUtterance(seg);
        utter.lang = 'zh-CN';
        utter.rate = Math.max(0.75, Math.min(1.85, playbackRate ?? activeNarrationPlaybackRate));
        if (zhVoice) utter.voice = zhVoice;

        let settled = false;
        let maxTimeout = 0;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(maxTimeout);
          utter.onboundary = null;
          utter.onend = null;
          utter.onerror = null;
          if (cancelPendingWait === finish) cancelPendingWait = null;
          resolve();
        };
        cancelPendingWait = finish;

        maxTimeout = window.setTimeout(finish, Math.max(12000, seg.length * 260));
        utter.onboundary = (ev) => {
          if (settled || token !== activePlaybackToken) return;
          if (typeof ev.charIndex === 'number' && seg.length > 0) {
            const cur = spokenChars + Math.min(seg.length, Math.max(0, ev.charIndex));
            onProgress?.(Math.max(0, Math.min(1, cur / totalChars)));
          }
        };
        utter.onend = finish;
        utter.onerror = finish;

        window.speechSynthesis.speak(utter);
      });
      spokenChars += seg.length;
      if (token === activePlaybackToken) {
        onProgress?.(Math.max(0, Math.min(1, spokenChars / totalChars)));
      }
    }
  } catch {
    // Ignore speech synthesis runtime errors
  } finally {
    setAmbientVoiceDucking(false);
  }
}

async function playClipRespectingToken(
  clip: AiNarrationResult,
  sessionToken: number,
  onProgress?: (ratio: number) => void,
  playbackRate?: number,
): Promise<'gemini' | 'browser' | 'silent'> {
  if (sessionToken !== activePlaybackToken) return 'silent';

  if (clip.audioBlobUrl) {
    try {
      await new Promise<void>((resolve, reject) => {
        if (sessionToken !== activePlaybackToken) {
          resolve();
          return;
        }
        let settled = false;
        const audio = new Audio(clip.audioBlobUrl!);
        const targetRate = Math.max(
          0.75,
          Math.min(1.85, playbackRate ?? activeNarrationPlaybackRate),
        );
        audio.playbackRate = targetRate;
        (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
        const finish = () => {
          if (settled) return;
          settled = true;
          audio.ontimeupdate = null;
          if (cancelPendingWait === finish) cancelPendingWait = null;
          setAmbientVoiceDucking(false);
          resolve();
        };
        cancelPendingWait = finish;

        activeAudioEl = audio;
        setAmbientVoiceDucking(true);
        audio.ontimeupdate = () => {
          if (audio.duration > 0 && Number.isFinite(audio.duration)) {
            onProgress?.(Math.max(0, Math.min(1, audio.currentTime / audio.duration)));
          }
        };
        audio.onended = () => {
          if (activeAudioEl === audio) activeAudioEl = null;
          finish();
        };
        audio.onerror = () => {
          audio.ontimeupdate = null;
          if (activeAudioEl === audio) activeAudioEl = null;
          if (settled) return;
          settled = true;
          if (cancelPendingWait === finish) cancelPendingWait = null;
          reject(new Error('Audio element playback failed'));
        };
        audio.play().catch((err) => {
          audio.ontimeupdate = null;
          if (activeAudioEl === audio) activeAudioEl = null;
          if (settled) return;
          settled = true;
          if (cancelPendingWait === finish) cancelPendingWait = null;
          reject(err);
        });
      });
      return sessionToken === activePlaybackToken ? 'gemini' : 'silent';
    } catch {
      if (sessionToken !== activePlaybackToken) return 'silent';
      await speakWithBrowserSpeech(clip.script, sessionToken, onProgress, playbackRate);
      return 'browser';
    }
  }

  await speakWithBrowserSpeech(clip.script, sessionToken, onProgress, playbackRate);
  return 'browser';
}

export async function playSingleStaticAudio(params: {
  audioUrl: string | null;
  script: string;
  playbackRate?: number;
  onStartAudio?: () => void;
}): Promise<'gemini' | 'browser' | 'silent'> {
  stopActiveNarration(false);
  const sessionToken = activePlaybackToken;
  params.onStartAudio?.();
  return playClipRespectingToken(
    {
      script: params.script,
      audioBlobUrl: params.audioUrl,
      ttsFallback: !params.audioUrl,
    },
    sessionToken,
    undefined,
    params.playbackRate,
  );
}

export async function playStaticAudioBeats(params: {
  beats: Array<{ audioUrl: string; narration: string }>;
  startIndex?: number;
  onStartAudio?: () => void;
  onBeatStart?: (beatIndex: number) => void;
}): Promise<void> {
  stopActiveNarration(false);
  const sessionToken = activePlaybackToken;
  const start = Math.max(0, Math.min(params.beats.length - 1, params.startIndex ?? 0));

  if (params.beats.length === 0) {
    params.onStartAudio?.();
    return;
  }

  for (let i = start; i < params.beats.length; i++) {
    if (sessionToken !== activePlaybackToken) break;
    const beat = params.beats[i];
    params.onBeatStart?.(i);
    if (i === start) {
      params.onStartAudio?.();
    }
    const mode = await playClipRespectingToken(
      {
        script: beat.narration,
        audioBlobUrl: beat.audioUrl,
        ttsFallback: false,
      },
      sessionToken,
    );
    if (mode === 'silent' || sessionToken !== activePlaybackToken) break;
  }
}

export async function playNarrationClip(
  clip: AiNarrationResult,
): Promise<'gemini' | 'browser' | 'silent'> {
  stopActiveNarration(false);
  return playClipRespectingToken(clip, activePlaybackToken);
}

function createSentenceProgressTracker(
  chunk: SpeechChunk,
  onSentenceChange?: (blockId: string, sentenceIdx: number, chunk: SpeechChunk) => void,
): (ratio: number) => void {
  const { sentenceIndices, sentenceWeights, blockId } = chunk;
  const totalWeight = sentenceWeights.reduce((sum, w) => sum + Math.max(1, w), 0);
  const thresholds: number[] = [];
  let acc = 0;
  for (let i = 0; i < sentenceWeights.length; i++) {
    acc += Math.max(1, sentenceWeights[i]);
    thresholds.push(totalWeight > 0 ? acc / totalWeight : 1);
  }
  let lastEmittedIdx = sentenceIndices[0] ?? -1;

  return (ratio: number) => {
    if (!onSentenceChange || sentenceIndices.length <= 1) return;
    const clamped = Math.max(0, Math.min(0.9999, ratio));
    let targetPos = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (clamped < thresholds[i]) {
        targetPos = i;
        break;
      }
      targetPos = i;
    }
    const targetSentenceIdx = sentenceIndices[targetPos];
    if (targetSentenceIdx !== undefined && targetSentenceIdx !== lastEmittedIdx) {
      lastEmittedIdx = targetSentenceIdx;
      onSentenceChange(blockId, targetSentenceIdx, chunk);
    }
  };
}

export async function playSpeechChunks(params: {
  cachePrefix: string;
  chunks: SpeechChunk[];
  voicePrefs?: AiVoicePrefs;
  onStartAudio?: () => void;
  onChunkStart?: (chunk: SpeechChunk, index: number, total: number) => void;
  onSentenceChange?: (blockId: string, sentenceIdx: number, chunk: SpeechChunk) => void;
}): Promise<void> {
  stopActiveNarration(false);
  const sessionToken = activePlaybackToken;
  const controller = new AbortController();
  activeTtsController = controller;
  const prefs = params.voicePrefs || getVoicePrefs();
  const chunks = params.chunks.filter((c) => c.speechText.trim().length > 0);

  if (chunks.length === 0) {
    params.onStartAudio?.();
    if (activeTtsController === controller) {
      activeTtsController = null;
    }
    return;
  }

  try {
    if (prefs.engine === 'browser') {
      for (let i = 0; i < chunks.length; i++) {
        if (sessionToken !== activePlaybackToken) break;
        const chunk = chunks[i];
        params.onChunkStart?.(chunk, i, chunks.length);
        if (chunk.sentenceIndices.length > 0) {
          params.onSentenceChange?.(chunk.blockId, chunk.sentenceIndices[0], chunk);
        }
        if (i === 0) {
          params.onStartAudio?.();
        }
        await speakWithBrowserSpeech(
          chunk.speechText,
          sessionToken,
          createSentenceProgressTracker(chunk, params.onSentenceChange),
        );
      }
      return;
    }

    const fetchChunk = (index: number) =>
      generateNarration({
        cacheKey: `${params.cachePrefix}:c${chunks[index].chunkIndex}:${chunks[index].speechText.slice(0, 24)}`,
        script: chunks[index].speechText,
        voicePrefs: prefs,
        signal: controller.signal,
      });

    let nextPromise: Promise<AiNarrationResult> | null = fetchChunk(0);
    for (let i = 0; i < chunks.length; i++) {
      if (sessionToken !== activePlaybackToken || !nextPromise) break;
      const clip = await nextPromise;
      if (sessionToken !== activePlaybackToken) break;

      const chunk = chunks[i];
      nextPromise = i + 1 < chunks.length ? fetchChunk(i + 1) : null;
      params.onChunkStart?.(chunk, i, chunks.length);
      if (chunk.sentenceIndices.length > 0) {
        params.onSentenceChange?.(chunk.blockId, chunk.sentenceIndices[0], chunk);
      }
      if (i === 0) {
        params.onStartAudio?.();
      }
      const mode = await playClipRespectingToken(
        clip,
        sessionToken,
        createSentenceProgressTracker(chunk, params.onSentenceChange),
      );
      if (mode === 'silent' || sessionToken !== activePlaybackToken) break;
    }
  } catch (err) {
    if (err instanceof AiClientError && err.code === 'aborted') {
      return;
    }
    throw err;
  } finally {
    if (activeTtsController === controller) {
      activeTtsController = null;
    }
  }
}

export async function playTextPipelined(params: {
  cachePrefix: string;
  text: string;
  voicePrefs?: AiVoicePrefs;
  onStartAudio?: () => void;
}): Promise<void> {
  stopActiveNarration(false);
  const sessionToken = activePlaybackToken;
  const controller = new AbortController();
  activeTtsController = controller;
  const prefs = params.voicePrefs || getVoicePrefs();
  const cleanText = cleanSpeechText(params.text).slice(0, 4000);
  if (!cleanText) {
    params.onStartAudio?.();
    return;
  }

  if (prefs.engine === 'browser') {
    params.onStartAudio?.();
    await speakWithBrowserSpeech(cleanText, sessionToken);
    return;
  }

  const chunks = splitTextIntoSpeechChunks(cleanText);
  if (chunks.length === 0) {
    params.onStartAudio?.();
    return;
  }

  const fetchChunk = (index: number) =>
    generateNarration({
      cacheKey: `${params.cachePrefix}:c${index}:${chunks[index].slice(0, 24)}`,
      script: chunks[index],
      voicePrefs: prefs,
      signal: controller.signal,
    });

  try {
    let nextPromise: Promise<AiNarrationResult> | null = fetchChunk(0);
    for (let i = 0; i < chunks.length; i++) {
      if (sessionToken !== activePlaybackToken || !nextPromise) break;
      const clip = await nextPromise;
      if (sessionToken !== activePlaybackToken) break;

      nextPromise = i + 1 < chunks.length ? fetchChunk(i + 1) : null;
      if (i === 0) {
        params.onStartAudio?.();
      }
      const mode = await playClipRespectingToken(clip, sessionToken);
      if (mode === 'silent' || sessionToken !== activePlaybackToken) break;
    }
  } catch (err) {
    if (err instanceof AiClientError && err.code === 'aborted') {
      return;
    }
    throw err;
  } finally {
    if (activeTtsController === controller) {
      activeTtsController = null;
    }
  }
}
