import { authorizePasscodeOnly, jsonResponse, parseJsonBody, type PagesCtx } from '../_shared/gemini';

interface StudySyncRecord {
  version: 1;
  updatedAt: string;
  studyData: {
    masteredIds: string[];
    bookmarkedIds: string[];
    notes: Record<string, string>;
  };
}

const KV_KEY = 'atlas-study:v1';

export const onRequestGet = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizePasscodeOnly(context.request, context.env);
  if (!auth.ok) return auth.response;

  const kv = context.env.STUDY_KV;
  if (!kv) {
    return jsonResponse({
      configured: false,
      error: '尚未绑定 Cloudflare KV 命名空间 STUDY_KV',
    }, 503);
  }

  const raw = await kv.get(KV_KEY);
  if (!raw) {
    return jsonResponse({
      configured: true,
      updatedAt: null,
      studyData: null,
    });
  }

  try {
    const parsed = JSON.parse(raw) as StudySyncRecord;
    return jsonResponse({
      configured: true,
      updatedAt: parsed.updatedAt || null,
      studyData: parsed.studyData || null,
    });
  } catch {
    return jsonResponse({ configured: true, updatedAt: null, studyData: null });
  }
};

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizePasscodeOnly(context.request, context.env);
  if (!auth.ok) return auth.response;

  const kv = context.env.STUDY_KV;
  if (!kv) {
    return jsonResponse({
      configured: false,
      error: '尚未绑定 Cloudflare KV 命名空间 STUDY_KV',
    }, 503);
  }

  const body = await parseJsonBody<{
    masteredIds?: unknown;
    bookmarkedIds?: unknown;
    notes?: unknown;
  }>(context.request);

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: '请求格式无效' }, 400);
  }

  const masteredIds = Array.isArray(body.masteredIds)
    ? body.masteredIds.filter((x): x is string => typeof x === 'string').slice(0, 1000)
    : [];
  const bookmarkedIds = Array.isArray(body.bookmarkedIds)
    ? body.bookmarkedIds.filter((x): x is string => typeof x === 'string').slice(0, 1000)
    : [];
  const notes =
    body.notes && typeof body.notes === 'object'
      ? Object.fromEntries(
          Object.entries(body.notes)
            .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
            .slice(0, 500)
            .map(([k, v]) => [k, v.slice(0, 4000)]),
        )
      : {};

  const record: StudySyncRecord = {
    version: 1,
    updatedAt: new Date().toISOString(),
    studyData: { masteredIds, bookmarkedIds, notes },
  };

  await kv.put(KV_KEY, JSON.stringify(record));
  return jsonResponse({
    ok: true,
    configured: true,
    updatedAt: record.updatedAt,
    counts: {
      mastered: masteredIds.length,
      bookmarked: bookmarkedIds.length,
      notes: Object.keys(notes).length,
    },
  });
};
