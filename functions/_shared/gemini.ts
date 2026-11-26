export interface StudyKvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface AiEnv {
  GEMINI_API_KEY?: string;
  AI_ACCESS_PASSCODE?: string;
  AI_ALLOW_PUBLIC?: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_TTS_MODEL?: string;
  STUDY_KV?: StudyKvNamespace;
}

export interface PagesCtx {
  request: Request;
  env: AiEnv;
}

export interface GeminiUsage {
  promptTokens: number;
  outputTokens: number;
  ttsRequested?: boolean;
}

export const DEFAULT_TEXT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_TTS_MODEL = 'gemini-3.8-flash-lite-tts';
export const FALLBACK_TTS_MODEL = 'gemini-3.8-flash-tts';
export const ALLOWED_VOICES = ['Kore', 'Aoede', 'Puck', 'Fenrir', 'Charon'] as const;
export type AllowedVoice = (typeof ALLOWED_VOICES)[number];

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function authorizeAiRequest(
  request: Request,
  env: AiEnv,
): { ok: true; apiKey: string } | { ok: false; response: Response } {
  const apiKey = env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) {
    return {
      ok: false,
      response: jsonResponse(
        {
          code: 'not_configured',
          error: '尚未在 Cloudflare Pages 配置 GEMINI_API_KEY 密钥',
        },
        503,
      ),
    };
  }

  const expectedPasscode = env.AI_ACCESS_PASSCODE?.trim() || '';
  if (!expectedPasscode) {
    if (env.AI_ALLOW_PUBLIC === 'true') {
      return { ok: true, apiKey };
    }
    return {
      ok: false,
      response: jsonResponse(
        {
          code: 'passcode_unconfigured',
          error: '为保护您的额度安全，请先在 Cloudflare Pages 配置 AI_ACCESS_PASSCODE 个人口令',
        },
        403,
      ),
    };
  }

  const provided = request.headers.get('X-Atlas-Passcode')?.trim() || '';
  if (!provided || !constantTimeEqual(provided, expectedPasscode)) {
    return {
      ok: false,
      response: jsonResponse(
        {
          code: 'passcode_invalid',
          error: '个人学习口令不正确，请重新输入',
        },
        401,
      ),
    };
  }

  return { ok: true, apiKey };
}

export function authorizePasscodeOnly(
  request: Request,
  env: AiEnv,
): { ok: true } | { ok: false; response: Response } {
  const expectedPasscode = env.AI_ACCESS_PASSCODE?.trim() || '';
  if (!expectedPasscode) {
    if (env.AI_ALLOW_PUBLIC === 'true') return { ok: true };
    return {
      ok: false,
      response: jsonResponse(
        {
          code: 'passcode_unconfigured',
          error: '尚未配置 AI_ACCESS_PASSCODE 口令，云端同步暂不可用',
        },
        403,
      ),
    };
  }
  const provided = request.headers.get('X-Atlas-Passcode')?.trim() || '';
  if (!provided || !constantTimeEqual(provided, expectedPasscode)) {
    return {
      ok: false,
      response: jsonResponse(
        {
          code: 'passcode_invalid',
          error: '请先输入正确的学习口令以启用跨设备云同步',
        },
        401,
      ),
    };
  }
  return { ok: true };
}

export function checkRateLimit(request: Request, maxPerMinute = 24): boolean {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = Date.now();
  const prev = rateBuckets.get(ip) || [];
  const active = prev.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (active.length >= maxPerMinute) {
    rateBuckets.set(ip, active);
    return false;
  }
  active.push(now);
  rateBuckets.set(ip, active);
  if (rateBuckets.size > 500) {
    for (const [key, stamps] of rateBuckets.entries()) {
      if (stamps.every((ts) => now - ts >= RATE_WINDOW_MS)) {
        rateBuckets.delete(key);
      }
    }
  }
  return true;
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function extractJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstObj = candidate.indexOf('{');
    const lastObj = candidate.lastIndexOf('}');
    if (firstObj !== -1 && lastObj > firstObj) {
      return JSON.parse(candidate.slice(firstObj, lastObj + 1)) as T;
    }
    throw new Error('模型返回的 JSON 格式解析失败');
  }
}

