import {
  authorizeAiRequest,
  callGeminiText,
  callGeminiTtsWav,
  checkRateLimit,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TTS_MODEL,
  extractJson,
  jsonResponse,
  parseJsonBody,
  sanitizeVoiceName,
  type GeminiUsage,
  type PagesCtx,
} from '../../_shared/gemini';
import {
  DOCUMENTARY_NARRATION_SCHEMA,
  sanitizeCoords,
  sanitizeDocumentaryPlan,
  type DocumentaryPlan,
} from '../../_shared/storyboard';

interface NarrateRequestBody {
  mode?: 'script-and-audio' | 'audio-only';
  withStoryboard?: boolean;
  depth?: 'story' | 'concise';
  script?: string;
  voiceName?: string;
  preferBrowserTts?: boolean;
  title?: string;
  year?: number;
  yearDisplay?: string;
  coords?: [number, number];
  eraName?: string;
  subPeriodName?: string;
  regionLabel?: string;
  summary?: string;
  geography?: string;
  politics?: string;
  economy?: string;
  culture?: string;
  consequence?: string;
  causesText?: string;
  effectsText?: string;
  keyFiguresText?: string;
  debate?: string;
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
  const isStoryDepth = body.depth !== 'concise';

  let script = (body.script || '').trim().slice(0, 2400);

