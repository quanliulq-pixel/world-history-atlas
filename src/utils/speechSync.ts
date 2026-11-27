import type { AiComparisonResult, AiStoryboard, AiStoryboardStep } from './aiClient';

export interface InlineRun {
  text: string;
  bold: boolean;
}

export interface SentenceSpan {
  sentenceIdx: number;
  runs: InlineRun[];
  speechText: string;
  sceneIndex?: number;
}

export type MarkdownBlockKind = 'spacer' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'paragraph';

export interface MarkdownSpeechBlock {
  blockId: string;
  lineIndex: number;
  kind: MarkdownBlockKind;
  listPrefix?: string;
  sentences: SentenceSpan[];
  plainText: string;
  primarySceneIndex?: number;
}

export interface SpeechChunk {
  chunkIndex: number;
  blockId: string;
  sentenceIndices: number[];
  sentenceWeights: number[];
  speechText: string;
  sceneIndex?: number;
}

export interface MarkdownSpeechPlan {
  blocks: MarkdownSpeechBlock[];
  chunks: SpeechChunk[];
  sceneAnchorBlockIds: Record<number, string>;
}

export type CompareBlockId =
  | 'cmp-thesis'
  | 'cmp-geopolitics'
  | 'cmp-politics'
  | 'cmp-economy'
  | 'cmp-culture'
  | 'cmp-modern';

export interface CompareSpeechPlan {
  blocks: Record<CompareBlockId, SentenceSpan[]>;
  blockScenes: Partial<Record<CompareBlockId, number>>;
  chunks: SpeechChunk[];
  sceneAnchorBlockIds: Record<number, CompareBlockId>;
}

const STOP_BIGRAMS = new Set([
  '历史',
  '世界',
  '帝国',
  '文明',
  '人类',
  '时期',
  '时代',
  '主要',
  '形成',
  '影响',
  '发展',
  '全球',
  '社会',
  '系统',
  '过程',
  '结构',
  '背景',
  '方面',
  '关系',
  '成为',
  '以及',
  '通过',
  '导致',
  '引发',
  '推动',
  '核心',
  '重要',
  '变化',
  '机制',
  '作用',
  '意义',
  '结果',
  '结局',
  '东西',
  '南北',
  '不同',
  '因此',
  '同时',
  '从而',
  '不仅',
  '而且',
  '可以',
  '进行',
  '对比',
  '比较',
  '视角',
  '维度',
  '问题',
  '分析',
]);

export function cleanSpeechText(rawText: string): string {
  return rawText
    .replace(/[*#`>_~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForMatch(text: string): string {
  return cleanSpeechText(text)
    .toLowerCase()
    .replace(/[\s，。！？、；：“”‘’"'()（）【】[\]《》〈〉·—\-–—:：/\\|.,!?~`@#$%^&*+=]+/g, '');
}

export function tokenizeInlineBold(text: string): InlineRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const runs: InlineRun[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      runs.push({ text: part.slice(2, -2), bold: true });
    } else {
      runs.push({ text: part, bold: false });
    }
  }
  return runs;
}

const SENTENCE_END_RE = /[。！？；][”’」』）)]*/g;

export function splitRunsIntoSentences(runs: InlineRun[], startIdx: number): SentenceSpan[] {
  if (runs.length === 0) return [];

  const spans: SentenceSpan[] = [];
  let currentRuns: InlineRun[] = [];

  const pushCurrent = () => {
    const joined = currentRuns.map((r) => r.text).join('');
    const speechText = cleanSpeechText(joined);
    if (!speechText) {
      if (spans.length > 0 && joined.trim()) {
        const prev = spans[spans.length - 1];
        prev.runs = [...prev.runs, ...currentRuns];
      }
      currentRuns = [];
      return;
    }
    spans.push({
      sentenceIdx: startIdx + spans.length,
      runs: currentRuns,
      speechText,
    });
    currentRuns = [];
  };

  for (const run of runs) {
    let cursor = 0;
    SENTENCE_END_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SENTENCE_END_RE.exec(run.text)) !== null) {
      const end = match.index + match[0].length;
      const slice = run.text.slice(cursor, end);
      if (slice) {
        currentRuns.push({ text: slice, bold: run.bold });
      }
      pushCurrent();
      cursor = end;
    }
    if (cursor < run.text.length) {
      currentRuns.push({ text: run.text.slice(cursor), bold: run.bold });
    }
  }

  if (currentRuns.length > 0) {
    pushCurrent();
  }

  return spans;
}

