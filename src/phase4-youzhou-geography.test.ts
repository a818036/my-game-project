import { describe, expect, it } from 'vitest';
import {
  HAN_DAI_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_GUANGYANG_COUNTY_NAMES,
  HAN_LELANG_COUNTY_NAMES,
  HAN_LIAODONG_COUNTY_NAMES,
  HAN_LIAODONG_DEPENDENT_COUNTY_NAMES,
  HAN_LIAOXI_COUNTY_NAMES,
  HAN_SHANGGU_COUNTY_NAMES,
  HAN_XUANTU_COUNTY_NAMES,
  HAN_YOUBEIPING_COUNTY_NAMES,
  HAN_YUYANG_COUNTY_NAMES,
  HAN_ZHUO_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》幽州刺史部名錄', () => {
  it('依卷一一三原文順序核對十一郡國共九十項', () => {
    const registers = [
      HAN_ZHUO_COUNTY_NAMES,
      HAN_GUANGYANG_COUNTY_NAMES,
      HAN_DAI_COUNTY_NAMES,
      HAN_SHANGGU_COUNTY_NAMES,
      HAN_YUYANG_COUNTY_NAMES,
      HAN_YOUBEIPING_COUNTY_NAMES,
      HAN_LIAOXI_COUNTY_NAMES,
      HAN_LIAODONG_COUNTY_NAMES,
      HAN_XUANTU_COUNTY_NAMES,
      HAN_LELANG_COUNTY_NAMES,
      HAN_LIAODONG_DEPENDENT_COUNTY_NAMES,
    ];
    expect(registers.map((names) => names.length)).toEqual([7, 5, 11, 8, 9, 4, 5, 11, 6, 18, 6]);
    expect(registers.reduce((sum, names) => sum + names.length, 0)).toBe(90);
    expect(registers).toEqual([
      ['涿', '逎', '故安', '范陽', '良鄉', '北新城', '方城'],
      ['薊', '廣陽', '昌平', '軍都', '安次'],
      ['高柳', '桑乾', '道人', '當城', '馬城', '班氏', '狋氏', '北平邑', '東安陽', '平舒', '代'],
      ['沮陽', '潘', '甯', '廣甯', '居庸', '雊瞀', '涿鹿', '下落'],
      ['漁陽', '狐奴', '潞', '雍奴', '泉州', '平谷', '安樂', '傂奚', '獷平'],
      ['土垠', '徐無', '俊靡', '無終'],
      ['陽樂', '海陽', '令支', '肥如', '臨渝'],
      ['襄平', '新昌', '無慮', '望平', '候城', '安市', '平郭', '西安平', '汶', '番汗', '沓氏'],
      ['高句驪', '西蓋馬', '上殷台', '高顯', '候城', '遼陽'],
      ['朝鮮', '𧦦邯', '浿水', '含資', '占蟬', '遂城', '增地', '帶方', '駟望', '海冥', '列口', '長岑', '屯有', '昭明', '鏤方', '提奚', '渾彌', '樂都'],
      ['昌遼', '賓徒', '徒河', '無慮', '險瀆', '房'],
    ]);
    for (const key of ['zhuo', 'guangyang', 'dai', 'shanggu', 'yuyang', 'youbeiping', 'liaoxi', 'liaodong', 'xuantu', 'lelang', 'liaodongDependent'] as const) {
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('7113');
    }
  });
});
