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
import {
  STORYBOARD_SCHEMA,
  sanitizeStoryboard,
  type AiStoryboard,
} from '../../_shared/storyboard';

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
  storyboard?: AiStoryboard | null;
}

interface ChatTutorResult {
  reply: string;
  storyboard?: AiStoryboard | null;
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

const TUTOR_CHAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    storyboard: STORYBOARD_SCHEMA,
  },
  required: ['reply', 'storyboard'],
};

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
    storyboard: STORYBOARD_SCHEMA,
  },
  required: ['title', 'thesis', 'dimensions', 'commonalities', 'divergences', 'modernEcho', 'storyboard'],
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
        '你是《世界通史时空图谱》的比较史学教授。请以中文输出精炼、深刻、结构化的双主体历史比较分析，同时编制一组 4 幕动态地图对比演播脚本（storyboard），严格遵守给定 JSON Schema。';

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
        `- storyboard: 生成 4 幕地图动画分镜，严格按照朗读与对比结构顺序对应：第 1 幕聚焦对照组 A 核心地域与“地缘条件对比”；第 2 幕镜头飞往对照组 B 核心地域，配合“政制与权力对比”；第 3 幕聚焦两地“经济与财税对比”或关键商路/货币流向；第 4 幕拉远视角（zoom 1.4-2.2）用双向发光弧线（bidirectional: true）连接两地呈现“文化与观念对比 / 当代回响”。每幕务必填写 matchSnippet（原样摘录对应字段正文中的 6-16 个连续汉字，不含标点和星号）、合适的 camera 偏航与俯仰（bearing: -16..16, pitch: 16..30）、spots（标注 icon: city|landmark|port|trade|military|culture|climate|ruler）以及 0-2 个地理影响圈 zones（center, radiusKm: 150-1200, label, color）。坐标必须为真实 [经度, 纬度]，颜色使用鲜明 6 位 Hex（如 #D97706 / #10B981 / #3B82F6 / #E11D48 / #8B5CF6）。`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await callGeminiText(auth.apiKey, model, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.55,
        maxOutputTokens: 3600,
        responseMimeType: 'application/json',
        responseSchema: COMPARE_SCHEMA,
      });

      const parsed = extractJson<ComparisonResult>(res.text);
      const storyboard = sanitizeStoryboard(parsed.storyboard);
      const { storyboard: _drop, ...comparison } = parsed;
      void _drop;
      return jsonResponse({ comparison, storyboard, usage: res.usage });
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
      '你是《世界通史时空图谱》的随身 AI 历史、政治、经济与文化导师，同时也是左侧互动地图的“动画导演”。',
      '请严格以 JSON 输出两项内容：',
      '1. `reply`（给用户阅读的文字解答，260-480 字中文）：',
      '   - 先给出一句直击本质的结论，再用清晰的要点分条剖析（政治博弈/财税经济/地理约束/文化观念等）。',
      '   - 善用跨文明横向类比与通俗比喻，可使用 **加粗** 与分点符号，但禁止输出 HTML 标签。',
      '2. `storyboard`（配合讲解在左侧地图实时播放的 3-4 幕动态地图分镜，务必与 `reply` 严格保持一致）：',
      '   - `title`: 简短演播标题（16字以内）。',
      '   - `steps`（3-4 幕，必须严格按照 `reply` 正文段落与分条要点的出现顺序依次编排，禁止打乱顺序）：',
      '     - `title`: 每幕短标题（10字以内）；`caption`: 1句话旁白字幕（35-65字），与地图当前动画呼应；',
      '     - `matchSnippet`: 必须原样摘录 `reply` 中与本幕对应的那一段/那一条里的 6-18 个连续汉字（不含 `*` 等 Markdown 符号），用于前端朗读正文时实时锁定本幕动画；',
      '     - `year`: 该幕对应的历史公元年份（公元前用负数，如 -221、1492、1570）；地图会自动渐变到该年帝国疆域；',
      '     - `center`: [经度, 纬度] 真实地理坐标，决定镜头聚焦中心；`zoom`: 1.4-4.8 合适视野（跨洲传播用 1.5-2.3，区域事件用 2.8-4.5）；`bearing`: -18 到 18 运镜偏航角；`pitch`: 16 到 30 三维俯仰角；',
      '     - `zones`（0-2 个地理区域光圈）：`center` `[lng, lat]`、`radiusKm`（140-1100）、可选简短 `label`、6位Hex `color`，用于标出文明腹地、灾害气候带或殖民区；',
      '     - `spots`（1-4 个关键地点脉冲锚点）：真实 `[lng, lat]`、`label`（8字以内）、可选 `sublabel`（12字以内）、6位Hex `color`、`icon`（`city|landmark|port|trade|military|culture|climate|ruler`）；',
      '     - `flows`（1-4 条发光动态流向弧线，对应航线、物种交换、白银流动、军事进军或制度传播）：真实 `from` 与 `to` `[lng, lat]`、简短 `label`（如“玉米/马铃薯东传”、“黑奴三角航线”、“天主教西扩”）、鲜明 6 位 Hex `color`（如 `#D97706` 黄金/经济、`#10B981` 物种/农业、`#3B82F6` 航线/思想、`#E11D48` 军事/冲突）、`kind`（`trade|diffusion|military|voyage|influence`）与是否双向 `bidirectional`。',
      '',
      buildContextBlock(body.context),
    ].join('\n');

    const res = await callGeminiText(auth.apiKey, model, {
      systemInstruction,
      contents,
      temperature: 0.65,
      maxOutputTokens: 3600,
      responseMimeType: 'application/json',
      responseSchema: TUTOR_CHAT_SCHEMA,
    });

    let replyText = res.text;
    let storyboard: AiStoryboard | null = null;
    try {
      const parsed = extractJson<ChatTutorResult>(res.text);
      if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
        replyText = parsed.reply.trim();
        storyboard = sanitizeStoryboard(parsed.storyboard);
      }
    } catch {
      // Fall back cleanly to plain text if JSON parse fails unexpectedly
    }

    return jsonResponse({ reply: replyText, storyboard, usage: res.usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 导师请求失败';
    return jsonResponse({ error: message }, 502);
  }
};
