import { ArrowRight, Crosshair, Eye, EyeOff, Film, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIMENSION_META } from '../data/eras';
import type { Era, HistoryEvent, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
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
  rightDrawerVisible: boolean;
  focusedCountries?: Array<{ id?: string; label: string; color: string }>;
  visualConcept?: SpokenVisualConcept | null;
  onExpandDetails?: () => void;
  onSelectCountryProfile?: (countryId: string) => void;
}

const KB_CLASSES = ['atlas-kb-act-0', 'atlas-kb-act-1', 'atlas-kb-act-2'] as const;

function AnimatedConceptEmblem({ kind, color }: { kind: VisualConceptKind; color: string }) {
  if (kind === 'voyage') {
    return (
      <svg viewBox="0 0 36 28" width="34" height="26" className="shrink-0" aria-hidden="true">
        <path
          d="M2 22 Q9 19 16 22 T34 22"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1.6"
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
      <svg viewBox="0 0 32 28" width="30" height="26" className="shrink-0" aria-hidden="true">
        <circle cx="16" cy="14" r="10" fill="none" stroke={color} strokeWidth="1.3" opacity="0.45">
          <animate attributeName="r" dur="1.8s" repeatCount="indefinite" values="6;12;6" />
          <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0.8;0.15;0.8" />
        </circle>
        <path d="M8 21 L22 7 M17 7 L22 7 L22 12" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M24 21 L10 7 M15 7 L10 7 L10 12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (kind === 'economy') {
    return (
      <svg viewBox="0 0 36 28" width="34" height="26" className="shrink-0" aria-hidden="true">
        <path d="M5 14 Q18 5 31 14 Q18 23 5 14 Z" fill="none" stroke="#FBBF24" strokeWidth="1.4" strokeDasharray="3 2">
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
      <svg viewBox="0 0 32 28" width="30" height="26" className="shrink-0" aria-hidden="true">
        <g transform="translate(16 14)">
          <circle r="8.5" fill="none" stroke="#60A5FA" strokeWidth="2" strokeDasharray="3.5 2.5">
            <animateTransform attributeName="transform" type="rotate" dur="5s" repeatCount="indefinite" from="0" to="360" />
          </circle>
          <circle r="3.6" fill="#93C5FD" stroke="#FFFFFF" strokeWidth="1" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 28" width="30" height="26" className="shrink-0" aria-hidden="true">
      <circle cx="16" cy="14" r="4" fill={color} stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="16" cy="14" r="9" fill="none" stroke={color} strokeWidth="1.4" opacity="0.7">
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
  rightDrawerVisible,
  focusedCountries = [],
  visualConcept = null,
  onExpandDetails,
  onSelectCountryProfile,
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
  const displayLine = activeBeat?.narration || subtitle || event?.card.summary || null;
  const hasArt = Boolean((videoUrl && !videoFailed) || (imgUrl && !imgFailed));
  const kbClass = KB_CLASSES[Math.abs(activeBeatIndex) % 3];

  return (
    <>
      {hudVisible && (
        <>
          {/* Subtle widescreen documentary edge vignette */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, transparent 58%, rgba(6, 10, 16, 0.42) 100%), linear-gradient(180deg, rgba(6, 10, 16, 0.24) 0%, transparent 18%, transparent 74%, rgba(6, 10, 16, 0.5) 100%)'
                : 'radial-gradient(ellipse at center, transparent 62%, rgba(36, 26, 14, 0.16) 100%), linear-gradient(180deg, rgba(36, 26, 14, 0.14) 0%, transparent 18%, transparent 76%, rgba(28, 20, 11, 0.34) 100%)',
            }}
            aria-hidden="true"
          />

          {/* Animated Ken Burns Museum Artwork PiP Card (bottom-left above attribution) */}
          {hasArt && (
            <button
              type="button"
              onClick={onExpandDetails}
              className="pointer-events-auto hidden md:block absolute left-3 bottom-10 z-20 w-[224px] overflow-hidden rounded-2xl border shadow-2xl text-left group cursor-pointer transition-transform hover:scale-[1.02]"
              style={{
                borderColor: `${accent}AA`,
                backgroundColor: isDark ? '#0D141D' : '#1E160F',
              }}
              title="点击展开右侧详细历史档案"
            >
              <div className="relative h-[126px] w-full overflow-hidden">
                {videoUrl && !videoFailed ? (
                  <video
                    src={videoUrl}
                    poster={imgUrl || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => setVideoFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  imgUrl && (
                    <img
                      src={imgUrl}
                      alt={event?.title || currentEra.name}
                      onError={() => setImgFailed(true)}
                      className={`h-full w-full object-cover ${kbClass}`}
                    />
                  )
                )}

                <div
                  className="pointer-events-none absolute inset-y-0 w-1/3 atlas-light-sweep"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,244,214,0.22), transparent)',
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,14,20,0.28) 0%, transparent 38%, rgba(10,14,20,0.88) 100%)',
                  }}
                />

                <div
                  className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold text-white shadow"
                  style={{ backgroundColor: `${accent}DD` }}
                >
                  <Film className="h-2.5 w-2.5" />
                  <span className="tabular-nums">{formatYear(currentYear)}</span>
                </div>

                <div className="absolute inset-x-2.5 bottom-2 text-white">
                  <div className="text-[11px] font-bold leading-snug line-clamp-2 drop-shadow">
                    {chapterLabel || event?.title || currentEra.name}
                  </div>
                  {beats && beats.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      {beats.map((b, i) => (
                        <span
                          key={`${b.title}-${i}`}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{
                            backgroundColor:
                              i <= activeBeatIndex ? accent : 'rgba(255,255,255,0.28)',
                            opacity: i === activeBeatIndex ? 1 : 0.72,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Bottom-Center Movie Documentary Subtitle + Focused Countries & Animated Visual Concept Bar */}
          {(displayLine || focusedCountries.length > 0) && (
            <div
              className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 ${
                rightDrawerVisible ? 'lg:left-[calc(50%-205px)]' : 'lg:left-1/2'
              } z-20 w-[calc(100%-24px)] max-w-[700px] ${
                hasArt
                  ? rightDrawerVisible
                    ? 'md:max-w-[min(460px,calc(100%-690px))] lg:max-w-[min(560px,calc(100%-690px))]'
                    : 'md:max-w-[min(660px,calc(100%-280px))]'
                  : ''
              }`}
            >
              <div
                className="rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md space-y-1.5"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(11, 18, 28, 0.90)'
                    : 'rgba(22, 17, 12, 0.86)',
                  borderColor: `${accent}AA`,
                  color: '#F8FAFC',
                }}
              >
                {/* Header row: Act badge + Focused Countries */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: accent }}
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>
                        {activeBeat
                          ? `第 ${activeBeatIndex + 1}/${beats?.length ?? 1} 幕 · ${activeBeat.title}`
                          : chapterLabel || event?.title || currentEra.name}
                      </span>
                    </span>

                    {focusedCountries.map((fc, idx) =>
                      fc.id && onSelectCountryProfile ? (
                        <button
                          key={`${fc.label}-${idx}`}
                          type="button"
                          onClick={() => onSelectCountryProfile(fc.id!)}
                          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-85 cursor-pointer"
                          style={{
                            backgroundColor: `${fc.color}44`,
                            borderColor: `${fc.color}CC`,
                          }}
                          title="点击查看该国历史演变专题"
                        >
                          <Crosshair className="h-2.5 w-2.5" style={{ color: '#FDE68A' }} />
                          <span>{fc.label}</span>
                        </button>
                      ) : (
                        <span
                          key={`${fc.label}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{
                            backgroundColor: `${fc.color}38`,
                            borderColor: `${fc.color}AA`,
                          }}
                        >
                          <Crosshair className="h-2.5 w-2.5 text-amber-300" />
                          <span>{fc.label}</span>
                        </span>
                      ),
                    )}
                  </div>

                  <span
                    className="inline-flex items-end gap-[2px] h-2.5 shrink-0"
                    style={{ color: accent }}
                    aria-hidden="true"
                  >
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
                  </span>
                </div>

                {/* Live Animated Concept Visual Strip reflecting what is currently narrated */}
                {visualConcept && (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-1.5"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      borderColor: 'rgba(255, 255, 255, 0.14)',
                    }}
                  >
                    <AnimatedConceptEmblem kind={visualConcept.kind} color={visualConcept.color} />
                    <span className="text-[10.5px] font-bold text-amber-200 shrink-0">
                      {visualConcept.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-stone-200">
                      {visualConcept.flowSteps.map((stepTxt, sIdx) => (
                        <span key={`${stepTxt}-${sIdx}`} className="inline-flex items-center gap-1">
                          <span className="rounded bg-white/10 px-1.5 py-0.5">{stepTxt}</span>
                          {sIdx < visualConcept.flowSteps.length - 1 && (
                            <ArrowRight className="h-2.5 w-2.5 text-amber-300 opacity-80" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {displayLine && (
                  <p
                    key={`${artId}-${activeBeatIndex}-${displayLine.slice(0, 12)}`}
                    className="atlas-card-enter text-xs sm:text-[13px] leading-relaxed text-stone-100"
                  >
                    {displayLine}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Unobtrusive HUD Toggle Pill */}
      <button
        type="button"
        onClick={() => setHudVisible((v) => !v)}
        className={`pointer-events-auto absolute bottom-3 ${
          rightDrawerVisible ? 'right-3 lg:right-[434px]' : 'right-3'
        } z-20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold shadow-lg backdrop-blur-md hover:opacity-90 cursor-pointer`}
        style={{
          backgroundColor: isDark ? 'rgba(18, 28, 40, 0.88)' : 'rgba(251, 248, 241, 0.92)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-secondary)',
        }}
        title={hudVisible ? '隐藏底部电影字幕与聚焦图解' : '显示电影字幕与聚焦图解'}
      >
        {hudVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        <span>{hudVisible ? '隐藏大屏字幕' : '大屏字幕'}</span>
      </button>
    </>
  );
}