  try {
    if (!script && body.withStoryboard) {
      const title = (body.title || '').trim().slice(0, 120);
      const summary = (body.summary || '').trim().slice(0, 800);
      if (!title || !summary) {
        return jsonResponse({ error: '缺少解说标题或摘要内容' }, 400);
      }

      const fallbackCoords = sanitizeCoords(body.coords) || [35, 25];
      const fallbackYear = Number.isFinite(Number(body.year))
        ? Math.max(-3000, Math.min(2025, Math.round(Number(body.year))))
        : 1492;

      const systemInstruction = isStoryDepth
        ? [
            '你是《明朝那些事儿》与 BBC/NHK 纪实大片融合风格的历史长篇评书作者与导演，为《世界通史时空图谱》制作“有声连载评书与地图同步分镜”（恰好 4 幕 beats，总字数 850–1250 字，不求精简，要像在茶馆或广播里讲故事一样把前因后果和人物心理讲透）。',
            '严格遵守以下创作与空间同步原则：',
            '1. `beats` 必须恰好为 4 幕，每幕 `narration` 写 200–320 字纯口语中文（严禁出现星号、井号、括号舞台提示或小标题）：',
            '   - 叙事口吻：开场先用生活化场景或人物困境抓住耳朵，适当穿插通俗现代类比、冷幽默点评，把各路人物“当时到底在盘算什么、为什么非走这一步不可”演出来。',
            '   - 第 1 幕（山雨欲来与地理舞台）：交待它从前面哪些历史积弊与前因酝酿而来，山川河流、气候或资源卡脖子怎样把各方逼到台前。',
            '   - 第 2 幕（权谋交锋与关键抉择）：细讲核心人物的处境、对手的算计、制度碰撞或战场险局，不要只报结果，要讲清博弈过程。',
            '   - 第 3 幕（账本里的底层推手）：说白了打仗和改制背后都是钱粮、税收、矿路或技术传播在推着走，用大白话算清这笔政经大账。',
            '   - 第 4 幕（结局回响与后世伏笔）：交代当场人物的收场、普通人生活怎么被改写，并留出钩子指向它之后引爆的连锁历史大事件。',
            '2. 每幕旁白配精准贴合字面内容的 `center`、`zoom`、`bearing`（-24 到 24 度）、`pitch`（16 到 32 度）、`zones`、`spots`、`flows`（用真实 `[经度, 纬度]` 标出，标签简短控制在 8 字以内）。',
            '3. 4 幕年份 `year` 应呈现“前因铺垫年 → 爆发高潮年 → 扩散展开年 → 深远影响年”的真实时间推演。',
          ].join('\n')
        : [
            '你是 BBC / Vox 风格的历史纪录片导演与撰稿人，负责为《世界通史时空图谱》制作“旁白与左侧动态地图同步分镜”（恰好 3 幕 beats）。',
            '严格遵守以下创作与空间同步原则：',
            '1. `beats` 必须恰好为 3 幕（第 1 幕：核心地理舞台与制度/起源；第 2 幕：关键商贸、传播、军事或技术流向动态；第 3 幕：历史转折、衰退/变迁或深远辐射后果）。',
            '2. 每幕 `narration`（36-58 字纯中文纪录片口播散文，禁止 Markdown 星号、括号注释或舞台提示）写完后，立刻为其配置精准贴合该句字面内容的 `center`、`zoom`、`bearing`（-24 到 24 度轻微运镜偏航）、`pitch`（16 到 32 度三维俯仰）、`zones`、`spots`、`flows`：',
            '   - **禁止画面空洞或与旁白无关**：旁白提到哪条河流、海域、都城、关隘、矿山或航线，地图的 `spots`、`zones` 和 `flows` 就必须用真实 `[经度, 纬度]` 标出对应位置与流向箭头！',
            '   - 第 1 幕优先拉近核心区域（`zoom 3.3-4.6`），配 1 个地理/文明影响光圈 `zones`（`radiusKm: 180-950`）、2 个带 `icon`（`city|landmark|port|trade|military|culture|climate|ruler`）的关键 `spots`，以及 1 条内部联动流向 `flows`。',
            '   - 第 2 幕配合跨区往来、远征或传播，配置 1-2 条明确有起止方向和简短中文 `label`（8字以内）的 `flows`（`kind: trade|diffusion|military|voyage|influence`，仅互惠贸易用 `bidirectional: true`）。',
            '   - 第 3 幕体现结构转变、气候/危机或制度遗产辐射，可用对比色彩（如 `#E11D48` 危机/迁徙、`#10B981` 生态/经济、`#8B5CF6` 文化扩散、`#D97706` 帝国枢纽）的 `zones` 与扩散 `flows`。',
            '3. 3 幕年份 `year` 可小幅推进或聚焦核心年份（如起源年 → 鼎盛/高潮年 → 衰落/深远影响年）。',
          ].join('\n');

      const prompt = [
        `条目：《${title}》`,
        body.yearDisplay ? `年代：${body.yearDisplay}` : `公元年份：${fallbackYear}`,
        `主坐标：[${fallbackCoords[0]}, ${fallbackCoords[1]}]`,
        body.eraName ? `时代：${body.eraName}${body.subPeriodName ? ` · ${body.subPeriodName}` : ''}` : '',
        body.regionLabel ? `区域：${body.regionLabel}` : '',
        `核心摘要：${summary}`,
        body.causesText ? `前因渊源：${body.causesText.slice(0, 320)}` : '',
        body.geography ? `地缘与自然条件：${body.geography.slice(0, 360)}` : '',
        body.politics ? `政治与制度：${body.politics.slice(0, 360)}` : '',
        body.keyFiguresText ? `核心人物：${body.keyFiguresText.slice(0, 260)}` : '',
        body.economy ? `经济与贸易：${body.economy.slice(0, 360)}` : '',
        body.culture ? `文化与思想：${body.culture.slice(0, 340)}` : '',
        body.consequence ? `历史后果：${body.consequence.slice(0, 360)}` : '',
        body.debate ? `史学争鸣：${body.debate.slice(0, 260)}` : '',
        body.effectsText ? `后续连锁事件：${body.effectsText.slice(0, 320)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const textRes = await callGeminiText(auth.apiKey, textModel, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.65,
        maxOutputTokens: isStoryDepth ? 5600 : 2600,
        responseMimeType: 'application/json',
        responseSchema: DOCUMENTARY_NARRATION_SCHEMA,
      });

      usage.promptTokens += textRes.usage.promptTokens;
      usage.outputTokens += textRes.usage.outputTokens;

      let plan: DocumentaryPlan | null = null;
      try {
        const parsed = extractJson<unknown>(textRes.text);
        plan = sanitizeDocumentaryPlan(parsed, title, fallbackYear, fallbackCoords);
      } catch {
        plan = null;
      }

      if (!plan) {
        const fallbackNarration = `${body.yearDisplay ? `${body.yearDisplay}，` : ''}${title}。${summary}`.slice(
          0,
          120,
        );
        plan = {
          script: fallbackNarration,
          beats: [{ title, narration: fallbackNarration }],
          storyboard: {
            title,
            steps: [
              {
                title,
                caption: fallbackNarration,
                matchSnippet: fallbackNarration.slice(0, 18),
                year: fallbackYear,
                center: fallbackCoords,
                zoom: 3.4,
                bearing: 0,
                pitch: 20,
                zones: [
                  {
                    center: fallbackCoords,
                    radiusKm: 420,
                    label: body.regionLabel || title.slice(0, 10),
                    color: '#D97706',
                  },
                ],
                spots: [
                  {
                    coords: fallbackCoords,
                    label: title.slice(0, 14),
                    color: '#D97706',
                    icon: 'landmark',
                  },
                ],
                flows: [],
              },
            ],
          },
        };
      }

      return jsonResponse({
        script: plan.script,
        beats: plan.beats,
        storyboard: plan.storyboard,
        audioBase64Wav: null,
        mimeType: null,
        ttsFallback: false,
        usage,
      });
    }

    if (!script) {
      const title = (body.title || '').trim().slice(0, 120);
      const summary = (body.summary || '').trim().slice(0, 800);
      if (!title || !summary) {
        return jsonResponse({ error: '缺少解说标题或摘要内容' }, 400);
      }

      const systemInstruction = isStoryDepth
        ? '你是《明朝那些事儿》风格的历史长篇评书首席撰稿人。请撰写一段适合边看地图边听书的中文历史长篇解说词：务必从人物当时的处境与心理盘算切入，穿插通俗生活化类比与恰到好处的冷幽默，讲清楚前因渊源、权谋制度博弈、财政经济与技术推手以及后续历史连锁反应。篇幅控制在 550-850 字，纯口语中文散文，绝对禁止 Markdown 星号、井号、括号舞台提示或分段小标题。'
        : '你是历史纪录片《世界通史时空图谱》的金牌撰稿人。请撰写一段适合口播朗读的中文历史解说词：像 BBC/CCTV 纪录片旁白一样沉稳、有画面感，能用一两句话点出背后的政治、经济或文明转折。严格限制 90-135 字，纯中文散文口播稿，绝对禁止出现 Markdown 星号、括号注释、舞台提示词或换行分段标题。';

      const prompt = [
        `条目：《${title}》`,
        body.yearDisplay ? `年代：${body.yearDisplay}` : '',
        body.eraName ? `时代：${body.eraName}${body.subPeriodName ? ` · ${body.subPeriodName}` : ''}` : '',
        body.regionLabel ? `区域：${body.regionLabel}` : '',
        `核心摘要：${summary}`,
        body.causesText ? `前因渊源：${body.causesText.slice(0, 320)}` : '',
        body.geography ? `地理条件：${body.geography.slice(0, 240)}` : '',
        body.politics ? `政治维度：${body.politics.slice(0, 260)}` : '',
        body.keyFiguresText ? `核心人物：${body.keyFiguresText.slice(0, 220)}` : '',
        body.economy ? `经济维度：${body.economy.slice(0, 260)}` : '',
        body.culture ? `文化维度：${body.culture.slice(0, 240)}` : '',
        body.consequence ? `历史后果：${body.consequence.slice(0, 260)}` : '',
        body.debate ? `史学争鸣：${body.debate.slice(0, 220)}` : '',
        body.effectsText ? `后续连锁：${body.effectsText.slice(0, 320)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const textRes = await callGeminiText(auth.apiKey, textModel, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.65,
        maxOutputTokens: isStoryDepth ? 2400 : 1000,
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
