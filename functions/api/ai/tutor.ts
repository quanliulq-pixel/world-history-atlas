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

interface AiStoryboardFlow {
  from: [number, number];
  to: [number, number];
  label: string;
  color: string;
  kind: 'trade' | 'diffusion' | 'military' | 'voyage' | 'influence';
  bidirectional?: boolean;
}

interface AiStoryboardSpot {
  coords: [number, number];
  label: string;
  sublabel?: string;
  color: string;
}

interface AiStoryboardStep {
  title: string;
  caption: string;
  year: number;
  center: [number, number];
  zoom: number;
  spots: AiStoryboardSpot[];
  flows: AiStoryboardFlow[];
}

interface AiStoryboard {
  title: string;
  steps: AiStoryboardStep[];
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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_FLOW_KINDS = new Set(['trade', 'diffusion', 'military', 'voyage', 'influence']);

function sanitizeCoords(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const lng = Number(raw[0]);
  const lat = Number(raw[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [
    Math.max(-180, Math.min(180, Number(lng.toFixed(3)))),
    Math.max(-78, Math.min(82, Number(lat.toFixed(3)))),
  ];
}

function sanitizeHexColor(raw: unknown, fallback = '#D97706'): string {
  return typeof raw === 'string' && HEX_COLOR_RE.test(raw.trim()) ? raw.trim() : fallback;
}

function sanitizeStoryboard(raw: unknown): AiStoryboard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const rawSteps = Array.isArray(obj.steps) ? obj.steps.slice(0, 5) : [];
  const steps: AiStoryboardStep[] = [];

  for (const rawStep of rawSteps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const s = rawStep as Record<string, unknown>;
    const title = typeof s.title === 'string' ? s.title.trim().slice(0, 40) : '';
    const caption = typeof s.caption === 'string' ? s.caption.trim().slice(0, 140) : '';
    const center = sanitizeCoords(s.center);
    if (!title || !center) continue;

    const rawYear = Number(s.year);
    const year = Number.isFinite(rawYear)
      ? Math.max(-3000, Math.min(2025, Math.round(rawYear)))
      : 1492;
    const rawZoom = Number(s.zoom);
    const zoom = Number.isFinite(rawZoom)
      ? Math.max(1.2, Math.min(5.8, Number(rawZoom.toFixed(2))))
      : 2.6;

    const spots: AiStoryboardSpot[] = [];
    if (Array.isArray(s.spots)) {
      for (const rs of s.spots.slice(0, 5)) {
        if (!rs || typeof rs !== 'object') continue;
        const sp = rs as Record<string, unknown>;
        const coords = sanitizeCoords(sp.coords);
        const label = typeof sp.label === 'string' ? sp.label.trim().slice(0, 24) : '';
        if (!coords || !label) continue;
        spots.push({
          coords,
          label,
          sublabel:
            typeof sp.sublabel === 'string' && sp.sublabel.trim()
              ? sp.sublabel.trim().slice(0, 32)
              : undefined,
          color: sanitizeHexColor(sp.color, '#D97706'),
        });
      }
    }

    const flows: AiStoryboardFlow[] = [];
    if (Array.isArray(s.flows)) {
      for (const rf of s.flows.slice(0, 5)) {
        if (!rf || typeof rf !== 'object') continue;
        const fl = rf as Record<string, unknown>;
        const from = sanitizeCoords(fl.from);
        const to = sanitizeCoords(fl.to);
        const label = typeof fl.label === 'string' ? fl.label.trim().slice(0, 24) : '';
        if (!from || !to) continue;
        const kindRaw = typeof fl.kind === 'string' ? fl.kind.trim() : 'influence';
        const kind = (ALLOWED_FLOW_KINDS.has(kindRaw)
          ? kindRaw
          : 'influence') as AiStoryboardFlow['kind'];
        flows.push({
          from,
          to,
          label: label || '传播路径',
          color: sanitizeHexColor(fl.color, '#10B981'),
          kind,
          bidirectional: Boolean(fl.bidirectional),
        });
      }
    }

    steps.push({
      title,
      caption: caption || title,
      year,
      center,
      zoom,
      spots,
      flows,
    });
  }

  if (steps.length === 0) return null;
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim().slice(0, 40)
      : 'AI 历史演播分镜';
  return { title, steps };
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

const STORYBOARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          caption: { type: 'STRING' },
          year: { type: 'INTEGER' },
          center: { type: 'ARRAY', items: { type: 'NUMBER' } },
          zoom: { type: 'NUMBER' },
          spots: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                coords: { type: 'ARRAY', items: { type: 'NUMBER' } },
                label: { type: 'STRING' },
                sublabel: { type: 'STRING' },
                color: { type: 'STRING' },
              },
              required: ['coords', 'label', 'color'],
            },
          },
          flows: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                from: { type: 'ARRAY', items: { type: 'NUMBER' } },
                to: { type: 'ARRAY', items: { type: 'NUMBER' } },
                label: { type: 'STRING' },
                color: { type: 'STRING' },
                kind: { type: 'STRING' },
                bidirectional: { type: 'BOOLEAN' },
              },
              required: ['from', 'to', 'label', 'color', 'kind'],
            },
          },
        },
        required: ['title', 'caption', 'year', 'center', 'zoom', 'spots', 'flows'],
      },
    },
  },
  required: ['title', 'steps'],
};

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
        '你是《世界通史时空图谱》的比较史学教授。请以中文输出精炼、深刻、结构化的双主体历史比较分析，同时编制一组 3 幕动态地图对比演播脚本（storyboard），严格遵守给定 JSON Schema。';

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
        `- storyboard: 生成 3 幕地图动画分镜：第 1 幕镜头定位对照组 A 核心地域（含 1-3 个热点 spots 与相关流向 flows）；第 2 幕镜头飞往对照组 B 核心地域；第 3 幕拉远视角（zoom 1.4-2.2）同时框住两地并用双向发光弧线（bidirectional: true）连接两者表现异同或跨文明呼应。坐标必须为真实 [经度, 纬度]，颜色使用鲜明 6 位 Hex（如 #D97706 / #10B981 / #3B82F6 / #E11D48 / #8B5CF6）。`,
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
      '2. `storyboard`（配合讲解在左侧地图实时播放的 3-4 幕动态地图分镜，务必精准贴合 `reply` 内容）：',
      '   - `title`: 简短演播标题（16字以内）。',
      '   - `steps`（3-4 幕，按时间/因果顺次推进）：',
      '     - `title`: 每幕短标题（10字以内）；`caption`: 1句话旁白字幕（35-65字），与地图当前动画呼应；',
      '     - `year`: 该幕对应的历史公元年份（公元前用负数，如 -221、1492、1570）；地图会自动渐变到该年帝国疆域；',
      '     - `center`: [经度, 纬度] 真实地理坐标，决定镜头聚焦中心；`zoom`: 1.4-4.8 合适视野（跨洲传播用 1.5-2.3，区域事件用 2.8-4.5）；',
      '     - `spots`（1-4 个关键地点脉冲锚点）：真实 `[lng, lat]`、`label`（8字以内）、可选 `sublabel`（12字以内）、6位Hex `color`；',
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
