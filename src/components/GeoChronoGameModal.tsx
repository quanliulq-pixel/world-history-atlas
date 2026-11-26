import { ArrowRight, CheckCircle2, Compass, RotateCcw, Sparkles, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DIMENSION_META, MAX_YEAR, MIN_YEAR } from '../data/eras';
import { ALL_EVENTS, EVENT_MAP } from '../data/events';
import type { HistoryEvent, ThemeMode } from '../types/history';
import { loadIllustrationManifest, resolveIllustrationUrl } from '../utils/mediaAssets';
import type { PhysicalAtlasData } from '../utils/snapshotLoader';
import { formatYear, progressToYear, yearToProgress } from '../utils/timeline';

interface GeoChronoGameModalProps {
  open: boolean;
  theme: ThemeMode;
  physical: PhysicalAtlasData | null;
  onClose: () => void;
  onJumpToEvent: (ev: HistoryEvent) => void;
}

const BEST_SCORE_KEY = 'world-history-atlas:chrono-best:v1';
const TOTAL_ROUNDS = 5;

function haversineKm([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function geojsonRingsToPath(coords: number[][][]): string {
  return coords
    .map((ring) =>
      ring
        .map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'}${lng.toFixed(1)},${(-lat).toFixed(1)}`)
        .join(' ') + ' Z',
    )
    .join(' ');
}

function buildLandPaths(land?: GeoJSON.FeatureCollection | null): string[] {
  if (!land?.features) return [];
  const paths: string[] = [];
  for (const feat of land.features) {
    const geom = feat.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      paths.push(geojsonRingsToPath(geom.coordinates));
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        paths.push(geojsonRingsToPath(poly));
      }
    }
  }
  return paths;
}

function redactClue(summary: string): string {
  return summary
    .replace(/(?:约?\s*)?公元前?\s*\d{1,4}(?:\s*[–—-]\s*\d{1,4})?\s*年?/g, '[某时期]')
    .replace(/\b\d{3,4}\s*年?/g, '[某年]');
}

interface RoundScore {
  eventId: string;
  distKm: number;
  yearDiff: number;
  geoPts: number;
  yearPts: number;
  totalPts: number;
}

