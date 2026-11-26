import { ArrowUpRight, Minus, Network, Plus, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DIMENSION_META, ERAS } from '../data/eras';
import { ALL_EVENTS, EVENT_MAP } from '../data/events';
import type { Dimension, HistoryEvent, ThemeMode } from '../types/history';

interface CausalGraphModalProps {
  open: boolean;
  theme: ThemeMode;
  initialFocusEventId?: string | null;
  onClose: () => void;
  onSelectEvent: (ev: HistoryEvent) => void;
}

const DIM_ORDER: Dimension[] = ['politics', 'economy', 'culture', 'tech'];
const COL_W = 240;
const ROW_H = 195;
const PAD_X = 70;
const PAD_Y = 70;
const GRAPH_W = PAD_X * 2 + ERAS.length * COL_W;
const GRAPH_H = PAD_Y * 2 + DIM_ORDER.length * ROW_H;

interface GraphNode {
  ev: HistoryEvent;
  x: number;
  y: number;
  color: string;
}

function collectReachable(
  startId: string,
  getNeighbors: (ev: HistoryEvent) => string[],
): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const ev = EVENT_MAP[id];
    if (!ev) continue;
    for (const nextId of getNeighbors(ev)) {
      if (!visited.has(nextId) && EVENT_MAP[nextId]) {
        visited.add(nextId);
        queue.push(nextId);
      }
    }
  }
  return visited;
}

