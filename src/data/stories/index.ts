import { ALL_EVENTS } from '../events';
import { ERA1_STORIES } from './era1';
import type { StoryEpisode, StoryVolumeRoadmapItem } from './types';

export type {
  StoryEpisode,
  StoryEpisodeBeat,
  StoryVolumeRoadmapItem,
} from './types';

export const ALL_STORY_EPISODES: StoryEpisode[] = [...ERA1_STORIES];

export const STORY_EPISODE_MAP: Record<string, StoryEpisode> = Object.fromEntries(
  ALL_STORY_EPISODES.map((ep) => [ep.id, ep]),
);

export const STORY_VOLUMES_ROADMAP: StoryVolumeRoadmapItem[] = [
  { eraId: 'era-1', volumeNumber: 1, volumeTitle: '第一卷 · 大河与青铜', totalEvents: 22, status: 'in-progress' },
  { eraId: 'era-2', volumeNumber: 2, volumeTitle: '第二卷 · 轴心与古典双雄', totalEvents: 27, status: 'planned' },
  { eraId: 'era-3', volumeNumber: 3, volumeTitle: '第三卷 · 帝国裂变与宗教重构', totalEvents: 22, status: 'planned' },
  { eraId: 'era-4', volumeNumber: 4, volumeTitle: '第四卷 · 宋商潮与草原贯通', totalEvents: 23, status: 'planned' },
  { eraId: 'era-5', volumeNumber: 5, volumeTitle: '第五卷 · 大航海与白银环流', totalEvents: 26, status: 'planned' },
  { eraId: 'era-6', volumeNumber: 6, volumeTitle: '第六卷 · 蒸汽革命与东西大分流', totalEvents: 34, status: 'planned' },
  { eraId: 'era-7', volumeNumber: 7, volumeTitle: '第七卷 · 两次大战与冷战两极', totalEvents: 32, status: 'planned' },
  { eraId: 'era-8', volumeNumber: 8, volumeTitle: '第八卷 · 全球化与多极数字时代', totalEvents: 20, status: 'planned' },
];

export function getStoryEpisode(id: string | null | undefined): StoryEpisode | null {
  if (!id) return null;
  return STORY_EPISODE_MAP[id] ?? null;
}

export function hasCuratedStoryEpisode(id: string | null | undefined): boolean {
  return Boolean(id && STORY_EPISODE_MAP[id]);
}

export function getStoryCoverageStats(): {
  curatedEpisodes: number;
  curatedEvents: number;
  totalEvents: number;
  volumesStarted: number;
  totalVolumes: number;
  byEra: Record<string, number>;
} {
  const byEra: Record<string, number> = {};
  let curatedEvents = 0;
  for (const ep of ALL_STORY_EPISODES) {
    byEra[ep.eraId] = (byEra[ep.eraId] || 0) + 1;
    if (ep.kind === 'event') curatedEvents += 1;
  }
  return {
    curatedEpisodes: ALL_STORY_EPISODES.length,
    curatedEvents,
    totalEvents: ALL_EVENTS.length,
    volumesStarted: Object.keys(byEra).length,
    totalVolumes: STORY_VOLUMES_ROADMAP.length,
    byEra,
  };
}
