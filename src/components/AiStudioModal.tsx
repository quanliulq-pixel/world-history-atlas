import {
  AlertCircle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Coins,
  Film,
  GitCompareArrows,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  Mountain,
  RefreshCw,
  ScrollText,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Unlock,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_PROFILES } from '../data/countries';
import { ALL_EVENTS } from '../data/events';
import { ALL_FIGURES } from '../data/figures';
import type { ThemeMode } from '../types/history';
import {
  AI_VOICE_OPTIONS,
  AiClientError,
  askAiTutor,
  compareWithAi,
  fetchAiStatus,
  generateQuizWithAi,
  getAiUsage,
  getStoredPasscode,
  getVoicePrefs,
  gradeFeynmanWithAi,
  listCachedComparisons,
  playSpeechChunks,
  saveVoicePrefs,
  setStoredPasscode,
  stopActiveNarration,
  subscribeNarrationStop,
  verifyAiPasscode,
  type AiChatMessage,
  type AiComparisonResult,
  type AiQuizGrade,
  type AiQuizPayload,
  type AiQuizSourceItem,
  type AiStatus,
  type AiStoryboard,
  type AiTutorContext,
  type AiUsageSnapshot,
  type AiVoiceEngine,
  type AiVoiceName,
  type AiVoicePrefs,
} from '../utils/aiClient';
import {
  buildCompareSpeechPlan,
  buildMarkdownSpeechPlan,
  type CompareBlockId,
  type SentenceSpan,
} from '../utils/speechSync';
import { formatYear } from '../utils/timeline';

export type AiStudioTab = 'tutor' | 'compare' | 'quiz';

export interface AiStudioIntent {
  tab: AiStudioTab;
  prefillQuestion?: string;
  autoSend?: boolean;
  compareSubjectA?: string;
  compareSubjectB?: string;
  quizScope?: 'context' | 'era' | 'mastered';
  nonce: number;
}

interface AiStudioModalProps {
  open: boolean;
  theme: ThemeMode;
  context: AiTutorContext;
  masteredIds: Set<string>;
  eraId: string;
  intent: AiStudioIntent | null;
  hasActiveStoryboard?: boolean;
  activeStoryboard?: AiStoryboard | null;
  activeStoryboardStepIdx?: number;
  onPlayStoryboard?: (storyboard: AiStoryboard) => void;
  onSyncStoryboardStep?: (storyboard: AiStoryboard, stepIndex: number, voiceSynced: boolean) => void;
  onVoiceSyncEnd?: () => void;
  onUnlockChange?: (unlocked: boolean) => void;
  onClose: () => void;
}

const COMPARE_PRESETS = [
  { a: '秦帝国郡县官僚制', b: '罗马帝国元首与行省制', angle: '帝国大一统治理与财政汲取' },
  { a: '春秋战国百家争鸣', b: '古希腊城邦哲学与民主', angle: '轴心时代分立格局与思想爆发' },
  { a: '宋代交子与商业革命', b: '威尼斯与佛罗伦萨银行信用', angle: '近代以前的东西方金融创新' },
  { a: '明代一条鞭法与白银化', b: '西班牙美洲银矿殖民帝国', angle: '16 世纪全球白银贸易双向塑造' },
  { a: '英国工业革命', b: '清朝康乾盛世农耕顶峰', angle: '大分流背后的能源、市场与制度约束' },
];

