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
  nanCommandery: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  jiangxia: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  lingling: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  guiyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  wuling: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  changsha: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  hanzhong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  ba: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  guanghan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  qianwei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  zangke: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yuesui: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yizhou: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yongchang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  guanghanDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shuDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  qianweiDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  longxi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  hanyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  wudu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  jincheng: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  anding: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  beidi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  wuwei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  zhangye: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  jiuquan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  dunhuang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  zhangyeDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  juyanDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shangdang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  taiyuan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shangjun: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  xihe: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  wuyuan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yunzhong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  dingxiang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yanmen: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shuofang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  zhuo: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  guangyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  dai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  shanggu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yuyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  youbeiping: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  liaoxi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  liaodong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  xuantu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  lelang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  liaodongDependent: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  nanhai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  cangwu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  yulin: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  hep: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  jiaozhi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  jiuzhen: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  rinan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7113',
  runan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  liang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  pei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  chen: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  lu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  wei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  julu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  changshan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  zhongshan: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  anping: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  hejian: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  qinghe: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  zhao: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  bohai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7110',
  henei: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  hedong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  hongnong: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  jingzhao: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  zuofengyi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  youfufeng: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7109',
  yuzhang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  kuaiji: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  danyang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  jiujiang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  lujiang: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  wu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7112',
  chenliu: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  donghai: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  langya: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  pengcheng: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  guangling: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
  xiapi: 'https://zh.wikisource.org/zh-hant/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B7111',
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

/** Source-ordered Donghai names under Xuzhou in Hou Hanshu, Treatise 21. */
export const HAN_DONGHAI_COUNTY_NAMES = [
  '郯', '蘭陵', '戚', '朐', '襄賁', '昌慮', '承', '陰平', '利城', '合鄉', '祝其', '厚丘', '贛楡',
] as const;

/** Source-ordered Langya names under Xuzhou in Hou Hanshu, Treatise 21. */
export const HAN_LANGYA_COUNTY_NAMES = [
  '開陽', '東武', '琅邪', '東莞', '西海', '諸', '莒', '東安', '陽都', '臨沂', '即丘', '繒', '姑幕',
] as const;

/** Source-ordered Pengcheng names under Xuzhou in Hou Hanshu, Treatise 21. */
export const HAN_PENGCHENG_COUNTY_NAMES = ['彭城', '武原', '傅陽', '呂', '留', '梧', '菑丘', '廣戚'] as const;

/** Source-ordered Guangling names under Xuzhou in Hou Hanshu, Treatise 21. */
export const HAN_GUANGLING_COUNTY_NAMES = [
  '廣陵', '江都', '髙郵', '平安', '淩', '東陽', '射陽', '鹽瀆', '輿', '堂邑', '海西',
] as const;

