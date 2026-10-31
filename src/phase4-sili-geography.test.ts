import { describe, expect, it } from 'vitest';
import {
  HAN_DIVISION_SOURCE_URLS,
  HAN_HEDONG_COUNTY_NAMES,
  HAN_HENEI_COUNTY_NAMES,
  HAN_HONGNONG_COUNTY_NAMES,
  HAN_JINGZHAO_COUNTY_NAMES,
  HAN_YOUFUFENG_COUNTY_NAMES,
  HAN_ZUOFENGYI_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》司隸其餘六郡名錄', () => {
  it('與既有河南尹名錄合成七郡，依卷一〇九原文核對其餘八十五城', () => {
    const registers = [HAN_HENEI_COUNTY_NAMES, HAN_HEDONG_COUNTY_NAMES, HAN_HONGNONG_COUNTY_NAMES, HAN_JINGZHAO_COUNTY_NAMES, HAN_ZUOFENGYI_COUNTY_NAMES, HAN_YOUFUFENG_COUNTY_NAMES];
    expect(registers.map(({ length }) => length)).toEqual([18, 20, 9, 10, 13, 15]);
    expect(registers.flat()).toHaveLength(85);
    expect(HAN_HENEI_COUNTY_NAMES).toEqual(['懷', '河陽', '軹', '波', '沁水', '野王', '溫', '州', '平睾', '山陽', '武德', '獲嘉', '脩武', '共', '汲', '朝歌', '蕩陰', '林慮']);
    expect(HAN_HEDONG_COUNTY_NAMES).toEqual(['安邑', '楊', '平陽', '臨汾', '汾陰', '蒲板', '大陽', '解', '皮氏', '聞喜', '絳', '永安', '河北', '猗氏', '垣', '襄陵', '北屈', '蒲子', '濩澤', '端氏']);
    expect(HAN_HONGNONG_COUNTY_NAMES).toEqual(['弘農', '陝', '黽池', '新安', '宜陽', '陸渾', '盧氏', '湖', '華陰']);
    expect(HAN_JINGZHAO_COUNTY_NAMES).toEqual(['長安', '霸陵', '杜陵', '鄭', '新豐', '藍田', '長陵', '商', '上雒', '陽陵']);
    expect(HAN_ZUOFENGYI_COUNTY_NAMES).toEqual(['高陵', '池陽', '雲陽', '祋祤', '頻陽', '萬年', '蓮勺', '重泉', '臨晉', '郃陽', '夏陽', '衙', '粟邑']);
    expect(HAN_YOUFUFENG_COUNTY_NAMES).toEqual(['槐里', '安陵', '平陵', '茂陵', '鄠', '郿', '武功', '陳倉', '汧', '渝麋', '雍', '栒邑', '美陽', '漆', '杜陽']);
    expect(HAN_DIVISION_SOURCE_URLS.henei).toContain('/%E5%8D%B7109');
  });
});