function EqualizerBars({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-2.5 ${className}`} aria-hidden="true">
      <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
      <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
      <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
    </span>
  );
}

function renderInlineRuns(runs: SentenceSpan['runs']): React.ReactNode[] {
  return runs.map((r, i) =>
    r.bold ? (
      <strong key={i} className="font-bold">
        {r.text}
      </strong>
    ) : (
      <Fragment key={i}>{r.text}</Fragment>
    ),
  );
}

function SentenceList({
  sentences,
  activeSentenceIdx,
  theme,
}: {
  sentences: SentenceSpan[];
  activeSentenceIdx: number | null;
  theme: ThemeMode;
}) {
  const isDark = theme === 'obsidian';
  return (
    <>
      {sentences.map((s) => {
        const isActive = activeSentenceIdx !== null && s.sentenceIdx === activeSentenceIdx;
        if (isActive) {
          return (
            <mark
              key={s.sentenceIdx}
              className="rounded-sm px-0.5 py-[1px] transition-colors duration-150"
              style={{
                backgroundColor: isDark ? 'rgba(224, 166, 75, 0.28)' : 'rgba(180, 116, 23, 0.24)',
                color: 'inherit',
                boxShadow: isDark
                  ? 'inset 0 -1.5px 0 rgba(243, 193, 110, 0.7)'
                  : 'inset 0 -1.5px 0 rgba(140, 45, 45, 0.55)',
              }}
            >
              {renderInlineRuns(s.runs)}
            </mark>
          );
        }
        return <Fragment key={s.sentenceIdx}>{renderInlineRuns(s.runs)}</Fragment>;
      })}
    </>
  );
}

function hasTextSelection(): boolean {
  return Boolean(typeof window !== 'undefined' && window.getSelection()?.toString().trim());
}

interface FormattedMarkdownProps {
  text: string;
  storyboard?: AiStoryboard | null;
  isActiveStoryboard?: boolean;
  activeStoryboardStepIdx?: number;
  speechBlockId?: string | null;
  speechSentenceIdx?: number | null;
  speechLoading?: boolean;
  theme: ThemeMode;
  onJumpToScene?: (stepIdx: number) => void;
  onSpeakFromBlock?: (blockId: string) => void;
  onStopSpeech?: () => void;
}

function FormattedMarkdown({
  text,
  storyboard,
  isActiveStoryboard = false,
  activeStoryboardStepIdx = 0,
  speechBlockId = null,
  speechSentenceIdx = null,
  speechLoading = false,
  theme,
  onJumpToScene,
  onSpeakFromBlock,
  onStopSpeech,
}: FormattedMarkdownProps) {
  const plan = useMemo(() => buildMarkdownSpeechPlan(text, storyboard), [text, storyboard]);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!speechBlockId) return;
    const el = blockRefs.current[speechBlockId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [speechBlockId]);

  const isDark = theme === 'obsidian';
  const anchorScenesByBlock = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const [scStr, bId] of Object.entries(plan.sceneAnchorBlockIds)) {
      const sc = Number(scStr);
      const list = map.get(bId) || [];
      list.push(sc);
      map.set(bId, list);
    }
    return map;
  }, [plan.sceneAnchorBlockIds]);

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {plan.blocks.map((block) => {
        if (block.kind === 'spacer') {
          return <div key={block.blockId} className="h-1" />;
        }

        const isSpokenBlock = speechBlockId === block.blockId;
        const canClickSpeak = !isSpokenBlock && Boolean(onSpeakFromBlock) && block.sentences.length > 0;
        const activeSentence =
          isSpokenBlock && speechSentenceIdx !== null
            ? block.sentences.find((s) => s.sentenceIdx === speechSentenceIdx)
            : undefined;
        const effectiveSceneIdx =
          activeSentence?.sceneIndex ?? block.primarySceneIndex;
        const activeStep =
          effectiveSceneIdx !== undefined && storyboard?.steps[effectiveSceneIdx]
            ? storyboard.steps[effectiveSceneIdx]
            : null;

        const isMapSyncedBlock =
          !speechBlockId &&
          isActiveStoryboard &&
          block.primarySceneIndex !== undefined &&
          block.primarySceneIndex === activeStoryboardStepIdx;

        const anchorScenes = anchorScenesByBlock.get(block.blockId) || [];

        const contentNode = (
          <SentenceList
            sentences={block.sentences}
            activeSentenceIdx={isSpokenBlock ? speechSentenceIdx : null}
            theme={theme}
          />
        );

        let bodyEl: React.ReactNode;
        if (block.kind === 'h3') {
          bodyEl = <div className="font-bold text-[12px] pt-0.5">{contentNode}</div>;
        } else if (block.kind === 'h2') {
          bodyEl = <div className="font-bold text-[13px] pt-0.5">{contentNode}</div>;
        } else if (block.kind === 'bullet') {
          bodyEl = (
            <div className="flex items-start gap-1.5 pl-0.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: isSpokenBlock ? 'var(--accent-primary)' : 'currentColor',
                  opacity: isSpokenBlock ? 1 : 0.55,
                }}
              />
              <span>{contentNode}</span>
            </div>
          );
        } else if (block.kind === 'numbered') {
          bodyEl = (
            <div className="flex items-start gap-1.5 pl-0.5">
              <span className="font-semibold shrink-0">{block.listPrefix}</span>
              <span>{contentNode}</span>
            </div>
          );
        } else {
          bodyEl = <p>{contentNode}</p>;
        }

        const showTopPill = isSpokenBlock || isMapSyncedBlock;

        return (
          <div
            key={block.blockId}
            ref={(el) => {
              blockRefs.current[block.blockId] = el;
            }}
            onClick={() => {
              if (!canClickSpeak || hasTextSelection()) return;
              onSpeakFromBlock?.(block.blockId);
            }}
            title={canClickSpeak ? '点击从此段开始朗读并同步左侧地图' : undefined}
            className={`group/block relative transition-all duration-200 ${
              showTopPill
                ? 'rounded-xl px-2.5 py-1.5 -mx-1.5'
                : canClickSpeak
                  ? `rounded-xl px-2 py-1 -mx-2 cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.035]'
                    }`
                  : 'rounded-lg'
            }`}
            style={
              isSpokenBlock
                ? {
                    backgroundColor: isDark
                      ? 'rgba(224, 99, 90, 0.14)'
                      : 'rgba(140, 45, 45, 0.08)',
                    borderLeft: '3px solid var(--accent-primary)',
                  }
                : isMapSyncedBlock
                  ? {
                      backgroundColor: isDark
                        ? 'rgba(224, 166, 75, 0.10)'
                        : 'rgba(180, 116, 23, 0.08)',
                      borderLeft: '2.5px solid var(--accent-gold)',
                    }
                  : undefined
            }
          >
            {isSpokenBlock && (
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span
                  className="inline-flex items-center gap-1 font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {speechLoading ? (
                    <>
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      <span>准备朗读...</span>
                    </>
                  ) : (
                    <>
                      <EqualizerBars />
                      <span>正在朗读</span>
                    </>
                  )}
                </span>
                {activeStep && effectiveSceneIdx !== undefined && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToScene?.(effectiveSceneIdx);
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold cursor-pointer hover:opacity-85"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(224, 166, 75, 0.20)'
                        : 'rgba(180, 116, 23, 0.16)',
                      color: isDark ? '#F3C16E' : '#8A5208',
                    }}
                  >
                    <Film className="h-2.5 w-2.5" />
                    <span>
                      地图同步 · 第 {effectiveSceneIdx + 1} 幕 · {activeStep.title}
                    </span>
                  </button>
                )}
                {onStopSpeech && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopSpeech();
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold hover:opacity-85 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                    title="停止朗读"
                  >
                    <Square className="h-2 w-2" />
                    <span>停止</span>
                  </button>
                )}
              </div>
            )}

            {isMapSyncedBlock && activeStep && effectiveSceneIdx !== undefined && (
              <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(224, 166, 75, 0.20)'
                      : 'rgba(180, 116, 23, 0.16)',
                    color: isDark ? '#F3C16E' : '#8A5208',
                  }}
                >
                  <Film className="h-2.5 w-2.5" />
                  <span>
                    地图正演播 · 第 {effectiveSceneIdx + 1} 幕 · {activeStep.title}
                  </span>
                </span>
                {canClickSpeak && (
                  <span
                    className="opacity-0 group-hover/block:opacity-100 transition-opacity inline-flex items-center gap-1 text-[9.5px] font-medium"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Volume2 className="h-2.5 w-2.5" />
                    <span>从此处朗读</span>
                  </span>
                )}
              </div>
            )}

            {bodyEl}

            {!showTopPill && ((anchorScenes.length > 0 && storyboard && onJumpToScene) || canClickSpeak) && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                <div className="flex flex-wrap items-center gap-1">
                  {storyboard &&
                    onJumpToScene &&
                    anchorScenes.map((scIdx) => {
                      const st = storyboard.steps[scIdx];
                      if (!st) return null;
                      return (
                        <button
                          key={scIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToScene(scIdx);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium hover:opacity-85 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: isDark ? '#E5A94C' : '#9B5E0B',
                          }}
                          title="点击将左侧地图切换到这一幕"
                        >
                          <Film className="h-2.5 w-2.5" />
                          <span>
                            第 {scIdx + 1} 幕 · {st.title}
                          </span>
                        </button>
                      );
                    })}
                </div>
                {canClickSpeak && (
                  <span
                    className="opacity-0 group-hover/block:opacity-100 transition-opacity inline-flex items-center gap-1 text-[9.5px] font-medium"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Volume2 className="h-2.5 w-2.5" />
                    <span>从此处朗读</span>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AiStudioModal({
  open,
  theme,
  context,
  masteredIds,
  eraId,
  intent,
  hasActiveStoryboard = false,
  activeStoryboard = null,
  activeStoryboardStepIdx = 0,
  onPlayStoryboard,
  onSyncStoryboardStep,
  onVoiceSyncEnd,
  onUnlockChange,
  onClose,
}: AiStudioModalProps) {
  const [tab, setTab] = useState<AiStudioTab>('tutor');
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredPasscode()));
  const [passcodeInput, setPasscodeInput] = useState(() => getStoredPasscode());
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const [voicePrefs, setVoicePrefs] = useState<AiVoicePrefs>(() => getVoicePrefs());
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [usage, setUsage] = useState<AiUsageSnapshot>(() => getAiUsage());

  const contextKey = useMemo(() => {
    if (context.event) return `event:${context.event.title}`;
    if (context.figure) return `figure:${context.figure.name}`;
    if (context.country) return `country:${context.country.name}`;
    return `era:${eraId}`;
  }, [context.event?.title, context.figure?.name, context.country?.name, eraId]);

  // Tab 1: AI Tutor Chat (scoped per historical context)
  const [bindContext, setBindContext] = useState(true);
  const [threadsByContext, setThreadsByContext] = useState<Record<string, AiChatMessage[]>>({});
  const [activeThreadKey, setActiveThreadKey] = useState<string>(contextKey);
  const threadsRef = useRef(threadsByContext);
  threadsRef.current = threadsByContext;
  const activeThreadKeyRef = useRef(activeThreadKey);
  activeThreadKeyRef.current = activeThreadKey;
  const openRef = useRef(open);
  openRef.current = open;
  const messages = threadsByContext[activeThreadKey] || [];

  const [questionInput, setQuestionInput] = useState('');
  const [loadingThreadKey, setLoadingThreadKey] = useState<string | null>(null);
  const chatLoading = loadingThreadKey === activeThreadKey;
  const [chatError, setChatError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [loadingSpeechKey, setLoadingSpeechKey] = useState<string | null>(null);

  // Tab 2: Comparison
  const [subjectA, setSubjectA] = useState('');
  const [subjectB, setSubjectB] = useState('');
  const [compareAngle, setCompareAngle] = useState('');
  const [compareResult, setCompareResult] = useState<AiComparisonResult | null>(null);
  const [compareStoryboard, setCompareStoryboard] = useState<AiStoryboard | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareCached, setCompareCached] = useState(false);
  const [compareSpeaking, setCompareSpeaking] = useState(false);

  // Live speech-text & map synchronization state
  const speechRunIdRef = useRef(0);
  const compareBlockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeSpeech, setActiveSpeech] = useState<{
    sourceKey: string;
    blockId: string;
    sentenceIdx: number | null;
    sceneIndex?: number;
    loading: boolean;
  } | null>(null);

  const comparePlan = useMemo(
    () => (compareResult ? buildCompareSpeechPlan(compareResult, compareStoryboard) : null),
    [compareResult, compareStoryboard],
  );

  // Tab 3: Quiz
  const [quizScope, setQuizScope] = useState<'context' | 'era' | 'mastered'>('era');
  const [quiz, setQuiz] = useState<AiQuizPayload | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, number>>({});
  const [feynmanText, setFeynmanText] = useState('');
  const [grade, setGrade] = useState<AiQuizGrade | null>(null);
  const [grading, setGrading] = useState(false);

  const datalistSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const c of COUNTRY_PROFILES) names.add(c.name);
    for (const e of ALL_EVENTS) names.add(e.title);
    for (const f of ALL_FIGURES) names.add(f.name);
    return Array.from(names);
  }, []);

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await fetchAiStatus();
      setStatus(s);
      if (!s.configured) {
        setUnlocked(false);
        setShowGate(true);
      } else if (!s.passcodeRequired && s.allowPublic) {
        setUnlocked(true);
        setShowGate(false);
        onUnlockChange?.(true);
      } else if (s.passcodeRequired) {
        const stored = getStoredPasscode();
        if (stored) {
          setUnlocked(true);
          onUnlockChange?.(true);
        } else {
          setUnlocked(false);
          setShowGate(true);
        }
      } else {
        // Configured key, no passcode yet and allowPublic !== true -> fail closed
        setUnlocked(false);
        setShowGate(true);
      }
    } catch (err) {
      setStatus({
        configured: false,
        passcodeRequired: true,
        allowPublic: false,
        textModel: 'gemini-3.8-flash',
        ttsModel: 'gemini-3.8-flash-lite-tts',
      });
      if (err instanceof AiClientError) {
        setPasscodeError(err.message);
      }
      setShowGate(true);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    return subscribeNarrationStop(() => {
      speechRunIdRef.current += 1;
      setLoadingSpeechKey(null);
      setSpeakingMsgId(null);
      setCompareSpeaking(false);
      setActiveSpeech(null);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      speechRunIdRef.current += 1;
      setLoadingSpeechKey(null);
      setSpeakingMsgId(null);
      setCompareSpeaking(false);
      setActiveSpeech(null);
      setChatError(null);
      return;
    }
    setActiveThreadKey(contextKey);
    activeThreadKeyRef.current = contextKey;
    setChatError(null);
    setUsage(getAiUsage());
    void refreshStatus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (hasActiveStoryboard || speakingMsgId || loadingThreadKey) return;
    if (activeThreadKey !== contextKey) {
      setActiveThreadKey(contextKey);
      activeThreadKeyRef.current = contextKey;
      setChatError(null);
    }
  }, [open, contextKey, hasActiveStoryboard, speakingMsgId, loadingThreadKey, activeThreadKey]);

  useEffect(() => {
    if (tab !== 'compare' || !activeSpeech || !compareResult) return;
    if (activeSpeech.sourceKey !== `cmp-${compareResult.title}`) return;
    const el = compareBlockRefs.current[activeSpeech.blockId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [tab, activeSpeech?.blockId, activeSpeech?.sourceKey, compareResult]);

  const handleApiError = (err: unknown, setLocalErr: (msg: string | null) => void) => {
    if (err instanceof AiClientError) {
      if (err.code === 'aborted') {
        return;
      }
      if (
        err.code === 'passcode_invalid' ||
        err.code === 'passcode_unconfigured' ||
        err.code === 'not_configured'
      ) {
        setUnlocked(false);
        onUnlockChange?.(false);
        setPasscodeError(err.message);
        setShowGate(true);
        return;
      }
      setLocalErr(err.message);
      return;
    }
    setLocalErr(err instanceof Error ? err.message : '请求失败，请稍后重试');
  };

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcodeInput.trim();
    if (!trimmed) {
      setPasscodeError('请输入您设定的个人学习口令');
      return;
    }
    setVerifyingPasscode(true);
    setPasscodeError(null);
    try {
      const s = await verifyAiPasscode(trimmed);
      setStatus(s);
      setUnlocked(true);
      setShowGate(false);
      onUnlockChange?.(true);
    } catch (err) {
      setPasscodeError(err instanceof Error ? err.message : '口令验证失败');
      setUnlocked(false);
      onUnlockChange?.(false);
    } finally {
      setVerifyingPasscode(false);
    }
  };

  const sendQuestion = async (rawQ: string, explicitThreadKey?: string) => {
    const q = rawQ.trim();
    const targetKey = explicitThreadKey || activeThreadKeyRef.current;
    if (!q || loadingThreadKey === targetKey) return;
    if (targetKey !== activeThreadKeyRef.current) {
      setActiveThreadKey(targetKey);
      activeThreadKeyRef.current = targetKey;
    }
    setChatError(null);
    const priorHistory = threadsRef.current[targetKey] || [];
    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
      ts: Date.now(),
    };
    setThreadsByContext((prev) => ({
      ...prev,
      [targetKey]: [...(prev[targetKey] || []), userMsg],
    }));
    setQuestionInput('');
    setLoadingThreadKey(targetKey);
    try {
      const effectiveCtx: AiTutorContext = bindContext
        ? context
        : { currentYear: context.currentYear };
      const res = await askAiTutor({
        question: q,
        history: priorHistory,
        context: effectiveCtx,
      });
      const assistantMsg: AiChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        ts: Date.now(),
        storyboard: res.storyboard ?? null,
      };
      setThreadsByContext((prev) => ({
        ...prev,
        [targetKey]: [...(prev[targetKey] || []), assistantMsg],
      }));
      if (res.storyboard && openRef.current && activeThreadKeyRef.current === targetKey) {
        onPlayStoryboard?.(res.storyboard);
      }
      setUsage(getAiUsage());
    } catch (err) {
      if (activeThreadKeyRef.current === targetKey) {
        handleApiError(err, setChatError);
      }
    } finally {
      setLoadingThreadKey((cur) => (cur === targetKey ? null : cur));
    }
  };

  // Apply deep-link intent when opened from Event / Figure / Country cards
  useEffect(() => {
    if (!open || !intent) return;
    setTab(intent.tab);
    if (intent.tab === 'tutor') {
      setActiveThreadKey(contextKey);
      activeThreadKeyRef.current = contextKey;
      setChatError(null);
      if (intent.prefillQuestion) {
        if (intent.autoSend && unlocked && !showGate) {
          void sendQuestion(intent.prefillQuestion, contextKey);
        } else {
          setQuestionInput(intent.prefillQuestion);
        }
      }
    } else if (intent.tab === 'compare') {
      if (intent.compareSubjectA) setSubjectA(intent.compareSubjectA);
      if (intent.compareSubjectB) setSubjectB(intent.compareSubjectB);
    } else if (intent.tab === 'quiz' && intent.quizScope) {
      setQuizScope(intent.quizScope);
    }
  }, [intent?.nonce, open]);

  const contextLabel = useMemo(() => {
    if (context.event) return `事件：${context.event.title}`;
    if (context.figure) return `人物：${context.figure.name}`;
    if (context.country) return `国家：${context.country.name}`;
    return `${formatYear(context.currentYear)}${context.eraName ? ` · ${context.eraName}` : ''}`;
  }, [context]);

  const quickQuestions = useMemo(() => {
    if (context.event) {
      return [
        `用通俗大白话拆解「${context.event.title}」的深层因果`,
        '当时决策者的真实利益博弈与财政约束是什么？',
        '如果同时期换到另一个主要文明，正在发生什么相似变化？',
        '这件事对后世政治制度或经济秩序留下了什么暗线？',
      ];
    }
    if (context.figure) {
      return [
        `${context.figure.name}做对了哪步关键决策，又受限于什么时代瓶颈？`,
        `当时同代的东亚或欧洲，谁能与${context.figure.name}形成对照？`,
        `如果普通人生活在${context.figure.name}的时代，日常经济生活是怎样的？`,
      ];
    }
    if (context.country) {
      return [
        `${context.country.name}历史上最关键的一次制度/经济转折点是什么？`,
        `地理条件怎样长期锁定了${context.country.name}的地缘困境与出路？`,
        `${context.country.name}最值得和中国/欧洲做哪方面横向比较？`,
      ];
    }
    return [
      `${formatYear(context.currentYear)} 左右，全球最核心的经济与技术驱动力是什么？`,
      '这一时期东西方政权在税收和官僚控制上有哪些根本差异？',
      '帮我串联这一阶段从地缘到思想文化的因果主线',
    ];
  }, [context]);

  const handleRunCompare = async (a = subjectA, b = subjectB, angle = compareAngle) => {
    if (!a.trim() || !b.trim() || compareLoading) return;
    setCompareError(null);
    setCompareLoading(true);
    try {
      const res = await compareWithAi({ subjectA: a, subjectB: b, angle });
      setCompareResult(res.comparison);
      setCompareStoryboard(res.storyboard ?? null);
      setCompareCached(res.cached);
      if (res.storyboard) {
        onPlayStoryboard?.(res.storyboard);
      }
      setUsage(getAiUsage());
    } catch (err) {
      handleApiError(err, setCompareError);
    } finally {
      setCompareLoading(false);
    }
  };

  const runChunkedSpeech = async (params: {
    sourceKey: string;
    mode: 'msg' | 'compare';
    chunks: ReturnType<typeof buildMarkdownSpeechPlan>['chunks'];
    storyboard?: AiStoryboard | null;
  }) => {
    const { sourceKey, mode, chunks, storyboard } = params;
    if (chunks.length === 0) return;

    const runId = ++speechRunIdRef.current;
    const firstChunk = chunks[0];

    setLoadingSpeechKey(sourceKey);
    setSpeakingMsgId(mode === 'msg' ? sourceKey : null);
    setCompareSpeaking(mode === 'compare');
    setActiveSpeech({
      sourceKey,
      blockId: firstChunk.blockId,
      sentenceIdx: firstChunk.sentenceIndices[0] ?? null,
      sceneIndex: firstChunk.sceneIndex,
      loading: true,
    });

    if (storyboard && onSyncStoryboardStep) {
      onSyncStoryboardStep(storyboard, firstChunk.sceneIndex ?? 0, true);
    }

    try {
      await playSpeechChunks({
        cachePrefix: `tts:${sourceKey}`,
        chunks,
        voicePrefs,
        onStartAudio: () => {
          if (speechRunIdRef.current !== runId) return;
          setLoadingSpeechKey((cur) => (cur === sourceKey ? null : cur));
          setActiveSpeech((cur) =>
            cur && cur.sourceKey === sourceKey ? { ...cur, loading: false } : cur,
          );
          setUsage(getAiUsage());
        },
        onChunkStart: (chunk, index) => {
          if (speechRunIdRef.current !== runId) return;
          setActiveSpeech((cur) => ({
            sourceKey,
            blockId: chunk.blockId,
            sentenceIdx: chunk.sentenceIndices[0] ?? null,
            sceneIndex: chunk.sceneIndex,
            loading: index === 0 ? (cur?.sourceKey === sourceKey ? cur.loading : false) : false,
          }));
          if (storyboard && onSyncStoryboardStep && chunk.sceneIndex !== undefined) {
            onSyncStoryboardStep(storyboard, chunk.sceneIndex, true);
          }
        },
        onSentenceChange: (blockId, sentenceIdx, chunk) => {
          if (speechRunIdRef.current !== runId) return;
          setActiveSpeech((cur) => ({
            sourceKey,
            blockId,
            sentenceIdx,
            sceneIndex: chunk.sceneIndex,
            loading: cur?.sourceKey === sourceKey ? cur.loading : false,
          }));
        },
      });
      if (speechRunIdRef.current === runId) {
        setUsage(getAiUsage());
      }
    } catch (err) {
      if (speechRunIdRef.current === runId) {
        handleApiError(err, mode === 'msg' ? setChatError : setCompareError);
      }
    } finally {
      if (speechRunIdRef.current === runId) {
        setLoadingSpeechKey((cur) => (cur === sourceKey ? null : cur));
        setSpeakingMsgId(null);
        setCompareSpeaking(false);
        setActiveSpeech(null);
        onVoiceSyncEnd?.();
      }
    }
  };

  const stopCurrentSpeech = () => {
    speechRunIdRef.current += 1;
    stopActiveNarration();
    setLoadingSpeechKey(null);
    setSpeakingMsgId(null);
    setCompareSpeaking(false);
    setActiveSpeech(null);
    onVoiceSyncEnd?.();
  };

  const handleSpeakMessage = async (m: AiChatMessage, startBlockId?: string) => {
    if (!startBlockId && speakingMsgId === m.id) {
      stopCurrentSpeech();
      return;
    }
    const plan = buildMarkdownSpeechPlan(m.text, m.storyboard);
    const startIdx = startBlockId
      ? plan.chunks.findIndex((c) => c.blockId === startBlockId)
      : -1;
    const chunks = startIdx >= 0 ? plan.chunks.slice(startIdx) : plan.chunks;
    await runChunkedSpeech({
      sourceKey: m.id,
      mode: 'msg',
      chunks,
      storyboard: m.storyboard,
    });
  };

  const handleSpeakCompare = async (startBlockId?: CompareBlockId) => {
    if (!compareResult || !comparePlan) return;
    const sourceKey = `cmp-${compareResult.title}`;
    if (!startBlockId && compareSpeaking) {
      stopCurrentSpeech();
      return;
    }
    const startIdx = startBlockId
      ? comparePlan.chunks.findIndex((c) => c.blockId === startBlockId)
      : -1;
    const chunks = startIdx >= 0 ? comparePlan.chunks.slice(startIdx) : comparePlan.chunks;
    await runChunkedSpeech({
      sourceKey,
      mode: 'compare',
      chunks,
      storyboard: compareStoryboard,
    });
  };

  const buildQuizSourceItems = (): { label: string; items: AiQuizSourceItem[] } => {
    if (quizScope === 'context') {
      if (context.event) {
        return {
          label: `聚焦事件：${context.event.title}`,
          items: [
            {
              title: context.event.title,
              yearDisplay: context.event.dateDisplay,
              summary: context.event.summary,
              politics: context.event.politics,
              economy: context.event.economy,
              culture: context.event.culture,
            },
          ],
        };
      }
      if (context.country) {
        return {
          label: `聚焦国家：${context.country.name}`,
          items: [
            {
              title: context.country.name,
              yearDisplay: formatYear(context.currentYear),
              summary: context.country.tagline,
              politics: context.country.politics,
              economy: context.country.economy,
              culture: context.country.culture,
            },
          ],
        };
      }
    }

    if (quizScope === 'mastered') {
      const masteredEvents = ALL_EVENTS.filter((e) => masteredIds.has(e.id));
      if (masteredEvents.length > 0) {
        const picked = [...masteredEvents].sort(() => Math.random() - 0.5).slice(0, 6);
        return {
          label: `已掌握卡片复习（${masteredEvents.length} 项）`,
          items: picked.map((e) => ({
            title: e.title,
            yearDisplay: e.dateDisplay,
            summary: e.card.summary,
            politics: e.card.politics,
            economy: e.card.economy,
            culture: e.card.culture,
          })),
        };
      }
    }

    const eraEvents = ALL_EVENTS.filter((e) => e.eraId === eraId);
    const pool = eraEvents.length > 0 ? eraEvents : ALL_EVENTS;
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
    return {
      label: context.eraName ? `${context.eraName}精测` : '世界通史精测',
      items: picked.map((e) => ({
        title: e.title,
        yearDisplay: e.dateDisplay,
        summary: e.card.summary,
        politics: e.card.politics,
        economy: e.card.economy,
        culture: e.card.culture,
      })),
    };
  };

  const handleGenerateQuiz = async () => {
    if (quizLoading) return;
    setQuizError(null);
    setGrade(null);
    setSelectedChoices({});
    setFeynmanText('');
    setQuizLoading(true);
    try {
      const { label, items } = buildQuizSourceItems();
      const generated = await generateQuizWithAi({ scopeLabel: label, items });
      setQuiz(generated);
      setUsage(getAiUsage());
    } catch (err) {
      handleApiError(err, setQuizError);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGradeFeynman = async () => {
    if (!quiz || !feynmanText.trim() || grading) return;
    setQuizError(null);
    setGrading(true);
    try {
      const g = await gradeFeynmanWithAi({
        prompt: quiz.feynman.prompt,
        keyPoints: quiz.feynman.keyPoints,
        modelAnswer: quiz.feynman.modelAnswer,
        userAnswer: feynmanText.trim(),
      });
      setGrade(g);
      setUsage(getAiUsage());
    } catch (err) {
      handleApiError(err, setQuizError);
    } finally {
      setGrading(false);
    }
  };

  const updateVoicePrefs = (patch: Partial<AiVoicePrefs>) => {
    const next: AiVoicePrefs = { ...voicePrefs, ...patch };
    setVoicePrefs(next);
    saveVoicePrefs(next);
  };

  if (!open) return null;

  const isDark = theme === 'obsidian';
  const panelBg = isDark ? '#141E2B' : '#FBF8F1';
  const recentCompares = listCachedComparisons().slice(0, 4);

  const compareSourceKey = compareResult ? `cmp-${compareResult.title}` : '';
  const isCompareSpeechActive =
    Boolean(compareSourceKey) && compareSpeaking && activeSpeech?.sourceKey === compareSourceKey;
  const isCompareStoryboardActive = Boolean(
    compareStoryboard && activeStoryboard === compareStoryboard,
  );

  const getCompareBlockState = (blockId: CompareBlockId) => {
    const isSpoken = isCompareSpeechActive && activeSpeech?.blockId === blockId;
    const mappedScene = isSpoken
      ? (activeSpeech?.sceneIndex ?? comparePlan?.blockScenes[blockId])
      : comparePlan?.blockScenes[blockId];
    const isMapSynced =
      !isCompareSpeechActive &&
      isCompareStoryboardActive &&
      mappedScene !== undefined &&
      mappedScene === activeStoryboardStepIdx;
    const step =
      mappedScene !== undefined && compareStoryboard?.steps[mappedScene]
        ? compareStoryboard.steps[mappedScene]
        : null;
    const isAnchor =
      mappedScene !== undefined && comparePlan?.sceneAnchorBlockIds[mappedScene] === blockId;
    return {
      isSpoken,
      isMapSynced,
      mappedScene,
      step,
      isAnchor,
      sentenceIdx: isSpoken ? (activeSpeech?.sentenceIdx ?? null) : null,
      loading: isSpoken ? Boolean(activeSpeech?.loading) : false,
    };
  };

  const renderCompareSyncBadge = (blockId: CompareBlockId) => {
    const st = getCompareBlockState(blockId);

    if (st.isSpoken) {
      return (
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span
            className="inline-flex items-center gap-1 font-bold"
            style={{ color: 'var(--accent-primary)' }}
          >
            {st.loading ? (
              <>
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                <span>准备朗读...</span>
              </>
            ) : (
              <>
                <EqualizerBars />
                <span>正在朗读</span>
              </>
            )}
          </span>
          {st.step && st.mappedScene !== undefined && compareStoryboard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSyncStoryboardStep?.(compareStoryboard, st.mappedScene!, false);
              }}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold cursor-pointer hover:opacity-85"
              style={{
                backgroundColor: isDark ? 'rgba(224, 166, 75, 0.20)' : 'rgba(180, 116, 23, 0.16)',
                color: isDark ? '#F3C16E' : '#8A5208',
              }}
            >
              <Film className="h-2.5 w-2.5" />
              <span>
                地图同步 · 第 {st.mappedScene + 1} 幕 · {st.step.title}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              stopCurrentSpeech();
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold hover:opacity-85 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="停止朗读"
          >
            <Square className="h-2 w-2" />
            <span>停止</span>
          </button>
        </div>
      );
    }

    if (st.isMapSynced && st.step && st.mappedScene !== undefined) {
      return (
        <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
            style={{
              backgroundColor: isDark ? 'rgba(224, 166, 75, 0.20)' : 'rgba(180, 116, 23, 0.16)',
              color: isDark ? '#F3C16E' : '#8A5208',
            }}
          >
            <Film className="h-2.5 w-2.5" />
            <span>
              地图正演播 · 第 {st.mappedScene + 1} 幕 · {st.step.title}
            </span>
          </span>
          <span
            className="opacity-0 group-hover/cmp:opacity-100 transition-opacity inline-flex items-center gap-1 text-[9.5px] font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Volume2 className="h-2.5 w-2.5" />
            <span>从此处朗读</span>
          </span>
        </div>
      );
    }

    return (
      <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
        {st.isAnchor && st.step && st.mappedScene !== undefined && compareStoryboard ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSyncStoryboardStep?.(compareStoryboard, st.mappedScene!, false);
            }}
            className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium hover:opacity-85 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: isDark ? '#E5A94C' : '#9B5E0B',
            }}
          >
            <Film className="h-2.5 w-2.5" />
            <span>
              第 {st.mappedScene + 1} 幕 · {st.step.title}
            </span>
          </button>
        ) : (
          <span />
        )}
        <span
          className="opacity-0 group-hover/cmp:opacity-100 transition-opacity inline-flex items-center gap-1 text-[9.5px] font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          <Volume2 className="h-2.5 w-2.5" />
          <span>从此处朗读</span>
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[470px] lg:max-w-[46vw] z-50 lg:z-40 flex justify-end bg-black/45 lg:bg-transparent backdrop-blur-xs lg:backdrop-blur-none">
      <div
        className="flex h-full w-full sm:w-[470px] max-w-full flex-col border-l shadow-2xl"
        style={{
          backgroundColor: panelBg,
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3 shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold truncate">AI 史学工作室</h2>
                <button
                  type="button"
                  onClick={() => setShowGate((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border cursor-pointer"
                  style={{
                    backgroundColor: unlocked ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-muted)',
                    borderColor: unlocked ? 'rgba(16, 185, 129, 0.45)' : 'var(--border-subtle)',
                    color: unlocked ? '#059669' : 'var(--text-muted)',
                  }}
                  title="点击切换/管理个人学习口令"
                >
                  {unlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  <span>{unlocked ? '已解锁' : '需口令'}</span>
                </button>
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                本月 {usage.requests} 次 · 约 ${usage.estimatedUsd.toFixed(3)} / $10 额度
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 relative">
            {hasActiveStoryboard && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'rgba(180, 116, 23, 0.14)',
                  borderColor: '#B47417',
                  color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
                }}
              >
                <Film className="h-3 w-3" />
                <span>看地图动画</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setVoiceMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium hover:opacity-85 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              title="语音声线与省流模式设置"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">音色</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopActiveNarration();
                onClose();
              }}
              className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="关闭 AI 工作室"
            >
              <X className="h-4 w-4" />
            </button>

            {voiceMenuOpen && (
              <div
                className="absolute right-0 top-10 z-50 w-72 rounded-xl border p-3 shadow-2xl space-y-2.5"
                style={{
                  backgroundColor: panelBg,
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">旁白引擎与声线设置</span>
                  <button
                    type="button"
                    onClick={() => setVoiceMenuOpen(false)}
                    className="text-[11px] cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    完成
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {(
                    [
                      { id: 'gemini', label: 'Gemini 真人感语音' },
                      { id: 'browser', label: '浏览器语音 (最省额)' },
                    ] as { id: AiVoiceEngine; label: string }[]
                  ).map((eng) => (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => updateVoicePrefs({ engine: eng.id })}
                      className="rounded-lg border px-2 py-1.5 font-medium text-center cursor-pointer"
                      style={{
                        backgroundColor:
                          voicePrefs.engine === eng.id
                            ? 'var(--accent-primary)'
                            : 'var(--bg-elevated)',
                        borderColor:
                          voicePrefs.engine === eng.id
                            ? 'var(--accent-primary)'
                            : 'var(--border-subtle)',
                        color: voicePrefs.engine === eng.id ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>

                {voicePrefs.engine === 'gemini' && (
                  <div className="space-y-1">
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      选择旁白音色：
                    </div>
                    {AI_VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => updateVoicePrefs({ voiceName: v.id as AiVoiceName })}
                        className="w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-[11px] cursor-pointer"
                        style={{
                          backgroundColor:
                            voicePrefs.voiceName === v.id
                              ? 'rgba(140, 45, 45, 0.12)'
                              : 'var(--bg-elevated)',
                          borderColor:
                            voicePrefs.voiceName === v.id
                              ? 'var(--accent-primary)'
                              : 'var(--border-subtle)',
                        }}
                      >
                        <span className="font-semibold">{v.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {v.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Passcode Gate Drawer (when locked or toggled) */}
        {showGate && (
          <div
            className="border-b p-4 space-y-3 shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            {statusLoading ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>正在检查 Cloudflare Pages AI 配置状态...</span>
              </div>
            ) : status && !status.configured ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold" style={{ color: '#D97706' }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>后端尚未绑定您的 Gemini API 密钥</span>
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  地图与 30 国结构化卡片无需密钥即可浏览。若要启用 AI 导师、冷门古国生成与真人语音旁白，请在
                  Cloudflare Pages 后台配置 <code className="px-1 rounded bg-black/10">GEMINI_API_KEY</code>{' '}
                  与 <code className="px-1 rounded bg-black/10">AI_ACCESS_PASSCODE</code> 后刷新本页。
                </p>
                <button
                  type="button"
                  onClick={() => void refreshStatus()}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>重新检测服务状态</span>
                </button>
              </div>
            ) : status && !status.passcodeRequired && !status.allowPublic ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold" style={{ color: '#D97706' }}>
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>需先设定个人访问口令以防盗刷</span>
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  已检测到 <code className="px-1 rounded bg-black/10">GEMINI_API_KEY</code>，为确保每月 $10
                  额度不被陌生访客耗尽，请再在 Cloudflare Pages 环境变量中添加一条{' '}
                  <code className="px-1 rounded bg-black/10">AI_ACCESS_PASSCODE</code>。
                </p>
                <button
                  type="button"
                  onClick={() => void refreshStatus()}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>我已添加，重新检测</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPasscode} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <KeyRound className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
                    <span>{unlocked ? '更新或锁定个人口令' : '输入个人学习口令解锁 AI'}</span>
                  </div>
                  {unlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setStoredPasscode('');
                        setPasscodeInput('');
                        setUnlocked(false);
                        onUnlockChange?.(false);
                      }}
                      className="text-[11px] hover:underline cursor-pointer"
                      style={{ color: '#B83B3B' }}
                    >
                      清除本机口令
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="输入您在 Cloudflare 设定的个人口令..."
                    className="flex-1 rounded-xl border px-3 py-2 text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={verifyingPasscode}
                    className="inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {verifyingPasscode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '验证解锁'}
                  </button>
                </div>

                {passcodeError && (
                  <p className="text-[11px] font-medium" style={{ color: '#B83B3B' }}>
                    {passcodeError}
                  </p>
                )}
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  验证通过后将自动保存在本机浏览器（localStorage），手机/平板下次打开免重复输入。
                </p>
              </form>
            )}
          </div>
        )}

        {/* 3-Tab Switcher */}
        <div
          className="grid grid-cols-3 gap-1 border-b p-2 shrink-0"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
        >
          {(
            [
              { id: 'tutor', label: 'AI 导师', icon: <Bot className="h-3.5 w-3.5" /> },
              { id: 'compare', label: '跨代对比', icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
              { id: 'quiz', label: '因果自测', icon: <BrainCircuit className="h-3.5 w-3.5" /> },
            ] as { id: AiStudioTab; label: string; icon: React.ReactNode }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (t.id !== tab) {
                    stopActiveNarration();
                  }
                  setTab(t.id);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        {tab === 'tutor' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Context Binding Strip */}
            <div
              className="flex items-center justify-between gap-2 border-b px-3.5 py-2 text-[11px] shrink-0"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <label className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bindContext}
                  onChange={(e) => setBindContext(e.target.checked)}
                  className="accent-current"
                />
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                  结合当前地图视角：<strong style={{ color: 'var(--text-primary)' }}>{contextLabel}</strong>
                </span>
              </label>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopActiveNarration();
                    setThreadsByContext((prev) => ({
                      ...prev,
                      [activeThreadKey]: [],
                    }));
                  }}
                  className="inline-flex items-center gap-1 shrink-0 hover:opacity-75 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>清空</span>
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="atlas-scroll flex-1 overflow-y-auto p-3.5 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border p-3 text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    我是您的随身通史导师。您可以围绕当前看到的疆域、事件或人物随时追问<strong>政治博弈、财政经济、地理约束或文化流变</strong>：
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      推荐直接点击发问：
                    </div>
                    {quickQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendQuestion(q)}
                        className="w-full text-left rounded-xl border px-3 py-2 text-xs transition hover:opacity-85 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const isMsgSpeaking = speakingMsgId === m.id && activeSpeech?.sourceKey === m.id;
                const isMsgStoryboardActive = Boolean(m.storyboard && activeStoryboard === m.storyboard);
                return (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className="max-w-[92%] rounded-2xl border px-3.5 py-2.5"
                    style={{
                      backgroundColor:
                        m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      borderColor:
                        m.role === 'user' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: m.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    }}
                  >
                    {m.role === 'user' ? (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <>
                        <FormattedMarkdown
                          text={m.text}
                          storyboard={m.storyboard}
                          isActiveStoryboard={isMsgStoryboardActive}
                          activeStoryboardStepIdx={activeStoryboardStepIdx}
                          speechBlockId={isMsgSpeaking ? activeSpeech?.blockId ?? null : null}
                          speechSentenceIdx={isMsgSpeaking ? activeSpeech?.sentenceIdx ?? null : null}
                          speechLoading={isMsgSpeaking ? Boolean(activeSpeech?.loading) : false}
                          theme={theme}
                          onJumpToScene={(stepIdx) => {
                            if (m.storyboard && onSyncStoryboardStep) {
                              onSyncStoryboardStep(m.storyboard, stepIdx, false);
                            }
                          }}
                          onSpeakFromBlock={(blockId) => void handleSpeakMessage(m, blockId)}
                          onStopSpeech={stopCurrentSpeech}
                        />
                        <div
                          className="mt-2 pt-1.5 border-t flex flex-wrap items-center justify-end gap-1.5"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          {m.storyboard && onPlayStoryboard && (
                            <button
                              type="button"
                              onClick={() => onPlayStoryboard(m.storyboard!)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold hover:opacity-85 cursor-pointer"
                              style={{
                                backgroundColor: 'rgba(180, 116, 23, 0.14)',
                                color: isDark ? '#E5A94C' : '#9B5E0B',
                              }}
                            >
                              <Film className="h-3 w-3" />
                              <span>播放地图动画 ({m.storyboard.steps.length} 幕)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleSpeakMessage(m)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium hover:opacity-80 cursor-pointer"
                            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                          >
                            {speakingMsgId === m.id && loadingSpeechKey === m.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>合成语音中...</span>
                              </>
                            ) : speakingMsgId === m.id ? (
                              <>
                                <Square className="h-2.5 w-2.5" />
                                <span>停止朗读</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3" />
                                <span>语音播报</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                );
              })}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs px-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Gemini 正在结合史料脉络深度剖析...</span>
                </div>
              )}

              {chatError && (
                <div
                  className="rounded-xl border px-3 py-2 text-xs"
                  style={{
                    backgroundColor: 'rgba(184, 59, 59, 0.08)',
                    borderColor: 'rgba(184, 59, 59, 0.35)',
                    color: '#B83B3B',
                  }}
                >
                  {chatError}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendQuestion(questionInput);
              }}
              className="border-t p-3 flex items-center gap-2 shrink-0"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="输入历史、政治、经济或文化问题..."
                className="flex-1 rounded-xl border px-3 py-2 text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !questionInput.trim()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-45 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
                aria-label="发送问题"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {tab === 'compare' && (
          <div className="atlas-scroll flex-1 overflow-y-auto p-3.5 space-y-3.5">
            <datalist id="atlas-compare-options">
              {datalistSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <div
              className="rounded-xl border p-3 space-y-2.5"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  list="atlas-compare-options"
                  value={subjectA}
                  onChange={(e) => setSubjectA(e.target.value)}
                  placeholder="对比对象 A（如：秦朝、美第奇银行、雅典民主）"
                  className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <input
                  type="text"
                  list="atlas-compare-options"
                  value={subjectB}
                  onChange={(e) => setSubjectB(e.target.value)}
                  placeholder="对比对象 B（如：罗马帝国、阿拔斯王朝、宋朝）"
                  className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <input
                  type="text"
                  value={compareAngle}
                  onChange={(e) => setCompareAngle(e.target.value)}
                  placeholder="可选聚焦视角（如：财政税基、官僚选拔或商路控制）"
                  className="w-full rounded-xl border px-3 py-1.5 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="button"
                disabled={compareLoading || !subjectA.trim() || !subjectB.trim()}
                onClick={() => void handleRunCompare()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-45 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {compareLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>正在构建四维结构化对比...</span>
                  </>
                ) : (
                  <>
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    <span>生成跨代四维对比分析</span>
                  </>
                )}
              </button>
            </div>

            {/* Preset Chips */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                经典跨文明对照（点击一键生成）：
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMPARE_PRESETS.map((p) => (
                  <button
                    key={`${p.a}-${p.b}`}
                    type="button"
                    onClick={() => {
                      setSubjectA(p.a);
                      setSubjectB(p.b);
                      setCompareAngle(p.angle);
                      void handleRunCompare(p.a, p.b, p.angle);
                    }}
                    className="rounded-lg border px-2 py-1 text-[11px] transition hover:opacity-85 cursor-pointer text-left"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {p.a} × {p.b}
                  </button>
                ))}
              </div>
            </div>

            {compareError && (
              <div
                className="rounded-xl border px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'rgba(184, 59, 59, 0.08)',
                  borderColor: 'rgba(184, 59, 59, 0.35)',
                  color: '#B83B3B',
                }}
              >
                {compareError}
              </div>
            )}

            {compareResult && (
              <div
                className="rounded-xl border p-3.5 space-y-3"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold">{compareResult.title}</h3>
                    {compareCached && (
                      <span className="text-[10px]" style={{ color: '#059669' }}>
                        已命中本机缓存 · 零额度消耗
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {compareStoryboard && onPlayStoryboard && (
                      <button
                        type="button"
                        onClick={() => onPlayStoryboard(compareStoryboard)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'rgba(180, 116, 23, 0.14)',
                          borderColor: '#B47417',
                          color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
                        }}
                      >
                        <Film className="h-3 w-3" />
                        <span>重播地图对比动画</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSpeakCompare()}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold shrink-0 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {compareSpeaking && loadingSpeechKey === `cmp-${compareResult.title}` ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>合成语音中...</span>
                        </>
                      ) : compareSpeaking ? (
                        <>
                          <Square className="h-2.5 w-2.5" />
                          <span>停止</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          <span>听对比总结</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {(() => {
                  const st = getCompareBlockState('cmp-thesis');
                  const spans = comparePlan?.blocks['cmp-thesis'];
                  return (
                    <div
                      ref={(el) => {
                        compareBlockRefs.current['cmp-thesis'] = el;
                      }}
                      onClick={() => {
                        if (st.isSpoken || hasTextSelection()) return;
                        void handleSpeakCompare('cmp-thesis');
                      }}
                      title={st.isSpoken ? undefined : '点击从此段开始朗读并同步左侧地图'}
                      className={`group/cmp rounded-lg p-2.5 text-xs font-medium leading-relaxed transition-all duration-200 ${
                        st.isSpoken ? '' : 'cursor-pointer hover:opacity-95'
                      }`}
                      style={{
                        backgroundColor: st.isSpoken
                          ? isDark
                            ? 'rgba(224, 99, 90, 0.16)'
                            : 'rgba(140, 45, 45, 0.10)'
                          : st.isMapSynced
                            ? isDark
                              ? 'rgba(224, 166, 75, 0.12)'
                              : 'rgba(180, 116, 23, 0.10)'
                            : 'var(--bg-muted)',
                        borderLeft: st.isMapSynced
                          ? '3px solid var(--accent-gold)'
                          : '3px solid var(--accent-primary)',
                      }}
                    >
                      {renderCompareSyncBadge('cmp-thesis')}
                      {spans ? (
                        <SentenceList
                          sentences={spans}
                          activeSentenceIdx={st.sentenceIdx}
                          theme={theme}
                        />
                      ) : (
                        compareResult.thesis
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {(
                    [
                      {
                        blockId: 'cmp-geopolitics' as CompareBlockId,
                        icon: <Mountain className="h-3.5 w-3.5" />,
                        label: '地缘条件对比',
                        color: '#8A673B',
                        text: compareResult.dimensions.geopolitics,
                      },
                      {
                        blockId: 'cmp-politics' as CompareBlockId,
                        icon: <Landmark className="h-3.5 w-3.5" />,
                        label: '政制与权力对比',
                        color: '#B83B3B',
                        text: compareResult.dimensions.politics,
                      },
                      {
                        blockId: 'cmp-economy' as CompareBlockId,
                        icon: <Coins className="h-3.5 w-3.5" />,
                        label: '经济与财税对比',
                        color: '#B47417',
                        text: compareResult.dimensions.economy,
                      },
                      {
                        blockId: 'cmp-culture' as CompareBlockId,
                        icon: <ScrollText className="h-3.5 w-3.5" />,
                        label: '文化与观念对比',
                        color: '#734B9B',
                        text: compareResult.dimensions.culture,
                      },
                    ] as const
                  ).map((d) => {
                    const st = getCompareBlockState(d.blockId);
                    const spans = comparePlan?.blocks[d.blockId];
                    return (
                      <div
                        key={d.label}
                        ref={(el) => {
                          compareBlockRefs.current[d.blockId] = el;
                        }}
                        onClick={() => {
                          if (st.isSpoken || hasTextSelection()) return;
                          void handleSpeakCompare(d.blockId);
                        }}
                        title={st.isSpoken ? undefined : '点击从此段开始朗读并同步左侧地图'}
                        className={`group/cmp rounded-lg border p-2.5 transition-all duration-200 ${
                          st.isSpoken
                            ? ''
                            : `cursor-pointer ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.025]'}`
                        }`}
                        style={{
                          backgroundColor: st.isSpoken
                            ? isDark
                              ? 'rgba(224, 99, 90, 0.14)'
                              : 'rgba(140, 45, 45, 0.08)'
                            : st.isMapSynced
                              ? isDark
                                ? 'rgba(224, 166, 75, 0.10)'
                                : 'rgba(180, 116, 23, 0.08)'
                              : 'var(--bg-surface)',
                          borderColor: st.isSpoken
                            ? 'var(--accent-primary)'
                            : st.isMapSynced
                              ? 'var(--accent-gold)'
                              : 'var(--border-subtle)',
                          borderLeftWidth: st.isSpoken || st.isMapSynced ? '3px' : '1px',
                        }}
                      >
                        {renderCompareSyncBadge(d.blockId)}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: d.color }}>
                          {d.icon}
                          <span>{d.label}</span>
                        </div>
                        <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {spans ? (
                            <SentenceList
                              sentences={spans}
                              activeSentenceIdx={st.sentenceIdx}
                              theme={theme}
                            />
                          ) : (
                            d.text
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div
                    className="rounded-lg border p-2.5 space-y-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="font-bold" style={{ color: '#059669' }}>
                      深层结构共性
                    </div>
                    {compareResult.commonalities.map((c, idx) => (
                      <p key={idx} style={{ color: 'var(--text-secondary)' }}>
                        • {c}
                      </p>
                    ))}
                  </div>
                  <div
                    className="rounded-lg border p-2.5 space-y-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="font-bold" style={{ color: '#D97706' }}>
                      后续分流差异
                    </div>
                    {compareResult.divergences.map((d, idx) => (
                      <p key={idx} style={{ color: 'var(--text-secondary)' }}>
                        • {d}
                      </p>
                    ))}
                  </div>
                </div>

                {(() => {
                  const st = getCompareBlockState('cmp-modern');
                  const spans = comparePlan?.blocks['cmp-modern'];
                  return (
                    <div
                      ref={(el) => {
                        compareBlockRefs.current['cmp-modern'] = el;
                      }}
                      onClick={() => {
                        if (st.isSpoken || hasTextSelection()) return;
                        void handleSpeakCompare('cmp-modern');
                      }}
                      title={st.isSpoken ? undefined : '点击从此段开始朗读并同步左侧地图'}
                      className={`group/cmp rounded-lg px-2 py-1.5 text-[11px] leading-relaxed transition-all duration-200 ${
                        st.isSpoken
                          ? ''
                          : `cursor-pointer ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`
                      }`}
                      style={{
                        color: 'var(--text-secondary)',
                        backgroundColor: st.isSpoken
                          ? isDark
                            ? 'rgba(224, 99, 90, 0.14)'
                            : 'rgba(140, 45, 45, 0.08)'
                          : st.isMapSynced
                            ? isDark
                              ? 'rgba(224, 166, 75, 0.10)'
                              : 'rgba(180, 116, 23, 0.08)'
                            : 'transparent',
                        borderLeft: st.isSpoken
                          ? '3px solid var(--accent-primary)'
                          : st.isMapSynced
                            ? '2.5px solid var(--accent-gold)'
                            : undefined,
                      }}
                    >
                      {renderCompareSyncBadge('cmp-modern')}
                      <strong style={{ color: 'var(--text-primary)' }}>当代回响：</strong>
                      {spans ? (
                        <SentenceList
                          sentences={spans}
                          activeSentenceIdx={st.sentenceIdx}
                          theme={theme}
                        />
                      ) : (
                        compareResult.modernEcho
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {recentCompares.length > 0 && !compareResult && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  最近保存的对比笔记：
                </div>
                {recentCompares.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setSubjectA(c.subjectA);
                      setSubjectB(c.subjectB);
                      setCompareAngle(c.angle);
                      setCompareResult(c.data);
                      setCompareStoryboard(c.storyboard ?? null);
                      setCompareCached(true);
                      if (c.storyboard) {
                        onPlayStoryboard?.(c.storyboard);
                      }
                    }}
                    className="w-full text-left rounded-lg border px-2.5 py-1.5 text-xs hover:opacity-85 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="font-semibold">{c.data.title}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {c.subjectA} × {c.subjectB}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'quiz' && (
          <div className="atlas-scroll flex-1 overflow-y-auto p-3.5 space-y-3.5">
            <div
              className="rounded-xl border p-3 space-y-2.5"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="text-xs font-bold">选择自测范围（专注因果与机制，不考死记年份）</div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {(
                  [
                    { id: 'context', label: '当前卡片' },
                    { id: 'era', label: '本时代精测' },
                    { id: 'mastered', label: `已掌握 (${masteredIds.size})` },
                  ] as { id: 'context' | 'era' | 'mastered'; label: string }[]
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setQuizScope(s.id)}
                    className="rounded-lg border px-2 py-1.5 font-medium cursor-pointer"
                    style={{
                      backgroundColor:
                        quizScope === s.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      borderColor:
                        quizScope === s.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: quizScope === s.id ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={quizLoading}
                onClick={() => void handleGenerateQuiz()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {quizLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>AI 导师正在命题...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>{quiz ? '换一组因果测试题' : '生成 3 题深度因果自测'}</span>
                  </>
                )}
              </button>
            </div>

            {quizError && (
              <div
                className="rounded-xl border px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'rgba(184, 59, 59, 0.08)',
                  borderColor: 'rgba(184, 59, 59, 0.35)',
                  color: '#B83B3B',
                }}
              >
                {quizError}
              </div>
            )}

            {quiz && (
              <div className="space-y-3">
                <div className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {quiz.quizTitle}
                </div>

                {quiz.mcqs.map((q, qIdx) => {
                  const chosen = selectedChoices[q.id];
                  const answered = chosen !== undefined;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border p-3 space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="text-xs font-semibold leading-relaxed">
                        {qIdx + 1}. {q.question}
                      </div>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          const isCorrect = q.correctIndex === optIdx;
                          let bg = 'var(--bg-surface)';
                          let border = 'var(--border-subtle)';
                          if (answered) {
                            if (isCorrect) {
                              bg = 'rgba(16, 185, 129, 0.14)';
                              border = '#10B981';
                            } else if (isSelected) {
                              bg = 'rgba(184, 59, 59, 0.14)';
                              border = '#B83B3B';
                            }
                          }
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={answered}
                              onClick={() =>
                                setSelectedChoices((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className="w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition cursor-pointer disabled:cursor-default"
                              style={{ backgroundColor: bg, borderColor: border }}
                            >
                              <span>{opt}</span>
                              {answered && isCorrect && (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              )}
                              {answered && isSelected && !isCorrect && (
                                <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div
                          className="rounded-lg p-2.5 text-[11px] leading-relaxed"
                          style={{
                            backgroundColor: 'var(--bg-muted)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <strong style={{ color: 'var(--text-primary)' }}>原理解析：</strong>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Feynman Open Explanation Question */}
                <div
                  className="rounded-xl border p-3 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--accent-gold)' }}>
                      第 3 题 · 费曼口语复述题
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      关联：{quiz.feynman.relatedTitle}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">{quiz.feynman.prompt}</p>

                  <textarea
                    value={feynmanText}
                    onChange={(e) => setFeynmanText(e.target.value)}
                    rows={3}
                    placeholder="用自己的话简述背后的因果或制度逻辑，不用背年份..."
                    className="w-full rounded-xl border p-2.5 text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />

                  <button
                    type="button"
                    disabled={grading || !feynmanText.trim()}
                    onClick={() => void handleGradeFeynman()}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-45 cursor-pointer"
                    style={{ backgroundColor: '#B47417' }}
                  >
                    {grading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>导师阅卷中...</span>
                      </>
                    ) : (
                      <span>提交 AI 导师点评</span>
                    )}
                  </button>

                  {grade && (
                    <div
                      className="rounded-xl border p-3 space-y-2 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'rgba(180, 116, 23, 0.35)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>
                          理解力评分：{grade.score} / 100
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-primary)' }}>
                        <strong>亮点：</strong>
                        {grade.praise}
                      </p>
                      {grade.missingAngles.length > 0 && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <strong>可补充视角：</strong>
                          {grade.missingAngles.map((a, idx) => (
                            <span key={idx} className="block">
                              • {a}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        className="rounded-lg p-2 text-[11px]"
                        style={{
                          backgroundColor: 'var(--bg-muted)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-primary)' }}>导师精讲：</strong>
                        {grade.refinedSynthesis}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
