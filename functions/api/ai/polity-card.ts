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

interface PolityCardRequest {
  zhName?: string;
  enName?: string;
  snapshotYear?: number;
  region?: string;
  modernCountryName?: string;
  ledgerSummary?: string;
}

interface PolityCardResult {
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

const POLITY_CARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tagline: { type: 'STRING' },
    peakPeriod: { type: 'STRING' },
    capital: { type: 'STRING' },
    geography: { type: 'STRING' },
    politics: { type: 'STRING' },
    economy: { type: 'STRING' },
    culture: { type: 'STRING' },
    riseAndFall: { type: 'STRING' },
    funFact: { type: 'STRING' },
    keyFigures: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'tagline',
    'peakPeriod',
    'capital',
    'geography',
    'politics',
    'economy',
    'culture',
    'riseAndFall',
    'funFact',
    'keyFigures',
  ],
};

function formatYearText(year: number): string {
  return year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
}

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizeAiRequest(context.request, context.env);
  if (!auth.ok) return auth.response;
  if (!checkRateLimit(context.request, 20)) {
    return jsonResponse({ code: 'rate_limited', error: '请求过于频繁，请稍等片刻再试' }, 429);
  }

  const body = await parseJsonBody<PolityCardRequest>(context.request);
  if (!body || (!body.zhName && !body.enName)) {
    return jsonResponse({ error: '缺少政权名称参数' }, 400);
  }

  const zhName = (body.zhName || body.enName || '').trim().slice(0, 80);
  const enName = (body.enName || body.zhName || '').trim().slice(0, 80);
  const snapshotYear = typeof body.snapshotYear === 'number' ? body.snapshotYear : 0;
  const region = (body.region || '全球').trim().slice(0, 60);
  const modernCountryName = (body.modernCountryName || '').trim().slice(0, 80);
  const ledgerSummary = (body.ledgerSummary || '').trim().slice(0, 500);

  const model = context.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
  const systemInstruction =
    '你是历史地理与世界通史专家，专门为《世界通史时空图谱》撰写博物馆级结构化中文政权研究档案。要求史实精准、分析透彻、拒绝空洞套话，严格按 JSON Schema 返回。';

  const prompt = [
    `请为以下历史政权或文明区域生成结构化精炼档案卡片：`,
    `- 政权中文名：${zhName}`,
    `- 英文原名：${enName}`,
    `- 当前定位截面年份：${formatYearText(snapshotYear)}`,
    `- 所属宏观地理区：${region}`,
    modernCountryName ? `- 对应今现代国家：${modernCountryName}` : '',
    ledgerSummary ? `- 地图切片历代政权演替线索：${ledgerSummary}` : '',
    `\n字段字数与内容规范：`,
    `- tagline: 25-40字一句定性，概括其在历史上的核心定位与独特性`,
    `- peakPeriod: 极盛起止年代（如“前 321 — 前 185 年”或“14-16 世纪”）`,
    `- capital: 核心都城或政治经济枢纽`,
    `- geography / politics / economy / culture: 每项 65-110 字，分别点透地缘命门、权力与制度构造、财政/商贸/生计基础、宗教语言与文明遗产`,
    `- riseAndFall: 75-120 字，讲清兴起动因与衰落/转型的制度性或外部冲击原因`,
    `- funFact: 45-80 字，一条常被忽略却能帮助记忆的有趣史实或制度细节`,
    `- keyFigures: 2-4位最代表性的历史人物中文名`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await callGeminiText(auth.apiKey, model, {
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.55,
      maxOutputTokens: 1600,
      responseMimeType: 'application/json',
      responseSchema: POLITY_CARD_SCHEMA,
    });

    const card = extractJson<PolityCardResult>(res.text);
    return jsonResponse({ card, usage: res.usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : '政权档案生成失败';
    return jsonResponse({ error: message }, 502);
  }
};
