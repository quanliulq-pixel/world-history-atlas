import {
  authorizeAiRequest,
  callGeminiText,
  callGeminiTtsWav,
  checkRateLimit,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TTS_MODEL,
  jsonResponse,
  parseJsonBody,
  sanitizeVoiceName,
  type GeminiUsage,
  type PagesCtx,
} from '../../_shared/gemini';

interface NarrateRequestBody {
  mode?: 'script-and-audio' | 'audio-only';
  script?: string;
  voiceName?: string;
  preferBrowserTts?: boolean;
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
}

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizeAiRequest(context.request, context.env);
  if (!auth.ok) return auth.response;
  if (!checkRateLimit(context.request, 24)) {
    return jsonResponse({ code: 'rate_limited', error: '语音生成过于频繁，请稍后再试' }, 429);
  }

  const body = await parseJsonBody<NarrateRequestBody>(context.request);
  if (!body) {
    return jsonResponse({ error: '请求体 JSON 格式无效' }, 400);
  }

  const textModel = context.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
  const ttsModel = context.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voice = sanitizeVoiceName(body.voiceName);
  const usage: GeminiUsage = { promptTokens: 0, outputTokens: 0, ttsRequested: false };

  let script = (body.script || '').trim().slice(0, 600);

  try {
    if (!script) {
      const title = (body.title || '').trim().slice(0, 120);
      const summary = (body.summary || '').trim().slice(0, 400);
      if (!title || !summary) {
        return jsonResponse({ error: '缺少解说标题或摘要内容' }, 400);
      }

      const systemInstruction =
        '你是历史纪录片《世界通史时空图谱》的金牌撰稿人。请撰写一段适合口播朗读的中文历史解说词：像 BBC/CCTV 纪录片旁白一样沉稳、有画面感，能用一两句话点出背后的政治、经济或文明转折。严格限制 90-135 字，纯中文散文口播稿，绝对禁止出现 Markdown 星号、括号注释、舞台提示词或换行分段标题。';

      const prompt = [
        `条目：《${title}》`,
        body.yearDisplay ? `年代：${body.yearDisplay}` : '',
        body.eraName ? `时代：${body.eraName}${body.subPeriodName ? ` · ${body.subPeriodName}` : ''}` : '',
        body.regionLabel ? `区域：${body.regionLabel}` : '',
        `核心摘要：${summary}`,
        body.politics ? `政治维度：${body.politics.slice(0, 160)}` : '',
        body.economy ? `经济维度：${body.economy.slice(0, 160)}` : '',
        body.culture ? `文化维度：${body.culture.slice(0, 140)}` : '',
        body.consequence ? `历史后果：${body.consequence.slice(0, 160)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const textRes = await callGeminiText(auth.apiKey, textModel, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.6,
        maxOutputTokens: 450,
      });

      script = textRes.text.replace(/[*#`>\[\]]/g, '').replace(/\s+/g, ' ').trim();
      usage.promptTokens += textRes.usage.promptTokens;
      usage.outputTokens += textRes.usage.outputTokens;
    }

    if (body.preferBrowserTts) {
      return jsonResponse({
        script,
        audioBase64Wav: null,
        mimeType: null,
        ttsFallback: false,
        usage,
      });
    }

    try {
      usage.ttsRequested = true;
      const tts = await callGeminiTtsWav(auth.apiKey, ttsModel, script, voice);
      return jsonResponse({
        script,
        audioBase64Wav: tts.audioBase64Wav,
        mimeType: tts.mimeType,
        sampleRate: tts.sampleRate,
        ttsFallback: false,
        usage,
      });
    } catch (ttsErr) {
      const ttsError = ttsErr instanceof Error ? ttsErr.message : 'TTS 音频生成失败';
      return jsonResponse({
        script,
        audioBase64Wav: null,
        mimeType: null,
        ttsFallback: true,
        ttsError,
        usage,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '解说词生成失败';
    return jsonResponse({ error: message }, 502);
  }
};