function extractMatchTokens(rawText: string): Set<string> {
  const tokens = new Set<string>();
  const cleaned = cleanSpeechText(rawText).toLowerCase();

  const cjkSegments = cleaned.match(/[\u4e00-\u9fff]+/g) || [];
  for (const seg of cjkSegments) {
    if (seg.length === 1) continue;
    for (let i = 0; i <= seg.length - 2; i++) {
      const bg = seg.slice(i, i + 2);
      if (!STOP_BIGRAMS.has(bg)) {
        tokens.add(bg);
      }
    }
  }

  const latinWords = cleaned.match(/[a-z0-9]{2,}/g) || [];
  for (const w of latinWords) {
    tokens.add(w);
  }

  return tokens;
}

export function scoreTextAgainstStep(rawText: string, step: AiStoryboardStep): number {
  const normText = normalizeForMatch(rawText);
  if (!normText) return 0;

  let score = 0;

  if (step.matchSnippet) {
    const normSnippet = normalizeForMatch(step.matchSnippet);
    if (normSnippet.length >= 3 && normText.includes(normSnippet)) {
      score += 120;
    }
  }

  const textTokens = extractMatchTokens(rawText);
  if (textTokens.size === 0) return score;

  const titleTokens = extractMatchTokens(step.title || '');
  for (const tok of titleTokens) {
    if (textTokens.has(tok)) score += 6;
  }

  const geoRaw = [
    ...(step.flows || []).map((f) => f.label || ''),
    ...(step.spots || []).map((sp) => `${sp.label || ''} ${sp.sublabel || ''}`),
  ].join(' ');
  const geoTokens = extractMatchTokens(geoRaw);
  for (const tok of geoTokens) {
    if (textTokens.has(tok)) score += 5;
  }

  const captionTokens = extractMatchTokens(step.caption || '');
  for (const tok of captionTokens) {
    if (textTokens.has(tok)) score += 2.5;
  }

  return score;
}

function pickBestStep(
  rawText: string,
  steps: AiStoryboardStep[],
  prevScene: number,
  fallbackPosScene: number,
  minSemanticScore = 6,
): { sceneIndex: number; score: number } {
  if (steps.length === 0) return { sceneIndex: 0, score: 0 };

  let bestIdx = -1;
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;

  for (let s = 0; s < steps.length; s++) {
    const sc = scoreTextAgainstStep(rawText, steps[s]);
    if (sc > bestScore) {
      secondBestScore = bestScore;
      bestScore = sc;
      bestIdx = s;
    } else if (sc > secondBestScore) {
      secondBestScore = sc;
    }
  }

  // Exact matchSnippet or clear semantic winner can lock accurately even out of sequence
  if (bestIdx !== -1 && (bestScore >= 100 || (bestScore >= 10 && bestScore - secondBestScore >= 2.5))) {
    return { sceneIndex: bestIdx, score: bestScore };
  }

  if (bestIdx !== -1 && bestScore >= minSemanticScore) {
    // Apply gentle continuity prior for close ties
    let adjBestIdx = bestIdx;
    let adjBestScore = -Infinity;
    for (let s = 0; s < steps.length; s++) {
      let sc = scoreTextAgainstStep(rawText, steps[s]);
      if (s === prevScene || s === prevScene + 1) sc += 3;
      else if (s > prevScene) sc += 1;
      if (sc > adjBestScore) {
        adjBestScore = sc;
        adjBestIdx = s;
      }
    }
    return { sceneIndex: adjBestIdx, score: bestScore };
  }

  return { sceneIndex: fallbackPosScene, score: bestScore };
}

