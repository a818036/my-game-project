import { describe, expect, it } from 'vitest';
import {
  HAN_CHEN_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_LIANG_COUNTY_NAMES,
  HAN_LU_COUNTY_NAMES,
  HAN_PEI_COUNTY_NAMES,
  HAN_RUNAN_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》豫州其餘郡國名錄', () => {
  it('依卷一一〇原文次序列出五郡國共八十二城', () => {
    const registers = [HAN_RUNAN_COUNTY_NAMES, HAN_LIANG_COUNTY_NAMES, HAN_PEI_COUNTY_NAMES, HAN_CHEN_COUNTY_NAMES, HAN_LU_COUNTY_NAMES];
    expect(registers.map(({ length }) => length)).toEqual([37, 9, 21, 9, 6]);
    expect(registers.flat()).toHaveLength(82);
    expect(HAN_RUNAN_COUNTY_NAMES).toEqual(['平輿', '新陽', '西平', '上蔡', '南頓', '汝陰', '汝陽', '新息', '北宜春', '㶏強', '灌陽', '期思', '陽安', '項', '西華', '細陽', '安城', '吳房', '鮦陽', '慎陽', '慎', '新蔡', '安陽', '富波', '宜祿', '郎陵', '弋陽', '召陵', '征羌', '思善', '宋', '襃信', '原鹿', '定潁', '固始', '山桑', '城父']);
    expect(HAN_LIANG_COUNTY_NAMES).toEqual(['下邑', '睢陽', '虞', '碭山', '蒙', '穀熟', '焉', '寧陵', '薄']);
    expect(HAN_PEI_COUNTY_NAMES).toEqual(['相', '蕭', '沛', '豐', '酇', '谷陽', '譙', '洨', '蘄', '銍', '鄲', '建平', '臨睢', '竹邑', '公丘', '龍亢', '向', '符離', '虹', '太丘', '杼秋']);
    expect(HAN_CHEN_COUNTY_NAMES).toEqual(['陳', '陽夏', '寧平', '苦', '柘', '新平', '扶樂', '武平', '長平']);
    expect(HAN_LU_COUNTY_NAMES).toEqual(['魯', '騶', '蕃', '薛', '卞', '汶陽']);
    expect(HAN_DIVISION_SOURCE_URLS.runan).toContain('/%E5%8D%B7110');
  });
});
