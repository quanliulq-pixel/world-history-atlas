import type {
  AiStoryboardFlow,
  AiStoryboardSpot,
  AiStoryboardZone,
} from '../../utils/aiClient';
import type { VisualConceptKind } from '../../utils/narrationFocus';

export interface StoryEpisodeBeat {
  title: string;
  /** Pure spoken Chinese text in 《明朝那些事儿》 storytelling cadence (zero Markdown/brackets). */
  narration: string;
  year?: number;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  focusCountries?: string[];
  conceptKind?: VisualConceptKind;
  spots?: AiStoryboardSpot[];
  flows?: AiStoryboardFlow[];
  zones?: AiStoryboardZone[];
}

export interface StoryEpisode {
  /** Matches era.id (e.g. 'era-1'), subPeriod.id (e.g. 'sp-1-1'), or event.id (e.g. 'e1-uruk'). */
  id: string;
  kind: 'era' | 'subperiod' | 'event';
  eraId: string;
  episodeCode: string;
  chapterTitle: string;
  hook: string;
  estimatedMinutes: number;
  beats: StoryEpisodeBeat[];
}

export interface StoryVolumeRoadmapItem {
  eraId: string;
  volumeNumber: number;
  volumeTitle: string;
  totalEvents: number;
  status: 'in-progress' | 'planned' | 'completed';
}
