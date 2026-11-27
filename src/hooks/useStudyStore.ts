import { useCallback, useEffect, useState } from 'react';
import type { ProjectionMode, ThemeMode } from '../types/history';

const THEME_STORAGE_KEY = 'world-history-atlas:theme:v1';
const PROJ_STORAGE_KEY = 'world-history-atlas:projection:v1';

export function useStudyStore() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'obsidian' ? 'obsidian' : 'parchment';
    } catch {
      return 'parchment';
    }
  });
  const [projection, setProjection] = useState<ProjectionMode>(() => {
    try {
      const saved = localStorage.getItem(PROJ_STORAGE_KEY);
      return saved === 'globe' ? 'globe' : 'mercator';
    } catch {
      return 'mercator';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore
    }
    const root = document.documentElement;
    if (theme === 'obsidian') {
      root.classList.add('theme-obsidian');
    } else {
      root.classList.remove('theme-obsidian');
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJ_STORAGE_KEY, projection);
    } catch {
      // Ignore
    }
  }, [projection]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'parchment' ? 'obsidian' : 'parchment'));
  }, []);

  const toggleProjection = useCallback(() => {
    setProjection((p) => (p === 'mercator' ? 'globe' : 'mercator'));
  }, []);

  return {
    theme,
    projection,
    toggleTheme,
    toggleProjection,
    setProjection,
  };
}
