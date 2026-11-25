import {
  authorizeAiRequest,
  callGeminiText,
  checkRateLimit,
  DEFAULT_TEXT_MODEL,
  extractJson,
  jsonResponse,
  parseJsonBody,
  type PagesCtx,
} from '../../_shared/gemini';

interface TutorContextPayload {
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

interface TutorRequestBody {
  mode?: 'chat' | 'compare';
  context?: TutorContextPayload;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  question?: string;
  subjectA?: string;
  subjectB?: string;
  angle?: string;
}

interface ComparisonResult {
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

function formatYearText(year: number): string {
  return year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
}

function buildContextBlock(ctx?: TutorContextPayload): string {
  if (!ctx) return '当前未指定具体时代与条目，请围绕全球通史主干回答。';
  const lines: string[] = [
    `当前时间位置：${formatYearText(ctx.currentYear)}${ctx.eraName ? `（${ctx.eraName}` : ''}${
      ctx.subPeriodName ? ` · ${ctx.subPeriodName}）` : ctx.eraName ? '）' : ''
    }`,
  ];
  if (ctx.country) {
    lines.push(
      `正在研读国家/地区：${ctx.country.name} — ${ctx.country.tagline}`,
      ctx.country.politics ? `政制脉络：${ctx.country.politics.slice(0, 220)}` : '',
      ctx.country.economy ? `经济脉络：${ctx.country.economy.slice(0, 220)}` : '',
    );
  }
  if (ctx.event) {
    lines.push(
      `当前聚焦历史事件：《${ctx.event.title}》（${ctx.event.dateDisplay} · ${ctx.event.locationName}）`,
      `核心概要：${ctx.event.summary}`,
      ctx.event.politics ? `政治逻辑：${ctx.event.politics.slice(0, 200)}` : '',
      ctx.event.economy ? `经济逻辑：${ctx.event.economy.slice(0, 200)}` : '',
      ctx.event.culture ? `文化影响：${ctx.event.culture.slice(0, 180)}` : '',
    );
  }
  if (ctx.figure) {
    lines.push(
      `当前聚焦历史人物：${ctx.figure.name}（${ctx.figure.title} · ${ctx.figure.lifespanDisplay}）`,
      `人物定性：${ctx.figure.oneLiner}`,
      ctx.figure.coreContributions ? `核心功绩：${ctx.figure.coreContributions.slice(0, 220)}` : '',
    );
  }
  return lines.filter(Boolean).join('\n');
}

const COMPARE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    thesis: { type: 'STRING' },
    dimensions: {
      type: 'OBJECT',
      properties: {
        geopolitics: { type: 'STRING' },
        politics: { type: 'STRING' },
        economy: { type: 'STRING' },
        culture: { type: 'STRING' },
      },
      required: ['geopolitics', 'politics', 'economy', 'culture'],
    },
    commonalities: { type: 'ARRAY', items: { type: 'STRING' } },
    divergences: { type: 'ARRAY', items: { type: 'STRING' } },
    modernEcho: { type: 'STRING' },
  },
  required: ['title', 'thesis', 'dimensions', 'commonalities', 'divergences', 'modernEcho'],
};

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizeAiRequest(context.request, context.env);
  if (!auth.ok) return auth.response;
  if (!checkRateLimit(context.request, 24)) {
    return jsonResponse({ code: 'rate_limited', error: '提问过于频繁，请稍等一分钟后再试' }, 429);
  }

  const body = await parseJsonBody<TutorRequestBody>(context.request);
  if (!body) {
    return jsonResponse({ error: '请求体 JSON 格式无效' }, 400);
  }

  const model = context.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;

  try {
    if (body.mode === 'compare') {
      const subjectA = (body.subjectA || '').trim().slice(0, 120);
      const subjectB = (body.subjectB || '').trim().slice(0, 120);
      const angle = (body.angle || '').trim().slice(0, 160);
      if (!subjectA || !subjectB) {
        return jsonResponse({ error: '请同时填写两个需要对比的历史对象' }, 400);
      }

      const systemInstruction =
        '你是《世界通史时空图谱》的比较史学教授。请以中文输出精炼、深刻、结构化的双主体历史比较分析，严格避免空洞套话，注重地缘条件、国家制度财政能力、商业金融逻辑与思想文化结构，并严格遵守给定 JSON Schema。';

      const prompt = [
        `请对以下两个历史对象进行跨时空结构化比较：`,
        `- 对照组 A：${subjectA}`,
        `- 对照组 B：${subjectB}`,
        angle ? `- 特别聚焦维度/问题：${angle}` : '',
        `\n各字段要求：`,
        `- title: 简洁有力的专题对比标题（18字以内）`,
        `- thesis: 1-2句凝练核心判断（解释为何把两者放在一起看最能看清历史规律）`,
        `- dimensions: 分别从地缘、政制、经济、文化四个角度写出具体对比（每项 65-110 字）`,
        `- commonalities: 2-3条深层结构性共性`,
        `- divergences: 2-3条造成后续分流的根本差异`,
        `- modernEcho: 1-2句当代回响或现实制度/经济启发`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await callGeminiText(auth.apiKey, model, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.55,
        maxOutputTokens: 1600,
        responseMimeType: 'application/json',
        responseSchema: COMPARE_SCHEMA,
      });

      const comparison = extractJson<ComparisonResult>(res.text);
      return jsonResponse({ comparison, usage: res.usage });
    }

    const question = (body.question || '').trim().slice(0, 1200);
    if (!question) {
      return jsonResponse({ error: '请输入想要咨询的历史问题' }, 400);
    }

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = history
      .filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text.trim().slice(0, 1400) }],
      }));

    contents.push({
      role: 'user',
      parts: [{ text: question }],
    });

    const systemInstruction = [
      '你是《世界通史时空图谱》的随身 AI 历史、政治、经济与文化导师。用户希望理解真实世界如何运转，而不是死记年份。',
      '回答原则：',
      '1. 先给出一句直击本质的结论，再用清晰的要点分条剖析（政治博弈/财税经济/地理约束/文化观念等维度，按问题所需展开）。',
      '2. 善用跨文明横向类比与通俗比喻，篇幅精炼在 260-480 字，适合在手机和桌面端阅读，不要堆砌冗长废话。',
      '3. 可使用 **加粗** 与分点符号，但不要输出 HTML 标签。',
      '4. 史实严谨，若存在学界争议请简要客观说明。',
      '',
      buildContextBlock(body.context),
    ].join('\n');

    const res = await callGeminiText(auth.apiKey, model, {
      systemInstruction,
      contents,
      temperature: 0.65,
      maxOutputTokens: 1400,
    });

    return jsonResponse({ reply: res.text, usage: res.usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 导师请求失败';
    return jsonResponse({ error: message }, 502);
  }
};