function packSentencesIntoChunks(
  items: Array<{ blockId: string; sentences: SentenceSpan[]; speechPrefix?: string }>,
  firstMax = 80,
  nextMax = 145,
  softMaxTotal = 960,
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  let totalChars = 0;

  for (const item of items) {
    if (item.sentences.length === 0) continue;
    let bufSentences: SentenceSpan[] = [];
    let bufScene: number | undefined = item.sentences[0].sceneIndex;
    let bufLen = 0;
    let appliedPrefix = false;

    const flush = () => {
      if (bufSentences.length === 0) return;
      const parts = bufSentences.map((s, idx) => {
        if (idx === 0 && !appliedPrefix && item.speechPrefix) {
          appliedPrefix = true;
          return `${item.speechPrefix}${s.speechText}`;
        }
        return s.speechText;
      });
      const speechText = parts.join(' ').trim();
      if (speechText) {
        chunks.push({
          chunkIndex: chunks.length,
          blockId: item.blockId,
          sentenceIndices: bufSentences.map((s) => s.sentenceIdx),
          sentenceWeights: bufSentences.map((s, idx) =>
            Math.max(1, (idx === 0 && item.speechPrefix ? item.speechPrefix.length : 0) + s.speechText.length),
          ),
          speechText,
          sceneIndex: bufScene,
        });
        totalChars += speechText.length;
      }
      bufSentences = [];
      bufLen = 0;
    };

    for (const s of item.sentences) {
      if (totalChars >= softMaxTotal && chunks.length > 0) break;
      const limit = chunks.length === 0 && bufSentences.length === 0 ? firstMax : nextMax;
      const addedLen =
        s.speechText.length + (!appliedPrefix && bufSentences.length === 0 && item.speechPrefix ? item.speechPrefix.length : 0);

      if (bufSentences.length === 0) {
        bufSentences.push(s);
        bufScene = s.sceneIndex;
        bufLen = addedLen;
      } else if (s.sceneIndex === bufScene && bufLen + s.speechText.length <= limit) {
        bufSentences.push(s);
        bufLen += s.speechText.length;
      } else {
        flush();
        if (totalChars >= softMaxTotal && chunks.length > 0) break;
        bufSentences.push(s);
        bufScene = s.sceneIndex;
        bufLen = s.speechText.length;
      }
    }
    flush();
    if (totalChars >= softMaxTotal && chunks.length > 0) break;
  }

  return chunks;
}