export function GeoChronoGameModal({
  open,
  theme,
  physical,
  onClose,
  onJumpToEvent,
}: GeoChronoGameModalProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [deck, setDeck] = useState<Array<{ ev: HistoryEvent; imgUrl: string | null }>>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [guessCoords, setGuessCoords] = useState<[number, number] | null>(null);
  const [guessYear, setGuessYear] = useState<number>(500);
  const [revealed, setRevealed] = useState<RoundScore | null>(null);
  const [scores, setScores] = useState<RoundScore[]>([]);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    } catch {
      return 0;
    }
  });

  const landPaths = useMemo(() => buildLandPaths(physical?.land), [physical?.land]);

  const startNewGame = async () => {
    const manifest = await loadIllustrationManifest();
    const withArt = ALL_EVENTS.map((ev) => {
      const entry = manifest.items[`event:${ev.id}`];
      return {
        ev,
        imgUrl: entry?.file ? resolveIllustrationUrl(entry.file) : null,
      };
    });
    const candidates = withArt.filter((x) => x.imgUrl);
    const sourcePool = candidates.length >= TOTAL_ROUNDS ? candidates : withArt;
    const shuffled = [...sourcePool].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS);
    setDeck(shuffled);
    setRoundIdx(0);
    setGuessCoords(null);
    setGuessYear(500);
    setRevealed(null);
    setScores([]);
  };

  useEffect(() => {
    if (open) {
      void startNewGame();
    }
  }, [open]);

  if (!open) return null;

  const isDark = theme === 'obsidian';
  const finished = scores.length >= TOTAL_ROUNDS && !revealed;
  const currentCard = deck[roundIdx];
  const cumulativePts = scores.reduce((s, r) => s + r.totalPts, 0);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (revealed || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / Math.max(1, rect.width);
    const yRatio = (e.clientY - rect.top) / Math.max(1, rect.height);
    const lng = Math.max(-180, Math.min(180, -180 + xRatio * 360));
    const lat = Math.max(-85, Math.min(85, 90 - yRatio * 180));
    setGuessCoords([lng, lat]);
  };

  const handleSubmitGuess = () => {
    if (!currentCard || !guessCoords) return;
    const ev = currentCard.ev;
    const distKm = Math.round(haversineKm(guessCoords, ev.coords));
    const yearDiff = Math.abs(guessYear - ev.year);

    const geoPts = Math.round(500 * Math.exp(-distKm / 2600));
    const yearScale = ev.year < 0 ? 450 : ev.year < 1500 ? 220 : ev.year < 1900 ? 70 : 25;
    const yearPts = Math.round(500 * Math.exp(-yearDiff / yearScale));
    const roundScore: RoundScore = {
      eventId: ev.id,
      distKm,
      yearDiff,
      geoPts,
      yearPts,
      totalPts: geoPts + yearPts,
    };
    setRevealed(roundScore);
    const nextScores = [...scores, roundScore];
    setScores(nextScores);
    if (nextScores.length >= TOTAL_ROUNDS) {
      const finalTotal = nextScores.reduce((s, r) => s + r.totalPts, 0);
      if (finalTotal > bestScore) {
        setBestScore(finalTotal);
        try {
          localStorage.setItem(BEST_SCORE_KEY, String(finalTotal));
        } catch {
          // Ignore
        }
      }
    }
  };

  const handleNextRound = () => {
    setRevealed(null);
    setGuessCoords(null);
    setRoundIdx((i) => i + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10, 16, 24, 0.72)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDark ? '#141E2B' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3 shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-sm sm:text-base font-bold">看图猜时空 · 历史断代挑战</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                根据油画场景与去年代线索，在地图上定位发生地并拖动时间标尺猜年份（满分 5,000）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-gold)' }}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>当前 {cumulativePts} 分 · 最高 {bestScore}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="关闭挑战窗口"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="atlas-scroll flex-1 overflow-y-auto p-4">
          {finished ? (
            <div className="space-y-4 max-w-2xl mx-auto py-4 text-center">
              <div
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold">挑战完成！总得分 {cumulativePts} / 5,000</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                历史最高纪录：{bestScore} 分 · 点击任意条目可直接在主图谱打开详卡精读
              </p>

              <div className="space-y-2 text-left">
                {scores.map((sc, idx) => {
                  const ev = EVENT_MAP[sc.eventId];
                  if (!ev) return null;
                  return (
                    <div
                      key={sc.eventId}
                      className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          第 {idx + 1} 题 · {ev.title}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {ev.dateDisplay} · {ev.locationName}（距离误差 {sc.distKm} km，年代误差 {sc.yearDiff} 年）
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>
                          +{sc.totalPts}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToEvent(ev);
                            onClose();
                          }}
                          className="rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-85"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-strong)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          查看详卡
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void startNewGame()}
                className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <RotateCcw className="h-4 w-4" />
                <span>再来一局（随机 5 题）</span>
              </button>
            </div>
          ) : currentCard ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Painting & Clue */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>第 {roundIdx + 1} / {TOTAL_ROUNDS} 题</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px]"
                    style={{
                      backgroundColor: DIMENSION_META[currentCard.ev.primaryDimension].bgTint,
                      color: isDark
                        ? DIMENSION_META[currentCard.ev.primaryDimension].darkColor
                        : DIMENSION_META[currentCard.ev.primaryDimension].color,
                    }}
                  >
                    {DIMENSION_META[currentCard.ev.primaryDimension].label}
                  </span>
                </div>

                {currentCard.imgUrl ? (
                  <div className="overflow-hidden rounded-xl border aspect-[16/9]" style={{ borderColor: 'var(--border-strong)' }}>
                    <img
                      src={currentCard.imgUrl}
                      alt="历史线索画卷"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="flex aspect-[16/9] items-center justify-center rounded-xl border text-xs"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    暂无插图，根据下方文字线索推理
                  </div>
                )}

                <div
                  className="rounded-xl border p-3 text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--accent-gold)' }}>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>历史线索（年代已隐去）</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {revealed ? currentCard.ev.card.summary : redactClue(currentCard.ev.card.summary)}
                  </p>
                </div>

                {revealed && (
                  <div
                    className="rounded-xl border p-3 space-y-2"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.10)',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{currentCard.ev.title}</span>
                      <span className="text-sm font-bold text-emerald-600">
                        +{revealed.totalPts} 分
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      正解：<strong>{currentCard.ev.dateDisplay}</strong> ·{' '}
                      <strong>{currentCard.ev.locationName}</strong>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      空间误差 {revealed.distKm} km（+{revealed.geoPts}）· 年代误差 {revealed.yearDiff} 年（+{revealed.yearPts}）
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToEvent(currentCard.ev);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <span>跳转地图看详卡</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextRound}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        <span>{roundIdx + 1 >= TOTAL_ROUNDS ? '查看总成绩' : '下一题'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Clickable Map & Year Slider */}
              <div className="lg:col-span-7 space-y-3">
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{
                    borderColor: 'var(--border-strong)',
                    backgroundColor: isDark ? '#0D1724' : '#C6DCE4',
                  }}
                >
                  <svg
                    ref={svgRef}
                    viewBox="-180 -90 360 180"
                    onClick={handleMapClick}
                    className={`w-full aspect-[2/1] select-none ${revealed ? 'cursor-default' : 'cursor-crosshair'}`}
                    role="img"
                    aria-label="点击地图预测事件发生地"
                  >
                    <g fill={isDark ? '#202E40' : '#E8DFCB'} stroke={isDark ? '#324863' : '#B5A486'} strokeWidth="0.35">
                      {landPaths.map((d, i) => (
                        <path key={i} d={d} />
                      ))}
                    </g>

                    {revealed && guessCoords && (
                      <line
                        x1={guessCoords[0]}
                        y1={-guessCoords[1]}
                        x2={currentCard.ev.coords[0]}
                        y2={-currentCard.ev.coords[1]}
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                      />
                    )}

                    {guessCoords && (
                      <g transform={`translate(${guessCoords[0]}, ${-guessCoords[1]})`}>
                        <circle r="5" fill="#B83B3B" fillOpacity="0.25" />
                        <circle r="2.6" fill="#B83B3B" stroke="#FFFFFF" strokeWidth="0.8" />
                      </g>
                    )}

                    {revealed && (
                      <g transform={`translate(${currentCard.ev.coords[0]}, ${-currentCard.ev.coords[1]})`}>
                        <circle r="6" fill="#10B981" fillOpacity="0.3" />
                        <circle r="3" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.9" />
                      </g>
                    )}
                  </svg>
                </div>

                <div
                  className="rounded-xl border p-3 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      1. 发生地：{guessCoords ? `经度 ${guessCoords[0].toFixed(1)}°, 纬度 ${guessCoords[1].toFixed(1)}°` : '请在上方地图上点击标出位置'}
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                      2. 猜测年份：{formatYear(guessYear)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    disabled={Boolean(revealed)}
                    value={Math.round(yearToProgress(guessYear) * 1000)}
                    onChange={(e) => setGuessYear(progressToYear(Number(e.target.value) / 1000))}
                    className="w-full accent-amber-700 cursor-pointer"
                    aria-label="拖动猜发生年份"
                  />

                  <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatYear(MIN_YEAR)}</span>
                    <span>公元 1 年</span>
                    <span>1500</span>
                    <span>{formatYear(MAX_YEAR)}</span>
                  </div>

                  {!revealed && (
                    <button
                      type="button"
                      disabled={!guessCoords}
                      onClick={handleSubmitGuess}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-45 cursor-pointer"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{guessCoords ? '锁定猜想并揭晓答案' : '请先在地图点选发生地点'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              正在随机抽取历史画卷题目...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
