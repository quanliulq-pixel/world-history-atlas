import { Film, Maximize2, Pause, Play, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Dimension, ThemeMode } from '../types/history';
import { useIllustration, useMotionVideo, type IllustrationKind } from '../utils/mediaAssets';

interface ArtworkLightboxProps {
  src: string;
  videoUrl?: string | null;
  alt: string;
  caption?: string;
  theme: ThemeMode;
  onClose: () => void;
}

function ArtworkLightbox({ src, videoUrl, alt, caption, theme, onClose }: ArtworkLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        backgroundColor: theme === 'obsidian' ? 'rgba(6, 10, 16, 0.84)' : 'rgba(28, 22, 16, 0.78)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div
        className="relative max-w-3xl w-full rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'rgba(15, 23, 34, 0.72)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
          }}
          aria-label="关闭大图"
        >
          <X className="h-4 w-4" />
        </button>

        {videoUrl ? (
          <video
            src={videoUrl}
            poster={src}
            autoPlay
            muted
            loop
            controls
            playsInline
            className="w-full max-h-[76vh] object-contain"
            style={{ backgroundColor: theme === 'obsidian' ? '#0B1118' : '#120E0A' }}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[76vh] object-contain"
            style={{ backgroundColor: theme === 'obsidian' ? '#0B1118' : '#EFE7D4' }}
          />
        )}

        <div
          className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {alt}
          </span>
          {caption && <span className="truncate">{caption}</span>}
        </div>
      </div>
    </div>
  );
}

interface MuseumBannerProps {
  kind: Exclude<IllustrationKind, 'figure'>;
  id: string;
  alt: string;
  caption?: string;
  accentColor?: string;
  theme: ThemeMode;
  isNarrating?: boolean;
  activeBeatIndex?: number;
  totalBeats?: number;
  beatTitle?: string | null;
  activeSubtitle?: string | null;
  dimension?: Dimension;
}

const KB_CLASSES = ['atlas-kb-act-0', 'atlas-kb-act-1', 'atlas-kb-act-2'] as const;

