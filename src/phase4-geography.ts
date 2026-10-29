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
  henanYin: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  yingchuan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  jinan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  pingyuan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  lean: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  beihai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  donglai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  qi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  nanyang: 'https://zh.wikisource.org/wiki/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  yuzhang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  kuaiji: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  danyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  jiujiang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  lujiang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  wu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  chenliu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  dong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  dongping: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  rencheng: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  taishan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  jibei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  shanyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  jiyin: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
} as const;

/** Source-ordered Jinan names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_JINAN_COUNTY_NAMES = [
  '東平陵', '著', '於陵', '臺', '菅', '土鼓', '梁鄒', '鄒平', '東朝陽', '歷城',
] as const;

/** Source-ordered Pingyuan names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_PINGYUAN_COUNTY_NAMES = [
  '平原', '高唐', '般', '鬲', '祝阿', '樂陵', '濕陰', '安德', '厭次',
] as const;

/** Source-ordered Le'an names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_LEAN_COUNTY_NAMES = [
  '臨濟', '千乘', '高菀', '樂安', '博昌', '蓼城', '利', '益', '壽光',
] as const;

/** Source-ordered Beihai names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_BEIHAI_COUNTY_NAMES = [
  '劇', '營陵', '平壽', '都昌', '安丘', '淳於', '平昌', '朱虛', '東安平', '高密',
  '昌安', '夷安', '膠東', '即墨', '壯武', '下密', '挺', '觀陽',
] as const;

/** Source-ordered Donglai names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_DONGLAI_COUNTY_NAMES = [
  '黃', '牟平', '惤', '曲成', '掖', '當利', '東牟', '昌陽', '盧鄉', '長廣', '黔陬', '葛盧', '不其',
] as const;

/** Source-ordered Qi names under Qingzhou in Hou Hanshu, Treatise 4. */
export const HAN_QI_COUNTY_NAMES = [
  '臨菑', '西安', '昌國', '臨朐', '廣', '般陽',
] as const;

/** Source-ordered Chenliu names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_CHENLIU_COUNTY_NAMES = [
  '陳留', '浚儀', '尉氏', '雍丘', '襄邑', '外黃', '小黃', '東昬', '濟陽', '平丘',
  '封丘', '酸棗', '長垣', '己吾', '考城', '圉', '扶溝',
] as const;

/** Source-ordered Dong commandery names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_DONG_COUNTY_NAMES = [
  '濮陽', '燕', '白馬', '頓丘', '東阿', '東武陽', '范', '臨邑', '博平', '聊城',
  '發干', '樂平', '陽平', '衞', '穀城',
] as const;

/** Source-ordered Dongping names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_DONGPING_COUNTY_NAMES = [
  '無鹽', '東平陸', '富成', '章', '壽張', '須昌', '寧陽',
] as const;

/** Source-ordered Rencheng names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_RENCHENG_COUNTY_NAMES = ['任城', '亢父', '樊'] as const;

/** Source-ordered Taishan names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_TAISHAN_COUNTY_NAMES = [
  '奉髙', '博', '梁甫', '鉅平', '嬴', '山茌', '萊蕪', '蓋', '南武陽', '南城', '費', '牟',
] as const;

/** Source-ordered Jibei names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_JIBEI_COUNTY_NAMES = ['盧', '蛇丘', '成', '茌平', '剛'] as const;

/** Source-ordered Shanyang names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_SHANYANG_COUNTY_NAMES = [
  '昌邑', '東緡', '鉅野', '髙平', '湖陸', '南平陽', '方與', '瑕丘', '金鄕', '防東',
] as const;

/** Source-ordered Jiyin names under Yanzhou in Hou Hanshu, Treatise 21. */
export const HAN_JIYIN_COUNTY_NAMES = [
  '定陶', '冤句', '成陽', '乘氏', '句陽', '鄄城', '離狐', '廩丘', '單父', '成武', '己氏',
] as const;

/** A source-ordered county-name sample, not a complete or year-specific map. */
export const HAN_YINGCHUAN_COUNTY_NAMES = [
  '陽翟', '襄', '襄城', '昆陽', '定陵', '舞陽', '郾', '臨潁', '潁陽',
  '潁陰', '許', '新汲', '焉陵', '長社', '陽城', '父城', '輪氏',
] as const;

/** Source-ordered county names under Henan Yin in Hou Hanshu, Treatise 19. */
export const HAN_HENAN_YIN_COUNTY_NAMES = [
  '雒陽', '河南', '梁', '熒陽', '卷', '原武', '陽武', '中牟', '開封', '菀陵',
  '平陰', '穀城', '緱氏', '鞏', '成睾', '京', '密', '新城', '匽師', '新鄭', '平',
] as const;

/** Source-ordered city names under Nanyang commandery in Hou Hanshu, Treatise 28. */
export const HAN_NANYANG_COUNTY_NAMES = [
  '宛', '冠軍', '叶', '新野', '章陵', '西鄂', '雉', '魯陽', '犨', '堵陽', '博望',
  '舞陰', '比陽', '復陽', '平氏', '棘陽', '湖陽', '隨', '育陽', '涅陽', '陰',
  '酇', '鄧', '山都', '酈', '穰', '朝陽', '蔡陽', '安眾', '築陽', '武當', '順陽',
  '成都', '襄鄉', '南鄉', '丹水', '析',
] as const;

/** Source-ordered city names under Yuzhang commandery in Hou Hanshu, Treatise 28. */
export const HAN_YUZHANG_COUNTY_NAMES = [
  '南昌', '建城', '新淦', '宜春', '廬陵', '贛', '雩都', '南野', '南城', '鄱陽', '歷陵',
  '餘汗', '鄡陽', '彭澤', '柴桑', '艾', '海昏', '平都', '石陽', '臨汝', '建昌',
] as const;

/** Source-ordered city names under Kuaiji commandery in Hou Hanshu, Treatise 28. */
export const HAN_KUAIJI_COUNTY_NAMES = [
  '山陰', '鄮', '烏傷', '諸暨', '餘暨', '太末', '上虞', '剡', '餘姚', '句章', '鄞', '章安', '永寧', '東部（原文；校勘記疑為訛文）',
] as const;

/** Source-ordered city names under Danyang commandery in Hou Hanshu, Treatise 28. */
export const HAN_DANYANG_COUNTY_NAMES = [
  '宛陵', '溧陽', '丹陽', '故鄣', '於潛', '涇', '歙', '黝', '陵陽', '蕪湖', '秣陵', '湖熟', '句容', '江乘', '春穀', '石城',
] as const;

/** Source-ordered city names under Jiujiang commandery in Hou Hanshu, Treatise 28. */
export const HAN_JIUJIANG_COUNTY_NAMES = [
  '陰陵', '壽春', '浚遒', '成德', '西曲陽', '合肥', '歷陽', '當塗', '全椒', '鍾離', '阜陵', '下蔡', '平阿', '義成',
] as const;

export const HAN_LUJIANG_COUNTY_NAMES = [
  '舒', '雩婁', '尋陽', '潛', '臨湖', '龍舒', '襄安', '皖', '居巢', '六安', '蓼', '安豐', '陽泉', '安風',
] as const;

/**
 * Transcribed Wu commandery list in the received text. The same volume's
 * collation notes question the count and whether "安" duplicates "婁".
 */
export const HAN_WU_COUNTY_NAMES = [
  '吳（本國）', '海鹽', '烏程', '餘杭', '毘陵', '丹徒', '曲阿', '由拳',
  '安（原文；校勘疑為婁）', '富春', '陽羨', '無錫', '婁（原文補入；校勘疑與安重出）',
] as const;

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
