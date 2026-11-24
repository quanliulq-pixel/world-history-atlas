import { useCallback, useEffect, useState } from 'react';
import type { ProjectionMode, ThemeMode, UserStudyData } from '../types/history';

const STUDY_STORAGE_KEY = 'world-history-atlas:study:v1';
const THEME_STORAGE_KEY = 'world-history-atlas:theme:v1';
const PROJ_STORAGE_KEY = 'world-history-atlas:projection:v1';

const DEFAULT_STUDY_DATA: UserStudyData = {
  masteredIds: [],
  bookmarkedIds: [],
  notes: {},
};

function readStudyData(): UserStudyData {
  try {
    const raw = localStorage.getItem(STUDY_STORAGE_KEY);
    if (!raw) return DEFAULT_STUDY_DATA;
    const parsed = JSON.parse(raw) as Partial<UserStudyData>;
    return {
      masteredIds: Array.isArray(parsed.masteredIds) ? parsed.masteredIds : [],
      bookmarkedIds: Array.isArray(parsed.bookmarkedIds) ? parsed.bookmarkedIds : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return DEFAULT_STUDY_DATA;
  }
}

export function useStudyStore() {
  const [studyData, setStudyData] = useState<UserStudyData>(() => readStudyData());
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
      localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(studyData));
    } catch {
      // Ignore quota errors in restricted browsing modes
    }
  }, [studyData]);

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

  const toggleMastered = useCallback((id: string) => {
    setStudyData((prev) => {
      const exists = prev.masteredIds.includes(id);
      return {
        ...prev,
        masteredIds: exists
          ? prev.masteredIds.filter((x) => x !== id)
          : [...prev.masteredIds, id],
      };
    });
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setStudyData((prev) => {
      const exists = prev.bookmarkedIds.includes(id);
      return {
        ...prev,
        bookmarkedIds: exists
          ? prev.bookmarkedIds.filter((x) => x !== id)
          : [...prev.bookmarkedIds, id],
      };
    });
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setStudyData((prev) => {
      const nextNotes = { ...prev.notes };
      if (text.trim() === '') {
        delete nextNotes[id];
      } else {
        nextNotes[id] = text;
      }
      return {
        ...prev,
        notes: nextNotes,
      };
    });
  }, []);

  const exportJson = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 1,
        ...studyData,
      },
      null,
      2,
    );
  }, [studyData]);

  const importJson = useCallback((raw: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(raw) as Partial<UserStudyData>;
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'JSON 格式无效' };
      }
      setStudyData({
        masteredIds: Array.isArray(parsed.masteredIds)
          ? parsed.masteredIds.filter((x): x is string => typeof x === 'string')
          : [],
        bookmarkedIds: Array.isArray(parsed.bookmarkedIds)
          ? parsed.bookmarkedIds.filter((x): x is string => typeof x === 'string')
          : [],
        notes:
          parsed.notes && typeof parsed.notes === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.notes).filter(
                  ([k, v]) => typeof k === 'string' && typeof v === 'string',
                ),
              )
            : {},
      });
      return { ok: true };
    } catch {
      return { ok: false, error: '无法解析备份文件' };
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'parchment' ? 'obsidian' : 'parchment'));
  }, []);

  const toggleProjection = useCallback(() => {
    setProjection((p) => (p === 'mercator' ? 'globe' : 'mercator'));
  }, []);

  return {
    studyData,
    theme,
    projection,
    toggleMastered,
    toggleBookmark,
    setNote,
    exportJson,
    importJson,
    toggleTheme,
    toggleProjection,
    setProjection,
  };
}