export function MuseumBanner({
  kind,
  id,
  alt,
  caption,
  accentColor,
  theme,
  isNarrating = false,
  activeBeatIndex = 0,
  totalBeats = 0,
  beatTitle = null,
  activeSubtitle = null,
  dimension = 'culture',
}: MuseumBannerProps) {
  const { url } = useIllustration(kind, id);
  const { url: videoUrl } = useMotionVideo(kind, id);
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [manualMotion, setManualMotion] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [preferStatic, setPreferStatic] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setFailed(false);
    setVideoFailed(false);
    setZoomed(false);
    setMotionPaused(false);
    setPreferStatic(false);
  }, [url, videoUrl, id]);

  const hasVideo = Boolean(videoUrl && !videoFailed && !preferStatic);
  const kenBurnsActive = !hasVideo && !preferStatic && (isNarrating || manualMotion);
  const kbClass = kenBurnsActive ? KB_CLASSES[Math.abs(activeBeatIndex) % 3] : '';

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (motionPaused) vid.pause();
    else void vid.play().catch(() => {});
  }, [motionPaused, hasVideo]);

  if (!url && !hasVideo) return null;
  if (failed && !hasVideo) return null;

  const isAtmospheric = hasVideo || kenBurnsActive;
  const actLabel =
    totalBeats > 1
      ? `第 ${Math.min(totalBeats, activeBeatIndex + 1)}/${totalBeats} 幕${beatTitle ? ` · ${beatTitle}` : ''}`
      : beatTitle || (hasVideo ? '动态史画视频' : '纪录片运镜');

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-xl border shadow-sm cursor-pointer"
        style={{
          borderColor: accentColor ? `${accentColor}48` : 'var(--border-subtle)',
          backgroundColor: theme === 'obsidian' ? '#101822' : '#EFE6D2',
        }}
        onClick={() => setZoomed(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setZoomed(true);
          }
        }}
        title={hasVideo ? '点击全屏观看动态视频' : '点击查看大图'}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {hasVideo && videoUrl ? (
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              poster={url || undefined}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setVideoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            url && (
              <img
                src={url}
                alt={alt}
                loading="lazy"
                onError={() => setFailed(true)}
                className={`h-full w-full object-cover ${
                  kenBurnsActive ? kbClass : 'transition duration-500 group-hover:scale-[1.03]'
                }`}
                style={kenBurnsActive ? { animationPlayState: motionPaused ? 'paused' : 'running' } : undefined}
              />
            )
          )}

          {/* Subtle Documentary Cinema Letterbox Bars */}
          {isAtmospheric && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-black/55 transition-opacity duration-300" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-black/55 transition-opacity duration-300" />
            </>
          )}

          {/* Dimension-specific Subtle Atmospheric Layer */}
          {kenBurnsActive && !motionPaused && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {(dimension === 'culture' || dimension === 'economy') && (
                <div
                  className="atlas-light-sweep absolute inset-y-0 left-0 w-1/2"
                  style={{
                    background:
                      dimension === 'economy'
                        ? 'linear-gradient(90deg, transparent 0%, rgba(245, 196, 81, 0.16) 50%, transparent 100%)'
                        : 'linear-gradient(90deg, transparent 0%, rgba(255, 244, 214, 0.17) 50%, transparent 100%)',
                  }}
                />
              )}

              {dimension === 'tech' && (
                <>
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, rgba(125, 211, 252, 0.55) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <div
                    className="atlas-light-sweep absolute inset-y-0 left-0 w-1/3"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.18) 50%, transparent 100%)',
                    }}
                  />
                </>
              )}

              {dimension === 'politics' && (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 45%, transparent 45%, rgba(120, 20, 20, 0.28) 100%)',
                    }}
                  />
                  <svg
                    viewBox="0 0 320 180"
                    className="atlas-ember-float absolute inset-0 h-full w-full opacity-55"
                    aria-hidden="true"
                  >
                    <circle cx="48" cy="138" r="1.4" fill="#FBBF24" />
                    <circle cx="115" cy="110" r="1.1" fill="#FDE68A" />
                    <circle cx="194" cy="144" r="1.5" fill="#F59E0B" />
                    <circle cx="262" cy="96" r="1.2" fill="#FCD34D" />
                    <circle cx="288" cy="132" r="1.0" fill="#FDE68A" />
                  </svg>
                </>
              )}
            </div>
          )}

          {/* Top Controls & Motion Badge */}
          <div className="absolute left-2.5 right-2.5 top-2.5 flex items-center justify-between gap-2">
            {isAtmospheric ? (
              <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-amber-50 border border-white/15 max-w-[70%]">
                <span className="inline-flex items-end gap-[2px] h-2 shrink-0" aria-hidden="true">
                  <span
                    className={`w-[2px] h-2 rounded-full ${motionPaused ? '' : 'atlas-eq-bar'}`}
                    style={{ backgroundColor: hasVideo ? '#34D399' : '#FBBF24' }}
                  />
                  <span
                    className={`w-[2px] h-2 rounded-full ${motionPaused ? '' : 'atlas-eq-bar atlas-eq-bar-2'}`}
                    style={{ backgroundColor: hasVideo ? '#34D399' : '#FBBF24' }}
                  />
                </span>
                <span className="truncate">{actLabel}</span>
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1">
              {isAtmospheric ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMotionPaused((p) => !p);
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 text-[10px] font-medium text-white/90 hover:bg-black/80 border border-white/15 cursor-pointer"
                  title={motionPaused ? '继续动态运镜/视频' : '暂停画面动效'}
                >
                  {motionPaused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                  <span>{motionPaused ? '播放' : '动态'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreferStatic(false);
                    setManualMotion(true);
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-black/55 backdrop-blur-md px-2 text-[10px] font-medium text-white/90 hover:bg-black/80 border border-white/15 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="以纪录片动态运镜预览此史画"
                >
                  <Film className="h-2.5 w-2.5" />
                  <span>动态预览</span>
                </button>
              )}

              {videoUrl && !videoFailed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreferStatic((s) => !s);
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 text-[10px] font-medium text-white/90 hover:bg-black/80 border border-white/15 cursor-pointer"
                  title={preferStatic ? '切回 AI 动态视频' : '切换静态原画'}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>{preferStatic ? '视频' : '原画'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Subtitle / Caption & Beat Progress Bar */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end px-2.5 pt-6 pb-2"
            style={{
              background:
                'linear-gradient(180deg, rgba(12,18,26,0) 0%, rgba(12,18,26,0.62) 48%, rgba(12,18,26,0.88) 100%)',
            }}
          >
            <div className="flex items-end justify-between gap-2">
              {isNarrating && activeSubtitle ? (
                <p className="text-[11px] leading-snug text-amber-50/95 line-clamp-2 drop-shadow-sm">
                  {activeSubtitle}
                </p>
              ) : (
                <span className="truncate text-[10.5px] font-medium text-amber-50/95">
                  {caption || alt}
                </span>
              )}
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/45 text-white/85 opacity-80 group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" />
              </span>
            </div>

            {isNarrating && totalBeats > 1 && (
              <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${totalBeats}, minmax(0, 1fr))` }}>
                {Array.from({ length: totalBeats }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[2.5px] rounded-full overflow-hidden bg-white/25"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: i <= activeBeatIndex ? '100%' : '0%',
                        backgroundColor: i === activeBeatIndex ? '#FBBF24' : 'rgba(255,255,255,0.7)',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomed && (url || videoUrl) && (
        <ArtworkLightbox
          src={url || ''}
          videoUrl={hasVideo ? videoUrl : null}
          alt={alt}
          caption={caption}
          theme={theme}
          onClose={() => setZoomed(false)}
        />
      )}
    </>
  );
}

interface MuseumPortraitProps {
  id: string;
  name: string;
  monogram: string;
  roleColor: string;
  theme: ThemeMode;
}

export function MuseumPortrait({
  id,
  name,
  monogram,
  roleColor,
  theme,
}: MuseumPortraitProps) {
  const { url } = useIllustration('figure', id);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setZoomed(false);
  }, [url, id]);

  if (!url || failed) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
        style={{ backgroundColor: roleColor }}
      >
        {monogram}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border shadow-sm cursor-pointer"
        style={{
          borderColor: roleColor,
          backgroundColor: theme === 'obsidian' ? '#101822' : '#EFE6D2',
        }}
        title={`点击查看 ${name} 肖像`}
      >
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </button>

      {zoomed && (
        <ArtworkLightbox
          src={url}
          alt={name}
          caption="历史人物肖像"
          theme={theme}
          onClose={() => setZoomed(false)}
        />
      )}
    </>
  );
}
