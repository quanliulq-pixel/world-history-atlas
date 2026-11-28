import { BookOpen, Crosshair, Eye, EyeOff, Film, PanelRightOpen, Pause, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIMENSION_META } from '../data/eras';
import type { Era, HistoryEvent, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
import type { NarrationDepth } from '../utils/chronicleStory';
import { useIllustration, useMotionVideo } from '../utils/mediaAssets';
import type { SpokenVisualConcept, VisualConceptKind } from '../utils/narrationFocus';
import { formatYear } from '../utils/timeline';

interface CinemaStageOverlayProps {
  visible: boolean;
  theme: ThemeMode;
  currentYear: number;
  currentEra: Era;
  event: HistoryEvent | null;
  chapterLabel: string | null;
  beats: AiDocumentaryBeat[] | null;
  activeBeatIndex: number;
  subtitle: string | null;
  liveChunkText?: string | null;
  storyEpisodeCode?: string | null;
  narrationDepth?: NarrationDepth;
  isPlayingOrCinema?: boolean;
  rightDrawerVisible: boolean;
  focusedCountries?: Array<{ id?: string; label: string; color: string }>;
  visualConcept?: SpokenVisualConcept | null;
  onExpandDetails?: () => void;
  onSelectCountryProfile?: (countryId: string) => void;
  onToggleNarrationDepth?: () => void;
  onStopPlayback?: () => void;
}

function AnimatedConceptEmblem({ kind, color }: { kind: VisualConceptKind; color: string }) {
  if (kind === 'voyage') {
    return (
      <svg viewBox="0 0 36 28" width="22" height="18" className="shrink-0" aria-hidden="true">
        <path
          d="M2 22 Q9 19 16 22 T34 22"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="2.4s"
            repeatCount="indefinite"
            values="M2 22 Q9 19 16 22 T34 22;M2 22 Q9 25 16 22 T34 22;M2 22 Q9 19 16 22 T34 22"
          />
        </path>
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="2.8s"
            repeatCount="indefinite"
            values="-4 18 16;4 18 16;-4 18 16"
          />
          <path d="M9 17 L27 17 L24 21 L12 21 Z" fill={color} stroke="#FFFFFF" strokeWidth="1" />
          <path d="M18 4 L18 17 L11 15 Z" fill="#FFFDF5" opacity="0.95" />
          <path d="M18 6 L25 15 L18 16 Z" fill="#FDE68A" opacity="0.92" />
        </g>
      </svg>
    );
  }
  if (kind === 'military') {
    return (
      <svg viewBox="0 0 32 28" width="20" height="18" className="shrink-0" aria-hidden="true">
        <circle cx="16" cy="14" r="10" fill="none" stroke={color} strokeWidth="1.4" opacity="0.55">
          <animate attributeName="r" dur="1.8s" repeatCount="indefinite" values="6;12;6" />
          <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0.8;0.15;0.8" />
        </circle>
        <path d="M8 21 L22 7 M17 7 L22 7 L22 12" stroke="#FCA5A5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M24 21 L10 7 M15 7 L10 7 L10 12" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (kind === 'economy') {
    return (
      <svg viewBox="0 0 36 28" width="22" height="18" className="shrink-0" aria-hidden="true">
        <path d="M5 14 Q18 5 31 14 Q18 23 5 14 Z" fill="none" stroke="#FBBF24" strokeWidth="1.6" strokeDasharray="3 2">
          <animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite" from="0" to="-20" />
        </path>
        <circle cx="9" cy="14" r="3.4" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1" />
        <circle cx="27" cy="14" r="3.4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
        <circle r="2.2" fill="#FFFDF5">
          <animateMotion dur="1.8s" repeatCount="indefinite" path="M9 14 Q18 7 27 14" />
        </circle>
      </svg>
    );
  }
  if (kind === 'tech') {
    return (
      <svg viewBox="0 0 32 28" width="20" height="18" className="shrink-0" aria-hidden="true">
        <g transform="translate(16 14)">
          <circle r="8.5" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeDasharray="3.5 2.5">
            <animateTransform attributeName="transform" type="rotate" dur="5s" repeatCount="indefinite" from="0" to="360" />
          </circle>
          <circle r="3.6" fill="#93C5FD" stroke="#FFFFFF" strokeWidth="1" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 28" width="20" height="18" className="shrink-0" aria-hidden="true">
      <circle cx="16" cy="14" r="4" fill={color} stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="16" cy="14" r="9" fill="none" stroke={color} strokeWidth="1.5" opacity="0.75">
        <animate attributeName="r" dur="2.2s" repeatCount="indefinite" values="5;12;5" />
        <animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="0.85;0.1;0.85" />
      </circle>
    </svg>
  );
}

export function CinemaStageOverlay({
  visible,
  theme,
  currentYear,
  currentEra,
  event,
  chapterLabel,
  beats,
  activeBeatIndex,
  subtitle,
  liveChunkText = null,
  storyEpisodeCode = null,
  narrationDepth = 'story',
  isPlayingOrCinema = false,
  rightDrawerVisible,
  focusedCountries = [],
  visualConcept = null,
  onExpandDetails,
  onSelectCountryProfile,
  onToggleNarrationDepth,
  onStopPlayback,
}: CinemaStageOverlayProps) {
  const [hudVisible, setHudVisible] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const artKind = event ? 'event' : 'era';
  const artId = event ? event.id : currentEra.id;
  const { url: imgUrl } = useIllustration(artKind, artId);
  const { url: videoUrl } = useMotionVideo(artKind, artId);

  useEffect(() => {
    setImgFailed(false);
    setVideoFailed(false);
  }, [artId, imgUrl, videoUrl]);

  if (!visible) return null;

  const isDark = theme === 'obsidian';
  const accent =
    visualConcept?.color ||
    (event
      ? isDark
        ? DIMENSION_META[event.primaryDimension].darkColor
        : DIMENSION_META[event.primaryDimension].color
      : currentEra.accentColor);

  const activeBeat = beats && beats[activeBeatIndex] ? beats[activeBeatIndex] : null;
  const displayLine =
    liveChunkText || activeBeat?.narration || subtitle || event?.card.summary || null;
  const hasArt = Boolean((videoUrl && !videoFailed) || (imgUrl && !imgFailed));
  const totalBeats = beats?.length ?? 0;

  return (
    <>
      {hudVisible && (
        <>
          {/* Soft cinematic edge vignette so the map animation stays luminous */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, transparent 64%, rgba(6, 10, 16, 0.28) 100%), linear-gradient(180deg, rgba(6, 10, 16, 0.14) 0%, transparent 16%, transparent 78%, rgba(6, 10, 16, 0.34) 100%)'
                : 'radial-gradient(ellipse at center, transparent 68%, rgba(36, 26, 14, 0.10) 100%), linear-gradient(180deg, rgba(36, 26, 14, 0.08) 0%, transparent 16%, transparent 80%, rgba(28, 20, 11, 0.22) 100%)',
            }}
            aria-hidden="true"
          />

          {/* Slim Translucent Movie Subtitle Ribbon (bottom-center) */}
          {(displayLine || focusedCountries.length > 0) && (
            <div
              className={`pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 ${
                rightDrawerVisible ? 'lg:left-[calc(50%-210px)]' : 'lg:left-1/2'
              } z-20 w-[calc(100%-20px)] ${
                rightDrawerVisible
                  ? 'max-w-[760px] lg:max-w-[min(760px,calc(100%-460px))]'
                  : 'max-w-[760px]'
              }`}
            >
              <div
                className="pointer-events-auto relative overflow-hidden rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-md"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(9, 14, 22, 0.82)'
                    : 'rgba(12, 17, 25, 0.74)',
                  borderColor: `${accent}88`,
                  color: '#F8FAFC',
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Integrated 40x40 mini visual thumbnail (no floating bottom-left PiP card) */}
                  {hasArt && (
                    <button
                      type="button"
                      onClick={onExpandDetails}
                      className="hidden sm:block relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/25 shadow cursor-pointer group"
                      title="点击展开右侧详细历史档案"
                    >
                      {videoUrl && !videoFailed ? (
                        <video
                          src={videoUrl}
                          poster={imgUrl || undefined}
                          autoPlay
                          muted
                          loop
                          playsInline
                          onError={() => setVideoFailed(true)}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        imgUrl && (
                          <img
                            src={imgUrl}
                            alt={event?.title || currentEra.name}
                            onError={() => setImgFailed(true)}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        )
                      )}
                      <span
                        className="absolute inset-x-0 bottom-0 h-1"
                        style={{ backgroundColor: `${accent}CC` }}
                      />
                    </button>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Single compact header row */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: accent }}
                        >
                          {storyEpisodeCode ? (
                            <BookOpen className="h-2.5 w-2.5" />
                          ) : (
                            <Film className="h-2.5 w-2.5" />
                          )}
                          <span className="tabular-nums">{formatYear(currentYear)}</span>
                          <span className="opacity-80">·</span>
                          <span className="truncate max-w-[175px]">
                            {storyEpisodeCode
                              ? activeBeat
                                ? `${storyEpisodeCode} · ${activeBeat.title}`
                                : storyEpisodeCode
                              : activeBeat
                                ? `第${activeBeatIndex + 1}/${totalBeats || 1}幕 · ${activeBeat.title}`
                                : chapterLabel || event?.title || currentEra.name}
                          </span>
                        </span>

                        {focusedCountries.slice(0, 2).map((fc, idx) =>
                          fc.id && onSelectCountryProfile ? (
                            <button
                              key={`${fc.label}-${idx}`}
                              type="button"
                              onClick={() => onSelectCountryProfile(fc.id!)}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-85 cursor-pointer"
                              style={{
                                backgroundColor: `${fc.color}40`,
                                borderColor: `${fc.color}CC`,
                              }}
                              title="点击查看该国历史演变专题"
                            >
                              <Crosshair className="h-2.5 w-2.5 text-amber-200" />
                              <span>{fc.label}</span>
                            </button>
                          ) : (
                            <span
                              key={`${fc.label}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white"
                              style={{
                                backgroundColor: `${fc.color}36`,
                                borderColor: `${fc.color}AA`,
                              }}
                            >
                              <Crosshair className="h-2.5 w-2.5 text-amber-200" />
                              <span>{fc.label}</span>
                            </span>
                          ),
                        )}

                        {visualConcept && (
                          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                            <AnimatedConceptEmblem
                              kind={visualConcept.kind}
                              color={visualConcept.color}
                            />
                            <span>{visualConcept.label}</span>
                          </span>
                        )}
                      </div>

                      {/* Micro action buttons integrated inside header row */}
                      <div className="flex items-center gap-1 shrink-0">
                        {onToggleNarrationDepth && (
                          <button
                            type="button"
                            onClick={onToggleNarrationDepth}
                            className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-stone-100 hover:bg-white/20 cursor-pointer"
                            title={
                              narrationDepth === 'story'
                                ? '当前：评书级深度听书，点击切为精简快报'
                                : '当前：精简快报，点击切为评书级深度听书'
                            }
                          >
                            <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                            <span>{narrationDepth === 'story' ? '说书' : '精简'}</span>
                          </button>
                        )}

                        {onExpandDetails && (
                          <button
                            type="button"
                            onClick={onExpandDetails}
                            className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-stone-100 hover:bg-white/20 cursor-pointer"
                            title="展开右侧详卡档案"
                          >
                            <PanelRightOpen className="h-2.5 w-2.5" />
                            <span>详卡</span>
                          </button>
                        )}

                        {isPlayingOrCinema && onStopPlayback && (
                          <button
                            type="button"
                            onClick={onStopPlayback}
                            className="inline-flex items-center gap-0.5 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/25 cursor-pointer"
                            title="暂停当前演示与解说"
                          >
                            <Pause className="h-2.5 w-2.5" />
                            <span>暂停</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setHudVisible(false)}
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-1 text-stone-200 hover:bg-white/20 cursor-pointer"
                          title="隐藏底部字幕条"
                          aria-label="隐藏底部字幕条"
                        >
                          <EyeOff className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live 1-2 line movie subtitle */}
                    {displayLine && (
                      <p
                        key={`${artId}-${activeBeatIndex}-${displayLine.slice(0, 14)}`}
                        className="atlas-card-enter line-clamp-2 sm:line-clamp-3 text-[12.5px] sm:text-[13.5px] leading-snug text-stone-100 font-medium"
                      >
                        {displayLine}
                      </p>
                    )}
                  </div>
                </div>

                {/* Razor-thin beat progress indicator along the bottom edge */}
                {beats && beats.length > 1 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[2px] bg-white/10">
                    {beats.map((b, i) => (
                      <span
                        key={`${b.title}-${i}`}
                        className="h-full flex-1 transition-colors duration-300"
                        style={{
                          backgroundColor: i <= activeBeatIndex ? accent : 'transparent',
                          opacity: i === activeBeatIndex ? 1 : 0.45,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Unobtrusive tiny restore pill shown only when subtitles are hidden */}
      {!hudVisible && (
        <button
          type="button"
          onClick={() => setHudVisible(true)}
          className={`pointer-events-auto absolute bottom-2.5 ${
            rightDrawerVisible ? 'right-3 lg:right-[434px]' : 'right-3'
          } z-20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold shadow-lg backdrop-blur-md hover:opacity-90 cursor-pointer`}
          style={{
            backgroundColor: isDark ? 'rgba(18, 28, 40, 0.88)' : 'rgba(251, 248, 241, 0.92)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-secondary)',
          }}
          title="显示底部电影字幕"
        >
          <Eye className="h-3 w-3" />
          <span>字幕</span>
        </button>
      )}
    </>
  );
}
