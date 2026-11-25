import {
  authorizeAiRequest,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TTS_MODEL,
  jsonResponse,
  type PagesCtx,
} from '../../_shared/gemini';

export const onRequestGet = async (context: PagesCtx): Promise<Response> => {
  const { env } = context;
  const configured = Boolean(env.GEMINI_API_KEY?.trim());
  const passcodeRequired = Boolean(env.AI_ACCESS_PASSCODE?.trim());
  const allowPublic = env.AI_ALLOW_PUBLIC === 'true';

  return jsonResponse({
    configured,
    passcodeRequired,
    allowPublic,
    textModel: env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    ttsModel: env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL,
  });
};

export const onRequestPost = async (context: PagesCtx): Promise<Response> => {
  const auth = authorizeAiRequest(context.request, context.env);
  if (!auth.ok) return auth.response;

  return jsonResponse({
    ok: true,
    configured: true,
    textModel: context.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    ttsModel: context.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL,
  });
};
