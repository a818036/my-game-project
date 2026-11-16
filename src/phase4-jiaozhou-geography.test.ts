import { describe, expect, it } from 'vitest';
import {
  HAN_CANGWU_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_HEPU_COUNTY_NAMES,
  HAN_JIAOZHI_COUNTY_NAMES,
  HAN_JIUZHEN_COUNTY_NAMES,
  HAN_NANHAI_COUNTY_NAMES,
  HAN_RINAN_COUNTY_NAMES,
  HAN_YULIN_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》交州郡縣名錄', () => {
  it('依卷一一三原文次序列出七郡共五十六項，並保留轉錄缺字註記', () => {
    const registers = [
      HAN_NANHAI_COUNTY_NAMES,
      HAN_CANGWU_COUNTY_NAMES,
      HAN_YULIN_COUNTY_NAMES,
      HAN_HEPU_COUNTY_NAMES,
      HAN_JIAOZHI_COUNTY_NAMES,
      HAN_JIUZHEN_COUNTY_NAMES,
      HAN_RINAN_COUNTY_NAMES,
    ];
    expect(registers.map(({ length }) => length)).toEqual([7, 11, 11, 5, 12, 5, 5]);
    expect(registers.flat()).toHaveLength(56);
    expect(HAN_NANHAI_COUNTY_NAMES).toEqual(['番禺', '博羅', '中宿', '龍川', '四會', '揭陽', '增城']);
    expect(HAN_CANGWU_COUNTY_NAMES).toEqual(['廣信', '謝沐', '高要', '封陽', '臨賀', '端谿', '馮乘', '富川', '荔浦', '猛陵', '鄣平']);
    expect(HAN_YULIN_COUNTY_NAMES).toEqual(['布山', '安廣', '阿林', '廣郁', '中溜', '桂林', '潭中', '臨塵', '定周', '增食', '領方']);
    expect(HAN_HEPU_COUNTY_NAMES).toEqual(['合浦', '徐聞', '高涼', '臨元', '朱崖']);
    expect(HAN_JIAOZHI_COUNTY_NAMES).toEqual(['龍編', '羸𨻻', '安定', '苟漏', '麋泠', '曲陽', '北帶', '稽徐', '西於', '朱（原文轉錄缺字）', '封谿', '望海']);
    expect(HAN_JIUZHEN_COUNTY_NAMES).toEqual(['胥浦', '居風', '咸懽', '無功', '無編']);
    expect(HAN_RINAN_COUNTY_NAMES).toEqual(['西卷', '朱吾', '盧容', '象林', '比景']);
    expect(HAN_DIVISION_SOURCE_URLS.nanhai).toContain('/%E5%8D%B7113');
  });
});