export function buildMarkdownSpeechPlan(
  text: string,
  storyboard?: AiStoryboard | null,
): MarkdownSpeechPlan {
  const lines = text.split(/\r?\n/);
  const blocks: MarkdownSpeechBlock[] = [];
  let globalSentenceIdx = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim();
    const blockId = `line-${idx}`;
    if (!trimmed) {
      blocks.push({
        blockId,
        lineIndex: idx,
        kind: 'spacer',
        sentences: [],
        plainText: '',
      });
      continue;
    }

    let kind: MarkdownBlockKind = 'paragraph';
    let listPrefix: string | undefined;
    let body = trimmed;

    if (trimmed.startsWith('### ')) {
      kind = 'h3';
      body = trimmed.slice(4);
    } else if (trimmed.startsWith('## ')) {
      kind = 'h2';
      body = trimmed.slice(3);
    } else if (/^[-*•]\s+/.test(trimmed)) {
      kind = 'bullet';
      body = trimmed.replace(/^[-*•]\s+/, '');
    } else if (/^\d+\.\s+/.test(trimmed)) {
      kind = 'numbered';
      const m = trimmed.match(/^(\d+\.)\s+(.*)$/);
      listPrefix = m?.[1];
      body = m?.[2] || trimmed;
    }

    const runs = tokenizeInlineBold(body);
    const sentences = splitRunsIntoSentences(runs, globalSentenceIdx);
    globalSentenceIdx += sentences.length;
    const plainText = cleanSpeechText(body);

    blocks.push({
      blockId,
      lineIndex: idx,
      kind,
      listPrefix,
      sentences,
      plainText,
    });
  }

  const steps = storyboard?.steps || [];
  const spokenBlocks = blocks.filter((b) => b.sentences.length > 0);
  const sceneAnchorBlockIds: Record<number, string> = {};

  if (steps.length > 0 && spokenBlocks.length > 0) {
    let prevScene = 0;
    const totalSpoken = spokenBlocks.length;

    for (let bi = 0; bi < totalSpoken; bi++) {
      const blk = spokenBlocks[bi];
      const posScene =
        bi === 0 ? 0 : Math.min(steps.length - 1, Math.floor((bi / totalSpoken) * steps.length));
      const blockMatch = pickBestStep(blk.plainText, steps, prevScene, posScene, 6);

      // Evaluate sentence-level matches to catch multi-topic paragraphs or matchSnippets
      const sentenceMatches = blk.sentences.map((s) =>
        pickBestStep(s.speechText, steps, blockMatch.sceneIndex, blockMatch.sceneIndex, 10),
      );
      const distinctStrongScenes = new Set(
        sentenceMatches.filter((m) => m.score >= 10).map((m) => m.sceneIndex),
      );

      for (let si = 0; si < blk.sentences.length; si++) {
        const sm = sentenceMatches[si];
        // Lead/heading-style single sentences or low-scoring sentences stay with their parent block
        if (distinctStrongScenes.size >= 2 && sm.score >= 10) {
          blk.sentences[si].sceneIndex = sm.sceneIndex;
        } else if (sm.score >= 100) {
          blk.sentences[si].sceneIndex = sm.sceneIndex;
        } else {
          blk.sentences[si].sceneIndex = blockMatch.sceneIndex;
        }
      }

      // Compute primarySceneIndex for block (mode / first sentence scene)
      const counts = new Map<number, number>();
      for (const s of blk.sentences) {
        if (s.sceneIndex !== undefined) {
          counts.set(s.sceneIndex, (counts.get(s.sceneIndex) || 0) + 1);
        }
      }
      let primary = blockMatch.sceneIndex;
      let maxCount = -1;
      for (const [scIdx, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          primary = scIdx;
        }
      }
      blk.primarySceneIndex = primary;
      prevScene = blk.sentences[blk.sentences.length - 1]?.sceneIndex ?? primary;
    }

    // Build anchor map choosing the best-scoring block for each storyboard scene
    for (let s = 0; s < steps.length; s++) {
      const candidates = spokenBlocks.filter(
        (b) => b.primarySceneIndex === s || b.sentences.some((sent) => sent.sceneIndex === s),
      );
      if (candidates.length > 0) {
        let bestBlock = candidates[0];
        let bestScore = -1;
        for (const cand of candidates) {
          const sc =
            scoreTextAgainstStep(cand.plainText, steps[s]) +
            (cand.primarySceneIndex === s ? 5 : 0);
          if (sc > bestScore) {
            bestScore = sc;
            bestBlock = cand;
          }
        }
        sceneAnchorBlockIds[s] = bestBlock.blockId;
      }
    }
  }

  const chunks = packSentencesIntoChunks(
    spokenBlocks.map((b) => ({ blockId: b.blockId, sentences: b.sentences })),
    80,
    145,
    960,
  );

  return {
    blocks,
    chunks,
    sceneAnchorBlockIds,
  };
}

