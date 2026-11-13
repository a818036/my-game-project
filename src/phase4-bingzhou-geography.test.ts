import { describe, expect, it } from 'vitest';
import {
  HAN_DINGXIANG_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_SHANGDANG_COUNTY_NAMES,
  HAN_SHANGJUN_COUNTY_NAMES,
  HAN_SHUOFANG_COUNTY_NAMES,
  HAN_TAIYUAN_COUNTY_NAMES,
  HAN_WUYUAN_COUNTY_NAMES,
  HAN_XIHE_COUNTY_NAMES,
  HAN_YANMEN_COUNTY_NAMES,
  HAN_YUNZHONG_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》并州刺史部名錄', () => {
  it('依卷一一三原文順序核對九郡共九十八項', () => {
    const registers = [
      HAN_SHANGDANG_COUNTY_NAMES,
      HAN_TAIYUAN_COUNTY_NAMES,
      HAN_SHANGJUN_COUNTY_NAMES,
      HAN_XIHE_COUNTY_NAMES,
      HAN_WUYUAN_COUNTY_NAMES,
      HAN_YUNZHONG_COUNTY_NAMES,
      HAN_DINGXIANG_COUNTY_NAMES,
      HAN_YANMEN_COUNTY_NAMES,
      HAN_SHUOFANG_COUNTY_NAMES,
    ];
    expect(registers.map((names) => names.length)).toEqual([13, 16, 10, 13, 10, 11, 5, 14, 6]);
    expect(registers.reduce((sum, names) => sum + names.length, 0)).toBe(98);
    expect(registers).toEqual([
      ['長子', '屯留', '銅鞮', '沾', '涅', '襄垣', '壺關', '泫氏', '高都', '潞', '猗氏', '陽阿', '穀遠'],
      ['晉陽', '界休', '榆次', '中都', '於離', '茲氏', '狼孟', '鄔', '盂', '平陶', '京陵', '陽曲', '大陵', '祁', '慮虒', '陽邑'],
      ['膚施', '白土', '漆垣', '奢延', '雕陰', '楨林', '定陽', '高奴', '龜茲屬國', '候官'],
      ['離石', '平定', '美稷', '樂街', '中陽', '皋狼', '平周', '平陸', '益蘭', '圜陰', '藺', '圜陽', '廣衍'],
      ['九原', '五原', '臨沃', '文國', '河陰', '武都', '宜梁', '曼柏', '成宜', '西安陽'],
      ['雲中', '咸陽', '箕陵', '沙陵', '沙南', '北輿', '武泉', '原陽', '定襄', '成樂', '武進'],
      ['善無', '桐過', '武成', '駱', '中陵'],
      ['陰館', '繁畤', '樓煩', '武州', '汪陶', '劇陽', '崞', '平城', '埒', '馬邑', '鹵城', '廣武', '原平', '彊陰'],
      ['臨戎', '三封', '朔方', '沃野', '廣牧', '大城'],
    ]);
    for (const key of ['shangdang', 'taiyuan', 'shangjun', 'xihe', 'wuyuan', 'yunzhong', 'dingxiang', 'yanmen', 'shuofang'] as const) {
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('7113');
    }
  });
});