export function CausalGraphModal({
  open,
  theme,
  initialFocusEventId,
  onClose,
  onSelectEvent,
}: CausalGraphModalProps) {
  const [focusId, setFocusId] = useState<string | null>(initialFocusEventId || null);
  const [filterDim, setFilterDim] = useState<Dimension | 'all'>('all');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 18, y: 12 });
  const dragRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (open) {
      setFocusId(initialFocusEventId || 'e5-columbus');
    }
  }, [open, initialFocusEventId]);

  const { nodes, nodeMap, edges } = useMemo(() => {
    const eraIndex = new Map(ERAS.map((e, i) => [e.id, i]));
    const cellGroups = new Map<string, HistoryEvent[]>();
    for (const ev of ALL_EVENTS) {
      const cIdx = eraIndex.get(ev.eraId) ?? 0;
      const rIdx = DIM_ORDER.indexOf(ev.primaryDimension);
      const key = `${cIdx}:${rIdx}`;
      const list = cellGroups.get(key) || [];
      list.push(ev);
      cellGroups.set(key, list);
    }

    const builtNodes: GraphNode[] = [];
    const builtMap = new Map<string, GraphNode>();

    for (const [key, list] of cellGroups.entries()) {
      const [cStr, rStr] = key.split(':');
      const cIdx = Number(cStr);
      const rIdx = Number(rStr);
      const sorted = [...list].sort((a, b) => a.year - b.year);
      const cols = Math.max(1, Math.ceil(sorted.length / 4));
      sorted.forEach((ev, idx) => {
        const subCol = Math.floor(idx / 4);
        const subRow = idx % 4;
        const x =
          PAD_X +
          cIdx * COL_W +
          38 +
          ((subCol + 0.5) / cols) * (COL_W - 60);
        const y = PAD_Y + rIdx * ROW_H + 34 + subRow * 38;
        const dimMeta = DIMENSION_META[ev.primaryDimension];
        const color = theme === 'obsidian' ? dimMeta.darkColor : dimMeta.color;
        const node: GraphNode = { ev, x, y, color };
        builtNodes.push(node);
        builtMap.set(ev.id, node);
      });
    }

    const edgeSet = new Set<string>();
    const builtEdges: Array<{ from: GraphNode; to: GraphNode; key: string }> = [];
    for (const ev of ALL_EVENTS) {
      const fromNode = builtMap.get(ev.id);
      if (!fromNode) continue;
      for (const effId of ev.effects || []) {
        const toNode = builtMap.get(effId);
        if (toNode) {
          const k = `${ev.id}->${effId}`;
          if (!edgeSet.has(k)) {
            edgeSet.add(k);
            builtEdges.push({ from: fromNode, to: toNode, key: k });
          }
        }
      }
      for (const causeId of ev.causes || []) {
        const causeNode = builtMap.get(causeId);
        if (causeNode) {
          const k = `${causeId}->${ev.id}`;
          if (!edgeSet.has(k)) {
            edgeSet.add(k);
            builtEdges.push({ from: causeNode, to: fromNode, key: k });
          }
        }
      }
    }

    return { nodes: builtNodes, nodeMap: builtMap, edges: builtEdges };
  }, [theme]);

  const { upstreamIds, downstreamIds, focusedNode } = useMemo(() => {
    if (!focusId || !nodeMap.has(focusId)) {
      return {
        upstreamIds: new Set<string>(),
        downstreamIds: new Set<string>(),
        focusedNode: null as GraphNode | null,
      };
    }
    const up = collectReachable(focusId, (ev) => ev.causes || []);
    const down = collectReachable(focusId, (ev) => ev.effects || []);
    return {
      upstreamIds: up,
      downstreamIds: down,
      focusedNode: nodeMap.get(focusId) || null,
    };
  }, [focusId, nodeMap]);

  if (!open) return null;

  const isDark = theme === 'obsidian';
  const q = query.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10, 16, 24, 0.72)' }}
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDark ? '#101824' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 shrink-0"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-sm sm:text-base font-bold">全球历史因果脉络星图 ({ALL_EVENTS.length} 节点 / {edges.length} 因果边)</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                点选任意节点高亮完整上溯前因（琥珀色）与下推后果（翡翠绿），支持画布拖拽与滚轮缩放
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="flex items-center gap-1 rounded-lg border px-2 py-1"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="定位事件..."
                className="w-28 bg-transparent text-xs outline-none"
              />
            </div>

            <select
              value={filterDim}
              onChange={(e) => setFilterDim(e.target.value as Dimension | 'all')}
              className="rounded-lg border px-2 py-1 text-xs cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">全部维度</option>
              {DIM_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DIMENSION_META[d].label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.12).toFixed(2))))}
              className="rounded-lg border p-1.5 hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              aria-label="缩小图谱"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.12).toFixed(2))))}
              className="rounded-lg border p-1.5 hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              aria-label="放大图谱"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(0.72);
                setPan({ x: 18, y: 12 });
              }}
              className="rounded-lg border p-1.5 hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              aria-label="重置视图"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="关闭因果图谱"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Interactive Canvas */}
        <div
          className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('[data-node]')) return;
            dragRef.current = { x: e.clientX, y: e.clientY, origX: pan.x, origY: pan.y };
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            setPan({
              x: dragRef.current.origX + (e.clientX - dragRef.current.x),
              y: dragRef.current.origY + (e.clientY - dragRef.current.y),
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            setZoom((z) => Math.max(0.35, Math.min(1.8, Number((z + delta).toFixed(2)))));
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Era Columns & Dimension Swimlanes */}
            {ERAS.map((era, idx) => (
              <g key={era.id}>
                <rect
                  x={PAD_X + idx * COL_W}
                  y={24}
                  width={COL_W - 8}
                  height={GRAPH_H - 40}
                  rx={12}
                  fill={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(130,110,80,0.045)'}
                />
                <text
                  x={PAD_X + idx * COL_W + 14}
                  y={48}
                  fontSize="13"
                  fontWeight="700"
                  fill={era.accentColor}
                >
                  {era.shortName}
                </text>
              </g>
            ))}

            {DIM_ORDER.map((dim, idx) => (
              <text
                key={dim}
                x={12}
                y={PAD_Y + idx * ROW_H + 92}
                fontSize="12"
                fontWeight="700"
                fill={isDark ? DIMENSION_META[dim].darkColor : DIMENSION_META[dim].color}
              >
                {DIMENSION_META[dim].shortLabel}
              </text>
            ))}

            {/* Edges */}
            {edges.map(({ from, to, key }) => {
              const isUpEdge =
                focusId &&
                (to.ev.id === focusId || (upstreamIds.has(to.ev.id) && upstreamIds.has(from.ev.id))) &&
                (upstreamIds.has(from.ev.id) || from.ev.id === focusId);
              const isDownEdge =
                focusId &&
                (from.ev.id === focusId || (downstreamIds.has(from.ev.id) && downstreamIds.has(to.ev.id))) &&
                (downstreamIds.has(to.ev.id) || to.ev.id === focusId);
              const active = Boolean(isUpEdge || isDownEdge);
              const cx1 = (from.x + to.x) / 2;
              const cy1 = from.y - 16;
              const stroke = isUpEdge
                ? '#D97706'
                : isDownEdge
                  ? '#10B981'
                  : isDark
                    ? 'rgba(148,163,184,0.16)'
                    : 'rgba(100,85,65,0.16)';
              return (
                <path
                  key={key}
                  d={`M ${from.x} ${from.y} Q ${cx1} ${cy1} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={active ? 2.6 : 1}
                  opacity={focusId && !active ? 0.22 : active ? 0.96 : 0.7}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isFocus = node.ev.id === focusId;
              const isUp = upstreamIds.has(node.ev.id);
              const isDown = downstreamIds.has(node.ev.id);
              const dimOk = filterDim === 'all' || node.ev.dimensions.includes(filterDim);
              const qOk = !q || node.ev.title.toLowerCase().includes(q);
              const dimmed = (!dimOk || !qOk) || (Boolean(focusId) && !isFocus && !isUp && !isDown);

              return (
                <g
                  key={node.ev.id}
                  data-node="1"
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setFocusId(node.ev.id)}
                  className="cursor-pointer"
                  opacity={dimmed ? 0.24 : 1}
                >
                  <circle
                    r={isFocus ? 9.5 : isUp || isDown ? 7 : 5.2}
                    fill={
                      isFocus
                        ? '#FFFFFF'
                        : isUp
                          ? '#D97706'
                          : isDown
                            ? '#10B981'
                            : node.color
                    }
                    stroke={isFocus ? 'var(--accent-primary)' : '#FFFFFF'}
                    strokeWidth={isFocus ? 3 : 1.4}
                  />
                  <text
                    x={10}
                    y={3.5}
                    fontSize={isFocus ? '12' : '10'}
                    fontWeight={isFocus || isUp || isDown ? '700' : '500'}
                    fill={isDark ? '#E2E8F0' : '#1F1A14'}
                  >
                    {node.ev.title.slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Focused Event Inspector */}
        {focusedNode && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs shrink-0"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">{focusedNode.ev.title}</span>
                <span style={{ color: 'var(--accent-primary)' }}>{focusedNode.ev.dateDisplay}</span>
                <span className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ backgroundColor: 'rgba(217,119,6,0.14)', color: '#D97706' }}>
                  上游前因 {upstreamIds.size} 项
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.14)', color: '#059669' }}>
                  下游影响 {downstreamIds.size} 项
                </span>
              </div>
              <p className="mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {focusedNode.ev.card.summary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectEvent(focusedNode.ev);
                onClose();
              }}
              className="inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:opacity-90 shrink-0"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <span>飞镜至地图并打开详卡</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
