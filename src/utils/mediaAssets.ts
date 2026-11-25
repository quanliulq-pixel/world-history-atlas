import { useEffect, useState } from 'react';

export type IllustrationKind = 'era' | 'event' | 'figure' | 'country';

export interface IllustrationEntry {
  file: string;
  width: number;
  height: number;
  aspect?: '16:9' | '1:1';
  caption?: string;
}

export interface IllustrationManifest {
  version: number;
  generatedAt?: string;
  model?: string;
  items: Record<string, IllustrationEntry>;
}

export interface PreGeneratedAudioBeat {
  title: string;
  narration: string;
  file: string;
  durationSec?: number;
}

export interface PreGeneratedAudioEntry {
  kind: 'event' | 'figure';
  id: string;
  script: string;
  voice?: string;
  file?: string;
  beats?: PreGeneratedAudioBeat[];
}

export interface AudioManifest {
  version: number;
  generatedAt?: string;
  engine?: string;
  items: Record<string, PreGeneratedAudioEntry>;
}

const RAW_MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE_URL || '').trim();
export const MEDIA_BASE_URL = RAW_MEDIA_BASE.replace(/\/+$/, '');

let illustrationManifestCache: IllustrationManifest | null = null;
let illustrationManifestPromise: Promise<IllustrationManifest> | null = null;

let audioManifestCache: AudioManifest | null = null;
let audioManifestPromise: Promise<AudioManifest> | null = null;

function buildMediaUrl(subPath: string): string {
  const normalized = subPath.replace(/^\/+/, '');
  return MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/media/${normalized}` : `/media/${normalized}`;
}

export async function loadIllustrationManifest(): Promise<IllustrationManifest> {
  if (illustrationManifestCache) return illustrationManifestCache;
  if (!illustrationManifestPromise) {
    illustrationManifestPromise = fetch(buildMediaUrl('illustrations/manifest.json'))
      .then(async (res) => {
        if (!res.ok) return { version: 1, items: {} } as IllustrationManifest;
        const json = (await res.json()) as Partial<IllustrationManifest>;
        return {
          version: Number(json.version || 1),
          generatedAt: json.generatedAt,
          model: json.model,
          items: json.items && typeof json.items === 'object' ? json.items : {},
        };
      })
      .catch(() => ({ version: 1, items: {} }) as IllustrationManifest)
      .then((manifest) => {
        illustrationManifestCache = manifest;
        return manifest;
      });
  }
  return illustrationManifestPromise;
}

export function resolveIllustrationUrl(relFile: string): string {
  return buildMediaUrl(`illustrations/${relFile.replace(/^\/+/, '')}`);
}

export function lookupIllustration(
  manifest: IllustrationManifest | null,
  kind: IllustrationKind,
  id?: string | null,
): { url: string | null; entry: IllustrationEntry | null } {
  if (!manifest || !id) return { url: null, entry: null };
  const entry = manifest.items[`${kind}:${id}`] ?? manifest.items[id] ?? null;
  if (!entry || !entry.file) return { url: null, entry: null };
  return { url: resolveIllustrationUrl(entry.file), entry };
}

export function useIllustration(
  kind: IllustrationKind,
  id?: string | null,
): { url: string | null; entry: IllustrationEntry | null } {
  const [manifest, setManifest] = useState<IllustrationManifest | null>(
    () => illustrationManifestCache,
  );

  useEffect(() => {
    if (illustrationManifestCache) {
      setManifest(illustrationManifestCache);
      return;
    }
    let cancelled = false;
    void loadIllustrationManifest().then((loaded) => {
      if (!cancelled) setManifest(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return lookupIllustration(manifest, kind, id);
}

export async function loadAudioManifest(): Promise<AudioManifest> {
  if (audioManifestCache) return audioManifestCache;
  if (!audioManifestPromise) {
    audioManifestPromise = fetch(buildMediaUrl('audio/manifest.json'))
      .then(async (res) => {
        if (!res.ok) return { version: 1, items: {} } as AudioManifest;
        const json = (await res.json()) as Partial<AudioManifest>;
        return {
          version: Number(json.version || 1),
          generatedAt: json.generatedAt,
          engine: json.engine,
          items: json.items && typeof json.items === 'object' ? json.items : {},
        };
      })
      .catch(() => ({ version: 1, items: {} }) as AudioManifest)
      .then((manifest) => {
        audioManifestCache = manifest;
        return manifest;
      });
  }
  return audioManifestPromise;
}

export function resolveAudioFileUrl(relFile: string): string {
  return buildMediaUrl(`audio/${relFile.replace(/^\/+/, '')}`);
}

export async function getPreGeneratedAudio(
  cacheKey: string,
): Promise<PreGeneratedAudioEntry | null> {
  const manifest = await loadAudioManifest();
  const stripped = cacheKey.replace(/^(ev|fig|event|figure):/, '');
  const entry =
    manifest.items[cacheKey] ??
    manifest.items[`ev:${stripped}`] ??
    manifest.items[`fig:${stripped}`] ??
    manifest.items[stripped] ??
    null;
  if (!entry) return null;
  const hasBeats = Array.isArray(entry.beats) && entry.beats.length > 0;
  if (!hasBeats && !entry.file) return null;
  return entry;
}
