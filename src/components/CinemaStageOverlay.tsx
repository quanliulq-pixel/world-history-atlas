import { Eye, EyeOff, Film, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIMENSION_META } from '../data/eras';
import type { Era, HistoryEvent, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
import { useIllustration, useMotionVideo } from '../utils/mediaAssets';
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
  onExpandDetails?: () => void;
}

const KB_CLASSES = ['atlas-kb-act-0', 'atlas-kb-act-1', 'atlas-kb-act-2'] as const;

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
  onExpandDetails,
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
  const accent = event
    ? isDark
      ? DIMENSION_META[event.primaryDimension].darkColor
      : DIMENSION_META[event.primaryDimension].color
    : currentEra.accentColor;

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

                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold text-white shadow" style={{ backgroundColor: `${accent}DD` }}>
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

          {/* Bottom-Center Movie Documentary Subtitle Bar */}
          {displayLine && (
            <div
              className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 ${
                rightDrawerVisible ? 'lg:left-[calc(50%-205px)]' : 'lg:left-1/2'
              } z-20 w-[calc(100%-24px)] max-w-[680px] ${
                hasArt
                  ? rightDrawerVisible
                    ? 'md:max-w-[min(460px,calc(100%-690px))] lg:max-w-[min(560px,calc(100%-690px))]'
                    : 'md:max-w-[min(640px,calc(100%-280px))]'
                  : ''
              }`}
            >
              <div
                className="rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(11, 18, 28, 0.88)'
                    : 'rgba(22, 17, 12, 0.84)',
                  borderColor: `${accent}AA`,
                  color: '#F8FAFC',
                }}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
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
                    <span className="truncate text-[10.5px] font-medium text-amber-200/90">
                      {chapterLabel ? chapterLabel : event ? `${event.dateDisplay} · ${event.title}` : currentEra.name}
                    </span>
                  </div>
                  <span className="inline-flex items-end gap-[2px] h-2.5 shrink-0" style={{ color: accent }} aria-hidden="true">
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
                  </span>
                </div>

                <p
                  key={`${artId}-${activeBeatIndex}`}
                  className="atlas-card-enter text-xs sm:text-[13px] leading-relaxed text-stone-100"
                >
                  {displayLine}
                </p>
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
        title={hudVisible ? '隐藏底部电影字幕与画中画' : '显示电影字幕与画中画'}
      >
        {hudVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        <span>{hudVisible ? '隐藏大屏字幕' : '大屏字幕'}</span>
      </button>
    </>
  );
}
