import type { HistoryEvent } from '../../types/history';
import { ERA1_EVENTS } from './era1';
import { ERA2_EVENTS } from './era2';
import { ERA3_EVENTS } from './era3';
import { ERA4_EVENTS } from './era4';
import { ERA5_EVENTS } from './era5';
import { ERA6_EVENTS } from './era6';
import { ERA7_EVENTS } from './era7';
import { ERA8_EVENTS } from './era8';

export const ALL_EVENTS: HistoryEvent[] = [
  ...ERA1_EVENTS,
  ...ERA2_EVENTS,
  ...ERA3_EVENTS,
  ...ERA4_EVENTS,
  ...ERA5_EVENTS,
  ...ERA6_EVENTS,
  ...ERA7_EVENTS,
  ...ERA8_EVENTS,
].sort((a, b) => a.year - b.year);

export const EVENT_MAP: Record<string, HistoryEvent> = Object.fromEntries(
  ALL_EVENTS.map((ev) => [ev.id, ev]),
);