export function buildCompareSpeechPlan(
  result: AiComparisonResult,
  storyboard?: AiStoryboard | null,
): CompareSpeechPlan {
  const orderedSpecs: Array<{
    blockId: CompareBlockId;
    text: string;
    speechPrefix: string;
  }> = [
    { blockId: 'cmp-thesis', text: result.thesis, speechPrefix: `${result.title}。` },
    { blockId: 'cmp-geopolitics', text: result.dimensions.geopolitics, speechPrefix: '地缘条件对比：' },
    { blockId: 'cmp-politics', text: result.dimensions.politics, speechPrefix: '政制与权力对比：' },
    { blockId: 'cmp-economy', text: result.dimensions.economy, speechPrefix: '经济与财税对比：' },
    { blockId: 'cmp-culture', text: result.dimensions.culture, speechPrefix: '文化与观念对比：' },
    { blockId: 'cmp-modern', text: result.modernEcho, speechPrefix: '当代回响：' },
  ];

  const blocks = {} as Record<CompareBlockId, SentenceSpan[]>;
  const blockScenes: Partial<Record<CompareBlockId, number>> = {};
  const sceneAnchorBlockIds: Record<number, CompareBlockId> = {};
  const steps = storyboard?.steps || [];

  let sentenceCursor = 0;
  let prevScene = 0;

  const fallbackMap4 = [0, 0, 1, 2, 3, 3];
  const fallbackMap3 = [0, 0, 1, 1, 2, 2];

  for (let i = 0; i < orderedSpecs.length; i++) {
    const spec = orderedSpecs[i];
    const spans = splitRunsIntoSentences(tokenizeInlineBold(spec.text), sentenceCursor);
    sentenceCursor += spans.length;

    let assignedScene: number | undefined;
    if (steps.length > 0) {
      const posScene =
        steps.length === 4
          ? fallbackMap4[i]
          : steps.length === 3
            ? fallbackMap3[i]
            : Math.min(steps.length - 1, Math.floor((i / orderedSpecs.length) * steps.length));
      const matched = pickBestStep(`${spec.speechPrefix}${spec.text}`, steps, prevScene, posScene, 8);
      assignedScene = matched.sceneIndex;
      blockScenes[spec.blockId] = assignedScene;
      prevScene = assignedScene;
      if (sceneAnchorBlockIds[assignedScene] === undefined) {
        sceneAnchorBlockIds[assignedScene] = spec.blockId;
      }
      for (const sp of spans) {
        sp.sceneIndex = assignedScene;
      }
    }

    blocks[spec.blockId] = spans;
  }

  const chunks = packSentencesIntoChunks(
    orderedSpecs.map((spec) => ({
      blockId: spec.blockId,
      sentences: blocks[spec.blockId],
      speechPrefix: spec.speechPrefix,
    })),
    85,
    155,
    1100,
  );

  return {
    blocks,
    blockScenes,
    chunks,
    sceneAnchorBlockIds,
  };
}

export function buildDocumentarySpeechChunks(
  beats: Array<{ title: string; narration: string }>,
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  const maxSegLen = 150;
  for (let idx = 0; idx < beats.length; idx++) {
    const speechText = cleanSpeechText(beats[idx].narration);
    if (!speechText) continue;
    if (speechText.length <= maxSegLen) {
      chunks.push({
        chunkIndex: chunks.length,
        blockId: `beat-${idx}`,
        sentenceIndices: [idx],
        sentenceWeights: [Math.max(1, speechText.length)],
        speechText,
        sceneIndex: idx,
      });
      continue;
    }

    const rawSentences = speechText
      .split(/(?<=[。！？；])/)
      .map((s) => s.trim())
      .filter(Boolean);
    const pieces: string[] = [];
    for (const s of rawSentences.length > 0 ? rawSentences : [speechText]) {
      if (s.length <= maxSegLen) {
        pieces.push(s);
      } else {
        const subParts = s
          .split(/(?<=[，、：])/)
          .map((p) => p.trim())
          .filter(Boolean);
        for (const p of subParts.length > 0 ? subParts : [s]) {
          if (p.length <= maxSegLen) {
            pieces.push(p);
          } else {
            for (let i = 0; i < p.length; i += maxSegLen) {
              pieces.push(p.slice(i, i + maxSegLen));
            }
          }
        }
      }
    }

    let buf = '';
    for (const p of pieces) {
      if (!buf) {
        buf = p;
      } else if (buf.length + p.length <= maxSegLen) {
        buf += p;
      } else {
        chunks.push({
          chunkIndex: chunks.length,
          blockId: `beat-${idx}`,
          sentenceIndices: [idx],
          sentenceWeights: [Math.max(1, buf.length)],
          speechText: buf,
          sceneIndex: idx,
        });
        buf = p;
      }
    }
    if (buf) {
      chunks.push({
        chunkIndex: chunks.length,
        blockId: `beat-${idx}`,
        sentenceIndices: [idx],
        sentenceWeights: [Math.max(1, buf.length)],
        speechText: buf,
        sceneIndex: idx,
      });
    }
  }
  return chunks;
}
