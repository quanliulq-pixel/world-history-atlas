import { useCallback, useEffect, useState } from 'react';
import { ERAS } from '../data/eras';
import { ALL_EVENTS } from '../data/events';
import { ALL_FIGURES } from '../data/figures';
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

  const replaceStudyData = useCallback((next: UserStudyData) => {
    setStudyData({
      masteredIds: Array.isArray(next.masteredIds) ? next.masteredIds : [],
      bookmarkedIds: Array.isArray(next.bookmarkedIds) ? next.bookmarkedIds : [],
      notes: next.notes && typeof next.notes === 'object' ? next.notes : {},
    });
  }, []);

  const exportMarkdown = useCallback(() => {
    const masteredSet = new Set(studyData.masteredIds);
    const bookmarkedSet = new Set(studyData.bookmarkedIds);
    const lines: string[] = [
      '# 世界通史时空图谱 · 个人研学笔记书',
      '',
      `> 导出时间：${new Date().toLocaleString('zh-CN')} · 已掌握 ${studyData.masteredIds.length} 项 · 收藏 ${studyData.bookmarkedIds.length} 项 · 笔记 ${Object.keys(studyData.notes).length} 条`,
      '',
    ];

    for (const era of ERAS) {
      const evs = ALL_EVENTS.filter((e) => e.eraId === era.id);
      const figs = ALL_FIGURES.filter((f) => f.eraId === era.id);
      const relevantEvs = evs.filter(
        (e) => masteredSet.has(e.id) || bookmarkedSet.has(e.id) || Boolean(studyData.notes[e.id]),
      );
      const relevantFigs = figs.filter(
        (f) => masteredSet.has(f.id) || bookmarkedSet.has(f.id) || Boolean(studyData.notes[f.id]),
      );
      if (relevantEvs.length === 0 && relevantFigs.length === 0) continue;

      lines.push(`## ${era.name}`, '');
      for (const ev of relevantEvs) {
        const tags = [
          masteredSet.has(ev.id) ? '✅已掌握' : '',
          bookmarkedSet.has(ev.id) ? '🔖已收藏' : '',
        ]
          .filter(Boolean)
          .join(' ');
        lines.push(`### [事件] ${ev.title}（${ev.dateDisplay}） ${tags}`);
        lines.push(`- **摘要**：${ev.card.summary}`);
        if (studyData.notes[ev.id]) {
          lines.push(`- **个人笔记**：${studyData.notes[ev.id]}`);
        }
        lines.push('');
      }
      for (const fig of relevantFigs) {
        const tags = [
          masteredSet.has(fig.id) ? '✅已掌握' : '',
          bookmarkedSet.has(fig.id) ? '🔖已收藏' : '',
        ]
          .filter(Boolean)
          .join(' ');
        lines.push(`### [人物] ${fig.name}（${fig.lifespanDisplay}） ${tags}`);
        lines.push(`- **核心评价**：${fig.card.oneLiner}`);
        if (studyData.notes[fig.id]) {
          lines.push(`- **个人笔记**：${studyData.notes[fig.id]}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }, [studyData]);

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
    replaceStudyData,
    exportMarkdown,
    toggleTheme,
    toggleProjection,
    setProjection,
  };
}
