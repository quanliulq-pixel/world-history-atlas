import { Maximize2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types/history';
import { useIllustration, type IllustrationKind } from '../utils/mediaAssets';

interface ArtworkLightboxProps {
  src: string;
  alt: string;
  caption?: string;
  theme: ThemeMode;
  onClose: () => void;
}

function ArtworkLightbox({ src, alt, caption, theme, onClose }: ArtworkLightboxProps) {
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

        <img
          src={src}
          alt={alt}
          className="w-full max-h-[76vh] object-contain"
          style={{ backgroundColor: theme === 'obsidian' ? '#0B1118' : '#EFE7D4' }}
        />

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
}

export function MuseumBanner({
  kind,
  id,
  alt,
  caption,
  accentColor,
  theme,
}: MuseumBannerProps) {
  const { url } = useIllustration(kind, id);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setZoomed(false);
  }, [url, id]);

  if (!url || failed) return null;

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
        title="点击查看大图"
      >
        <div className="aspect-[16/9] w-full overflow-hidden">
          <img
            src={url}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2.5 py-2"
          style={{
            background:
              'linear-gradient(180deg, rgba(12,18,26,0) 0%, rgba(12,18,26,0.58) 55%, rgba(12,18,26,0.82) 100%)',
          }}
        >
          <span className="truncate text-[10.5px] font-medium text-amber-50/95">
            {caption || alt}
          </span>
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/40 text-white/85 opacity-80 group-hover:opacity-100">
            <Maximize2 className="h-3 w-3" />
          </span>
        </div>
      </div>

      {zoomed && (
        <ArtworkLightbox
          src={url}
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
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
        style={{ backgroundColor: roleColor }}
      >
        {monogram}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border shadow-sm cursor-pointer"
        style={{
          borderColor: `${roleColor}80`,
          backgroundColor: theme === 'obsidian' ? '#101822' : '#EFE6D2',
        }}
        title={`点击查看「${name}」历史肖像`}
        aria-label={`查看「${name}」历史肖像`}
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
          theme={theme}
          onClose={() => setZoomed(false)}
        />
      )}
    </>
  );
}
