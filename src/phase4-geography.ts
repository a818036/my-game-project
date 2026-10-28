/** Source-backed administrative directory, not a playable map or ownership model. */
export interface HistoricalDivisionIndexEntry {
  id: string;
  name: string;
  divisionType: '刺史部' | '司隸校尉部';
  commanderyCount: number;
}

export const HAN_DIVISION_SOURCE_URLS = {
  inspectorDivisions: 'https://zh.wikisource.org/zh-hans/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7118',
  sili: 'https://zh.wikisource.org/wiki/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
} as const;

/**
 * Counts as stated in Hou Hanshu, Treatise 28 (12 outer inspector divisions),
 * with the Sili commanderies listed separately in Treatise 19.
 * The source's passages cover different administrative snapshots; do not treat
 * this directory as a single-year boundary or an exact 184 CE map.
 */
export const HAN_DIVISION_INDEX: HistoricalDivisionIndexEntry[] = [
  { id: 'yu', name: '豫州', divisionType: '刺史部', commanderyCount: 6 },
  { id: 'ji', name: '冀州', divisionType: '刺史部', commanderyCount: 9 },
  { id: 'yan', name: '兗州', divisionType: '刺史部', commanderyCount: 8 },
  { id: 'xu', name: '徐州', divisionType: '刺史部', commanderyCount: 5 },
  { id: 'qing', name: '青州', divisionType: '刺史部', commanderyCount: 6 },
  { id: 'jing', name: '荊州', divisionType: '刺史部', commanderyCount: 7 },
  { id: 'yang', name: '揚州', divisionType: '刺史部', commanderyCount: 6 },
  { id: 'yi', name: '益州', divisionType: '刺史部', commanderyCount: 12 },
  { id: 'liang', name: '涼州', divisionType: '刺史部', commanderyCount: 12 },
  { id: 'bing', name: '并州', divisionType: '刺史部', commanderyCount: 9 },
  { id: 'you', name: '幽州', divisionType: '刺史部', commanderyCount: 11 },
  { id: 'jiao', name: '交州', divisionType: '刺史部', commanderyCount: 7 },
  { id: 'sili', name: '司隸校尉部', divisionType: '司隸校尉部', commanderyCount: 7 },
];

export const HAN_INSPECTOR_DIVISION_COUNT = HAN_DIVISION_INDEX.filter(
  (entry) => entry.divisionType === '刺史部',
).length;
export const HAN_INSPECTOR_COMMANDERY_TOTAL = HAN_DIVISION_INDEX
  .filter((entry) => entry.divisionType === '刺史部')
  .reduce((sum, entry) => sum + entry.commanderyCount, 0);
