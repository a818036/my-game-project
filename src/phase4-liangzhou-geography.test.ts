import { describe, expect, it } from 'vitest';
import {
  HAN_ANDING_COUNTY_NAMES,
  HAN_BEIDI_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_DUNHUANG_COUNTY_NAMES,
  HAN_HANYANG_COUNTY_NAMES,
  HAN_JINCHENG_COUNTY_NAMES,
  HAN_JIUQUAN_COUNTY_NAMES,
  HAN_JUYAN_DEPENDENT_COUNTY_NAMES,
  HAN_LONGXI_COUNTY_NAMES,
  HAN_WUDU_COUNTY_NAMES,
  HAN_WUWEI_COUNTY_NAMES,
  HAN_ZHANGYE_COUNTY_NAMES,
  HAN_ZHANGYE_DEPENDENT_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》涼州刺史部名錄', () => {
  it('依卷一一三原文順序核對十二郡屬國共九十八項', () => {
    const registers = [
      HAN_LONGXI_COUNTY_NAMES,
      HAN_HANYANG_COUNTY_NAMES,
      HAN_WUDU_COUNTY_NAMES,
      HAN_JINCHENG_COUNTY_NAMES,
      HAN_ANDING_COUNTY_NAMES,
      HAN_BEIDI_COUNTY_NAMES,
      HAN_WUWEI_COUNTY_NAMES,
      HAN_ZHANGYE_COUNTY_NAMES,
      HAN_JIUQUAN_COUNTY_NAMES,
      HAN_DUNHUANG_COUNTY_NAMES,
      HAN_ZHANGYE_DEPENDENT_COUNTY_NAMES,
      HAN_JUYAN_DEPENDENT_COUNTY_NAMES,
    ];
    expect(registers.map((names) => names.length)).toEqual([11, 13, 7, 10, 8, 6, 14, 8, 9, 6, 5, 1]);
    expect(registers.reduce((sum, names) => sum + names.length, 0)).toBe(98);
    expect(registers).toEqual([
      ['狄道', '安故', '氐道', '首陽', '大夏', '襄武', '臨洮', '枹罕', '白石', '鄣', '河關'],
      ['冀', '望恆', '阿陽', '略陽', '勇士', '成紀', '隴', '豲道', '蘭干', '平襄', '顯親', '上邽', '西'],
      ['下辨', '武都道', '上祿', '故道', '河池', '沮', '羌道'],
      ['允吾', '浩亹', '令居', '枝陽', '金城', '榆中', '臨羌', '破羌', '安夷', '允街'],
      ['臨涇', '高平', '朝那', '烏枝', '三水', '陰盤', '彭陽', '鶉觚'],
      ['富平', '泥陽', '弋居', '廉', '參（原文轉錄缺字）', '靈州'],
      ['姑臧', '張掖', '武威', '休屠', '揟次', '鸞鳥', '朴（原文轉錄缺字）', '媼圍', '宣威', '倉松', '鸇陰', '租厲', '顯美', '左騎'],
      ['觻得', '昭武', '刪丹', '氐池', '屋蘭', '日勒', '驪靬', '番和'],
      ['福祿', '表氏', '樂涫', '玉門', '會水', '沙頭', '安彌', '乾齊', '延壽'],
      ['敦煌', '冥安', '效穀', '拼泉', '廣至', '龍勒'],
      ['候官', '左騎', '千人', '司馬官', '千人官'],
      ['居延'],
    ]);
    for (const key of ['longxi', 'hanyang', 'wudu', 'jincheng', 'anding', 'beidi', 'wuwei', 'zhangye', 'jiuquan', 'dunhuang', 'zhangyeDependent', 'juyanDependent'] as const) {
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('7113');
    }
  });
});