/** Source-ordered Xiapi names under Xuzhou in Hou Hanshu, Treatise 21. */
export const HAN_XIAPI_COUNTY_NAMES = [
  '下邳', '徐', '僮', '睢陵', '下相', '淮陰', '淮浦', '盱臺', '髙山', '潘旌', '淮陵', '取慮', '東成', '曲陽', '司吾', '良成', '夏丘',
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

/** Source-ordered city names under Nan commandery in Hou Hanshu, Treatise 28. */
export const HAN_NAN_COMMANDERY_COUNTY_NAMES = [
  '江陵', '巫', '秭歸', '中盧', '編', '當陽', '華容', '襄陽', '邔', '宜城', '鄀', '臨沮', '枝江', '夷道', '夷陵', '州陵', '很山',
] as const;

/** Source-ordered city names under Jiangxia commandery in Hou Hanshu, Treatise 28. */
export const HAN_JIANGXIA_COUNTY_NAMES = [
  '西陵', '西陽', '軑', '鄳', '竟陵', '雲杜', '沙羨', '邾', '下雉', '蘄春', '鄂', '平春', '南新市', '安陸',
] as const;

/** Source-ordered city names under Lingling commandery in Hou Hanshu, Treatise 28. */
export const HAN_LINGLING_COUNTY_NAMES = [
  '泉陵', '零陵', '營道', '營浦', '泠道', '洮陽', '都梁', '夫夷', '始安', '重安', '湘鄉', '昭陽', '烝陽',
] as const;

/** Source-ordered city names under Guiyang commandery in Hou Hanshu, Treatise 28. */
export const HAN_GUIYANG_COUNTY_NAMES = [
  '郴', '便', '耒陽', '陰山', '南平', '臨武', '桂陽', '含洭', '湞陽', '曲江', '漢寧',
] as const;

/** Source-ordered city names under Wuling commandery in Hou Hanshu, Treatise 28. */
export const HAN_WULING_COUNTY_NAMES = [
  '臨沅', '漢壽', '孱陵', '零陽', '充', '沅陵', '辰陽', '酉陽', '遷陵', '鐔成', '沅南', '作唐',
] as const;

/** Source-ordered city names under Changsha commandery in Hou Hanshu, Treatise 28. */
export const HAN_CHANGSHA_COUNTY_NAMES = [
  '臨湘', '攸', '荼陵', '安城', '酃', '湘南', '連道', '昭陵', '益陽', '下雋', '羅', '醴陵', '容陵',
] as const;

/** Source-ordered county names under Hanzhong commandery, Treatise 23. */
export const HAN_HANZHONG_COUNTY_NAMES = ['南鄭', '成固', '西城', '襃中', '沔陽', '安陽', '錫', '上庸', '房陵'] as const;
/** Source-ordered county names under Ba commandery; source heading prints 巴陵. */
export const HAN_BA_COUNTY_NAMES = ['江州', '宕渠', '朐忍', '閬中', '魚復', '臨江', '枳', '涪陵', '墊江', '安漢', '平都', '充國', '宣漢', '漢昌'] as const;
export const HAN_GUANGHAN_COUNTY_NAMES = ['雒', '新都', '綿竹', '什邡', '涪', '梓潼', '白水', '葭萌', '郪', '廣漢', '德陽'] as const;
export const HAN_SHU_COUNTY_NAMES = ['成都', '郫', '江原', '繁', '廣都', '臨邛', '湔氐道', '汶江道', '八陵（原文；校勘疑為蠶陵）', '廣柔', '綿虒道'] as const;
export const HAN_QIANWEI_COUNTY_NAMES = ['武陽', '資中', '牛鞞', '南安', '僰道', '江陽', '符節', '南廣', '漢安'] as const;
export const HAN_ZANGKE_COUNTY_NAMES = ['故且蘭', '平夷', '鄨', '毋斂', '談指', '夜郎', '同並', '談稾', '漏江', '毋單', '宛溫', '鐔封', '漏臥', '句町', '進乘', '西隨'] as const;
export const HAN_YUESUI_COUNTY_NAMES = ['邛都', '遂久', '靈關道', '台登', '青蛉', '卑水', '三縫', '會無', '定莋', '闡', '蘇示', '大莋', '莋秦', '姑復'] as const;
export const HAN_YIZHOU_COUNTY_NAMES = ['滇池', '勝休', '俞元', '律高', '賁古', '毋棳', '建伶', '穀昌', '牧靡', '味', '昆澤', '同瀨', '同勞', '雙柏', '連然', '梇棟', '秦臧'] as const;
export const HAN_YONGCHANG_COUNTY_NAMES = ['不韋', '巂唐', '比蘇', '楪榆', '邪龍', '雲南', '哀牢', '博南'] as const;
export const HAN_GUANGHAN_DEPENDENT_COUNTY_NAMES = ['陰平道', '甸氐道', '剛氐道'] as const;
export const HAN_SHU_DEPENDENT_COUNTY_NAMES = ['漢嘉', '嚴道', '徙', '旄牛'] as const;
export const HAN_QIANWEI_DEPENDENT_COUNTY_NAMES = ['朱提', '漢陽'] as const;
export const HAN_LONGXI_COUNTY_NAMES = ['狄道', '安故', '氐道', '首陽', '大夏', '襄武', '臨洮', '枹罕', '白石', '鄣', '河關'] as const;
export const HAN_HANYANG_COUNTY_NAMES = ['冀', '望恆', '阿陽', '略陽', '勇士', '成紀', '隴', '豲道', '蘭干', '平襄', '顯親', '上邽', '西'] as const;
export const HAN_WUDU_COUNTY_NAMES = ['下辨', '武都道', '上祿', '故道', '河池', '沮', '羌道'] as const;
export const HAN_JINCHENG_COUNTY_NAMES = ['允吾', '浩亹', '令居', '枝陽', '金城', '榆中', '臨羌', '破羌', '安夷', '允街'] as const;
export const HAN_ANDING_COUNTY_NAMES = ['臨涇', '高平', '朝那', '烏枝', '三水', '陰盤', '彭陽', '鶉觚'] as const;
export const HAN_BEIDI_COUNTY_NAMES = ['富平', '泥陽', '弋居', '廉', '參（原文轉錄缺字）', '靈州'] as const;
export const HAN_WUWEI_COUNTY_NAMES = ['姑臧', '張掖', '武威', '休屠', '揟次', '鸞鳥', '朴（原文轉錄缺字）', '媼圍', '宣威', '倉松', '鸇陰', '租厲', '顯美', '左騎'] as const;
export const HAN_ZHANGYE_COUNTY_NAMES = ['觻得', '昭武', '刪丹', '氐池', '屋蘭', '日勒', '驪靬', '番和'] as const;
export const HAN_JIUQUAN_COUNTY_NAMES = ['福祿', '表氏', '樂涫', '玉門', '會水', '沙頭', '安彌', '乾齊', '延壽'] as const;
export const HAN_DUNHUANG_COUNTY_NAMES = ['敦煌', '冥安', '效穀', '拼泉', '廣至', '龍勒'] as const;
export const HAN_ZHANGYE_DEPENDENT_COUNTY_NAMES = ['候官', '左騎', '千人', '司馬官', '千人官'] as const;
export const HAN_JUYAN_DEPENDENT_COUNTY_NAMES = ['居延'] as const;
export const HAN_SHANGDANG_COUNTY_NAMES = ['長子', '屯留', '銅鞮', '沾', '涅', '襄垣', '壺關', '泫氏', '高都', '潞', '猗氏', '陽阿', '穀遠'] as const;
export const HAN_TAIYUAN_COUNTY_NAMES = ['晉陽', '界休', '榆次', '中都', '於離', '茲氏', '狼孟', '鄔', '盂', '平陶', '京陵', '陽曲', '大陵', '祁', '慮虒', '陽邑'] as const;
export const HAN_SHANGJUN_COUNTY_NAMES = ['膚施', '白土', '漆垣', '奢延', '雕陰', '楨林', '定陽', '高奴', '龜茲屬國', '候官'] as const;
export const HAN_XIHE_COUNTY_NAMES = ['離石', '平定', '美稷', '樂街', '中陽', '皋狼', '平周', '平陸', '益蘭', '圜陰', '藺', '圜陽', '廣衍'] as const;
export const HAN_WUYUAN_COUNTY_NAMES = ['九原', '五原', '臨沃', '文國', '河陰', '武都', '宜梁', '曼柏', '成宜', '西安陽'] as const;
export const HAN_YUNZHONG_COUNTY_NAMES = ['雲中', '咸陽', '箕陵', '沙陵', '沙南', '北輿', '武泉', '原陽', '定襄', '成樂', '武進'] as const;
export const HAN_DINGXIANG_COUNTY_NAMES = ['善無', '桐過', '武成', '駱', '中陵'] as const;
export const HAN_YANMEN_COUNTY_NAMES = ['陰館', '繁畤', '樓煩', '武州', '汪陶', '劇陽', '崞', '平城', '埒', '馬邑', '鹵城', '廣武', '原平', '彊陰'] as const;
export const HAN_SHUOFANG_COUNTY_NAMES = ['臨戎', '三封', '朔方', '沃野', '廣牧', '大城'] as const;
export const HAN_ZHUO_COUNTY_NAMES = ['涿', '逎', '故安', '范陽', '良鄉', '北新城', '方城'] as const;
export const HAN_GUANGYANG_COUNTY_NAMES = ['薊', '廣陽', '昌平', '軍都', '安次'] as const;
export const HAN_DAI_COUNTY_NAMES = ['高柳', '桑乾', '道人', '當城', '馬城', '班氏', '狋氏', '北平邑', '東安陽', '平舒', '代'] as const;
export const HAN_SHANGGU_COUNTY_NAMES = ['沮陽', '潘', '甯', '廣甯', '居庸', '雊瞀', '涿鹿', '下落'] as const;
export const HAN_YUYANG_COUNTY_NAMES = ['漁陽', '狐奴', '潞', '雍奴', '泉州', '平谷', '安樂', '傂奚', '獷平'] as const;
export const HAN_YOUBEIPING_COUNTY_NAMES = ['土垠', '徐無', '俊靡', '無終'] as const;
export const HAN_LIAOXI_COUNTY_NAMES = ['陽樂', '海陽', '令支', '肥如', '臨渝'] as const;
export const HAN_LIAODONG_COUNTY_NAMES = ['襄平', '新昌', '無慮', '望平', '候城', '安市', '平郭', '西安平', '汶', '番汗', '沓氏'] as const;
export const HAN_XUANTU_COUNTY_NAMES = ['高句驪', '西蓋馬', '上殷台', '高顯', '候城', '遼陽'] as const;
export const HAN_LELANG_COUNTY_NAMES = ['朝鮮', '𧦦邯', '浿水', '含資', '占蟬', '遂城', '增地', '帶方', '駟望', '海冥', '列口', '長岑', '屯有', '昭明', '鏤方', '提奚', '渾彌', '樂都'] as const;
export const HAN_LIAODONG_DEPENDENT_COUNTY_NAMES = ['昌遼', '賓徒', '徒河', '無慮', '險瀆', '房'] as const;
export const HAN_NANHAI_COUNTY_NAMES = ['番禺', '博羅', '中宿', '龍川', '四會', '揭陽', '增城'] as const;
export const HAN_CANGWU_COUNTY_NAMES = ['廣信', '謝沐', '高要', '封陽', '臨賀', '端谿', '馮乘', '富川', '荔浦', '猛陵', '鄣平'] as const;
export const HAN_YULIN_COUNTY_NAMES = ['布山', '安廣', '阿林', '廣郁', '中溜', '桂林', '潭中', '臨塵', '定周', '增食', '領方'] as const;
export const HAN_HEPU_COUNTY_NAMES = ['合浦', '徐聞', '高涼', '臨元', '朱崖'] as const;
export const HAN_JIAOZHI_COUNTY_NAMES = ['龍編', '羸𨻻', '安定', '苟漏', '麋泠', '曲陽', '北帶', '稽徐', '西於', '朱（原文轉錄缺字）', '封谿', '望海'] as const;
export const HAN_JIUZHEN_COUNTY_NAMES = ['胥浦', '居風', '咸懽', '無功', '無編'] as const;
export const HAN_RINAN_COUNTY_NAMES = ['西卷', '朱吾', '盧容', '象林', '比景'] as const;
export const HAN_RUNAN_COUNTY_NAMES = ['平輿', '新陽', '西平', '上蔡', '南頓', '汝陰', '汝陽', '新息', '北宜春', '㶏強', '灌陽', '期思', '陽安', '項', '西華', '細陽', '安城', '吳房', '鮦陽', '慎陽', '慎', '新蔡', '安陽', '富波', '宜祿', '郎陵', '弋陽', '召陵', '征羌', '思善', '宋', '襃信', '原鹿', '定潁', '固始', '山桑', '城父'] as const;
export const HAN_LIANG_COUNTY_NAMES = ['下邑', '睢陽', '虞', '碭山', '蒙', '穀熟', '焉', '寧陵', '薄'] as const;
export const HAN_PEI_COUNTY_NAMES = ['相', '蕭', '沛', '豐', '酇', '谷陽', '譙', '洨', '蘄', '銍', '鄲', '建平', '臨睢', '竹邑', '公丘', '龍亢', '向', '符離', '虹', '太丘', '杼秋'] as const;
export const HAN_CHEN_COUNTY_NAMES = ['陳', '陽夏', '寧平', '苦', '柘', '新平', '扶樂', '武平', '長平'] as const;
export const HAN_LU_COUNTY_NAMES = ['魯', '騶', '蕃', '薛', '卞', '汶陽'] as const;
export const HAN_WEI_COUNTY_NAMES = ['鄴', '繁陽', '內黃', '魏', '元城', '黎陽', '陰安', '館陶', '清淵', '平恩', '沙', '斥丘', '武安', '曲梁', '梁期'] as const;
export const HAN_JULU_COUNTY_NAMES = ['陶', '鉅鹿', '楊氏', '鄡', '下曲陽', '任', '南和', '廣平', '斥章', '廣宗', '曲周', '列人', '廣年', '平鄉', '南䜌'] as const;
export const HAN_CHANGSHAN_COUNTY_NAMES = ['元氏', '高邑', '都鄉', '南行唐', '房子', '平棘', '欒城', '九門', '靈壽', '蒲吾', '井陘', '眞定', '上艾'] as const;
export const HAN_ZHONGSHAN_COUNTY_NAMES = ['盧奴', '北平', '毋極', '新市', '望都', '唐', '安國', '安憙', '漢昌', '蠡吾', '上曲陽', '蒲陰', '廣昌'] as const;
export const HAN_ANPING_COUNTY_NAMES = ['信都', '阜城', '南宮', '扶柳', '下博', '武邑', '觀津', '經', '堂陽', '武遂', '饒陽', '安平', '南深澤'] as const;
export const HAN_HEJIAN_COUNTY_NAMES = ['樂成', '弓高', '易', '武垣', '中水', '鄚', '高陽', '文安', '束州', '成平', '東平舒'] as const;
export const HAN_QINGHE_COUNTY_NAMES = ['甘陵', '貝丘', '東武城', '鄃', '靈', '繹幕', '廣川'] as const;
export const HAN_ZHAO_COUNTY_NAMES = ['邯鄲', '易陽', '襄國', '柏人', '中丘'] as const;
export const HAN_BOHAI_COUNTY_NAMES = ['南皮', '高城', '重合', '浮陽', '東光', '章武', '陽信', '脩'] as const;
export const HAN_HENEI_COUNTY_NAMES = ['懷', '河陽', '軹', '波', '沁水', '野王', '溫', '州', '平睾', '山陽', '武德', '獲嘉', '脩武', '共', '汲', '朝歌', '蕩陰', '林慮'] as const;
export const HAN_HEDONG_COUNTY_NAMES = ['安邑', '楊', '平陽', '臨汾', '汾陰', '蒲板', '大陽', '解', '皮氏', '聞喜', '絳', '永安', '河北', '猗氏', '垣', '襄陵', '北屈', '蒲子', '濩澤', '端氏'] as const;
export const HAN_HONGNONG_COUNTY_NAMES = ['弘農', '陝', '黽池', '新安', '宜陽', '陸渾', '盧氏', '湖', '華陰'] as const;
export const HAN_JINGZHAO_COUNTY_NAMES = ['長安', '霸陵', '杜陵', '鄭', '新豐', '藍田', '長陵', '商', '上雒', '陽陵'] as const;
export const HAN_ZUOFENGYI_COUNTY_NAMES = ['高陵', '池陽', '雲陽', '祋祤', '頻陽', '萬年', '蓮勺', '重泉', '臨晉', '郃陽', '夏陽', '衙', '粟邑'] as const;
export const HAN_YOUFUFENG_COUNTY_NAMES = ['槐里', '安陵', '平陵', '茂陵', '鄠', '郿', '武功', '陳倉', '汧', '渝麋', '雍', '栒邑', '美陽', '漆', '杜陽'] as const;

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
