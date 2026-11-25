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

interface QuizSourceItem {
  title: string;
  yearDisplay: string;
  summary: string;
  politics?: string;
  economy?: string;
  culture?: string;
}

interface QuizRequestBody {
  action?: 'generate' | 'grade';
  scopeLabel?: string;
  items?: QuizSourceItem[];
  prompt?: string;
  keyPoints?: string[];
  modelAnswer?: string;
  userAnswer?: string;
}

interface QuizPayload {
  quizTitle: string;
  mcqs: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    relatedTitle: string;
  }>;
  feynman: {
    prompt: string;
    keyPoints: string[];
    modelAnswer: string;
    relatedTitle: string;
  };
}

interface QuizGradeResult {
  score: number;
  praise: string;
  missingAngles: string[];
  refinedSynthesis: string;
}

const QUIZ_GEN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    quizTitle: { type: 'STRING' },
    mcqs: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          relatedTitle: { type: 'STRING' },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation', 'relatedTitle'],
      },
    },
    feynman: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING' },
        keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
        modelAnswer: { type: 'STRING' },
        relatedTitle: { type: 'STRING' },
      },
      required: ['prompt', 'keyPoints', 'modelAnswer', 'relatedTitle'],
    },
  },
  required: ['quizTitle', 'mcqs', 'feynman'],
};

const QUIZ_GRADE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    score: { type: 'INTEGER' },
    praise: { type: 'STRING' },
    missingAngles: { type: 'ARRAY', items: { type: 'STRING' } },
    refinedSynthesis: { type: 'STRING' },
  },
  required: ['score', 'praise', 'missingAngles', 'refinedSynthesis'],
};

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizeAiRequest(context.request, context.env);
  if (!auth.ok) return auth.response;
  if (!checkRateLimit(context.request, 20)) {
    return jsonResponse({ code: 'rate_limited', error: '操作过于频繁，请稍等片刻再试' }, 429);
  }

  const body = await parseJsonBody<QuizRequestBody>(context.request);
  if (!body) {
    return jsonResponse({ error: '请求体格式无效' }, 400);
  }

  const model = context.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;

  try {
    if (body.action === 'grade') {
      const prompt = (body.prompt || '').trim().slice(0, 600);
      const modelAnswer = (body.modelAnswer || '').trim().slice(0, 800);
      const userAnswer = (body.userAnswer || '').trim().slice(0, 1500);
      const keyPoints = Array.isArray(body.keyPoints)
        ? body.keyPoints.slice(0, 6).map((x) => String(x).slice(0, 150))
        : [];

      if (!prompt || !userAnswer) {
        return jsonResponse({ error: '请先写下您的因果分析回答后再提交点评' }, 400);
      }

      const systemInstruction =
        '你是历史学科的费曼复习导师。请根据学生的口语化复述给出温和、精准、启发式的评分与指点（不苛求背诵年份，重在评估因果、政治、经济或地理逻辑是否到位）。';

      const userPrompt = [
        `自测题目：${prompt}`,
        keyPoints.length > 0 ? `参考思考要点：${keyPoints.join('；')}` : '',
        modelAnswer ? `参考精炼答案：${modelAnswer}` : '',
        `用户的回答：${userAnswer}`,
        `\n请给出 0-100 分（整数），并按 JSON Schema 输出肯定亮点、可补充的维度以及一段 80-120 字的导师精炼总结。`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await callGeminiText(auth.apiKey, model, {
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        temperature: 0.45,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: QUIZ_GRADE_SCHEMA,
      });

      const grade = extractJson<QuizGradeResult>(res.text);
      return jsonResponse({ grade, usage: res.usage });
    }

    const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
    const scopeLabel = (body.scopeLabel || '世界通史精选').trim().slice(0, 80);
    if (items.length === 0) {
      return jsonResponse({ error: '暂无可用于出题的历史卡片内容' }, 400);
    }

    const materials = items
      .map((item, idx) =>
        [
          `${idx + 1}. 《${item.title}》（${item.yearDisplay}）`,
          `概要：${item.summary.slice(0, 140)}`,
          item.politics ? `政治：${item.politics.slice(0, 110)}` : '',
          item.economy ? `经济：${item.economy.slice(0, 110)}` : '',
          item.culture ? `文化：${item.culture.slice(0, 100)}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      )
      .join('\n');

    const systemInstruction =
      '你是世界通史命题导师。绝对禁止考死记硬背具体年份或无关人名；必须出“因果机制、政治制度、经济贸易逻辑或地缘演变”的深度理解题！严格返回 JSON。';

    const userPrompt = [
      `出题范围：${scopeLabel}`,
      `参考素材：\n${materials}`,
      `\n要求：`,
      `1. 出 2 道高水准因果逻辑单选题（mcqs 数组长度为 2），每题必须恰有 4 个中文选项（options 长度=4），correctIndex 为 0-3 整数，explanation 用 50-90 字讲透底层逻辑。`,
      `2. 出 1 道“费曼式开放思考题”（feynman 对象），让学习者尝试用大白话向朋友讲清某个关键机制/历史转折，提供 3 条要点（keyPoints）和一段 90-140 字示范精讲（modelAnswer）。`,
    ].join('\n');

    const res = await callGeminiText(auth.apiKey, model, {
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      temperature: 0.6,
      maxOutputTokens: 1800,
      responseMimeType: 'application/json',
      responseSchema: QUIZ_GEN_SCHEMA,
    });

    const quiz = extractJson<QuizPayload>(res.text);
    return jsonResponse({ quiz, usage: res.usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : '因果自测生成失败';
    return jsonResponse({ error: message }, 502);
  }
};