interface GeminiTextOptions {
  systemInstruction?: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        thought?: boolean;
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
}

export async function callGeminiText(
  apiKey: string,
  model: string,
  opts: GeminiTextOptions,
): Promise<{ text: string; usage: GeminiUsage }> {
  const isLegacy25 = /gemini-2\.5/i.test(model);
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.65,
    maxOutputTokens: opts.maxOutputTokens ?? 2400,
    thinkingConfig: isLegacy25 ? { thinkingBudget: 0 } : { thinkingLevel: 'LOW' },
  };
  if (opts.responseMimeType) {
    generationConfig.responseMimeType = opts.responseMimeType;
  }
  if (opts.responseSchema) {
    generationConfig.responseSchema = opts.responseSchema;
  }

  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig,
  };
  if (opts.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: opts.systemInstruction }],
    };
  }

  const res = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as GeminiGenerateResponse | null;
  if (!res.ok) {
    const msg = payload?.error?.message || `Gemini API HTTP ${res.status}`;
    throw new Error(msg);
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) {
    const reason = payload?.candidates?.[0]?.finishReason || 'EMPTY';
    throw new Error(`Gemini 未返回有效文本内容 (${reason})`);
  }

  return {
    text,
    usage: {
      promptTokens: Number(payload?.usageMetadata?.promptTokenCount || 0),
      outputTokens: Number(payload?.usageMetadata?.candidatesTokenCount || 0),
    },
  };
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate: number): string {
  const pcm = base64ToUint8(pcmBase64);
  const headerLen = 44;
  const wav = new Uint8Array(headerLen + pcm.length);
  const view = new DataView(wav.buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, headerLen);

  return uint8ToBase64(wav);
}

export function sanitizeVoiceName(raw?: string): AllowedVoice {
  if (raw && (ALLOWED_VOICES as readonly string[]).includes(raw)) {
    return raw as AllowedVoice;
  }
  return 'Kore';
}

async function requestTtsOnce(
  apiKey: string,
  model: string,
  prompt: string,
  voiceName: AllowedVoice,
): Promise<{ audioBase64Wav: string; mimeType: 'audio/wav'; sampleRate: number }> {
  const res = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    }),
  });

  const payload = (await res.json().catch(() => null)) as GeminiGenerateResponse | null;
  if (!res.ok) {
    const msg = payload?.error?.message || `Gemini TTS HTTP ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const audioPart = payload?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const inlineData = audioPart?.inlineData;
  if (!inlineData?.data) {
    throw new Error('Gemini TTS 未返回音频数据');
  }

  const mime = inlineData.mimeType || 'audio/L16;rate=24000';
  if (mime.includes('wav')) {
    return { audioBase64Wav: inlineData.data, mimeType: 'audio/wav', sampleRate: 24000 };
  }

  const rateMatch = mime.match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? Number.parseInt(rateMatch[1], 10) || 24000 : 24000;
  const wavBase64 = pcmBase64ToWavBase64(inlineData.data, sampleRate);
  return {
    audioBase64Wav: wavBase64,
    mimeType: 'audio/wav',
    sampleRate,
  };
}

export async function callGeminiTtsWav(
  apiKey: string,
  model: string,
  text: string,
  voiceName: AllowedVoice = 'Kore',
): Promise<{ audioBase64Wav: string; mimeType: 'audio/wav'; sampleRate: number }> {
  // Gemini TTS speaks the input text verbatim — pass clean prose only (never add instructions).
  const cleanTranscript = text
    .replace(/[*#`>_~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanTranscript) {
    throw new Error('缺少可朗读的正文内容');
  }
  try {
    return await requestTtsOnce(apiKey, model, cleanTranscript, voiceName);
  } catch (err) {
    const status = (err as { status?: number }).status;
    const msg = err instanceof Error ? err.message : '';
    const shouldFallback =
      model !== FALLBACK_TTS_MODEL &&
      (status === 404 || /no longer available|not found/i.test(msg));
    if (shouldFallback) {
      return await requestTtsOnce(apiKey, FALLBACK_TTS_MODEL, cleanTranscript, voiceName);
    }
    throw err;
  }
}
