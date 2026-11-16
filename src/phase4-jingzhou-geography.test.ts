import { describe, expect, it } from 'vitest';
import {
  HAN_CHANGSHA_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_GUIYANG_COUNTY_NAMES,
  HAN_JIANGXIA_COUNTY_NAMES,
  HAN_LINGLING_COUNTY_NAMES,
  HAN_NAN_COMMANDERY_COUNTY_NAMES,
  HAN_WULING_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》荊州刺史部名錄', () => {
  it('依卷一一二原文順序核對南郡等六郡共八十項', () => {
    const registers = [
      HAN_NAN_COMMANDERY_COUNTY_NAMES,
      HAN_JIANGXIA_COUNTY_NAMES,
      HAN_LINGLING_COUNTY_NAMES,
      HAN_GUIYANG_COUNTY_NAMES,
      HAN_WULING_COUNTY_NAMES,
      HAN_CHANGSHA_COUNTY_NAMES,
    ];
    expect(registers.map((names) => names.length)).toEqual([17, 14, 13, 11, 12, 13]);
    expect(registers.reduce((sum, names) => sum + names.length, 0)).toBe(80);
    expect(HAN_NAN_COMMANDERY_COUNTY_NAMES).toEqual(['江陵', '巫', '秭歸', '中盧', '編', '當陽', '華容', '襄陽', '邔', '宜城', '鄀', '臨沮', '枝江', '夷道', '夷陵', '州陵', '很山']);
    expect(HAN_JIANGXIA_COUNTY_NAMES).toEqual(['西陵', '西陽', '軑', '鄳', '竟陵', '雲杜', '沙羨', '邾', '下雉', '蘄春', '鄂', '平春', '南新市', '安陸']);
    expect(HAN_LINGLING_COUNTY_NAMES).toEqual(['泉陵', '零陵', '營道', '營浦', '泠道', '洮陽', '都梁', '夫夷', '始安', '重安', '湘鄉', '昭陽', '烝陽']);
    expect(HAN_GUIYANG_COUNTY_NAMES).toEqual(['郴', '便', '耒陽', '陰山', '南平', '臨武', '桂陽', '含洭', '湞陽', '曲江', '漢寧']);
    expect(HAN_WULING_COUNTY_NAMES).toEqual(['臨沅', '漢壽', '孱陵', '零陽', '充', '沅陵', '辰陽', '酉陽', '遷陵', '鐔成', '沅南', '作唐']);
    expect(HAN_CHANGSHA_COUNTY_NAMES).toEqual(['臨湘', '攸', '荼陵', '安城', '酃', '湘南', '連道', '昭陵', '益陽', '下雋', '羅', '醴陵', '容陵']);
    for (const key of ['nanCommandery', 'jiangxia', 'lingling', 'guiyang', 'wuling', 'changsha'] as const) {
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('zh-hant');
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('7112');
    }
  });
});
