import { describe, expect, it } from 'vitest';
import {
  HAN_BA_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_GUANGHAN_COUNTY_NAMES,
  HAN_GUANGHAN_DEPENDENT_COUNTY_NAMES,
  HAN_HANZHONG_COUNTY_NAMES,
  HAN_QIANWEI_COUNTY_NAMES,
  HAN_QIANWEI_DEPENDENT_COUNTY_NAMES,
  HAN_SHU_COUNTY_NAMES,
  HAN_SHU_DEPENDENT_COUNTY_NAMES,
  HAN_YIZHOU_COUNTY_NAMES,
  HAN_YONGCHANG_COUNTY_NAMES,
  HAN_YUESUI_COUNTY_NAMES,
  HAN_ZANGKE_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》益州刺史部名錄', () => {
  it('依卷一一三原文順序核對十二郡國屬國共一百一十八項', () => {
    const registers = [
      HAN_HANZHONG_COUNTY_NAMES,
      HAN_BA_COUNTY_NAMES,
      HAN_GUANGHAN_COUNTY_NAMES,
      HAN_SHU_COUNTY_NAMES,
      HAN_QIANWEI_COUNTY_NAMES,
      HAN_ZANGKE_COUNTY_NAMES,
      HAN_YUESUI_COUNTY_NAMES,
      HAN_YIZHOU_COUNTY_NAMES,
      HAN_YONGCHANG_COUNTY_NAMES,
      HAN_GUANGHAN_DEPENDENT_COUNTY_NAMES,
      HAN_SHU_DEPENDENT_COUNTY_NAMES,
      HAN_QIANWEI_DEPENDENT_COUNTY_NAMES,
    ];
    expect(registers.map((names) => names.length)).toEqual([9, 14, 11, 11, 9, 16, 14, 17, 8, 3, 4, 2]);
    expect(registers.reduce((sum, names) => sum + names.length, 0)).toBe(118);
    expect(registers).toEqual([
      ['南鄭', '成固', '西城', '襃中', '沔陽', '安陽', '錫', '上庸', '房陵'],
      ['江州', '宕渠', '朐忍', '閬中', '魚復', '臨江', '枳', '涪陵', '墊江', '安漢', '平都', '充國', '宣漢', '漢昌'],
      ['雒', '新都', '綿竹', '什邡', '涪', '梓潼', '白水', '葭萌', '郪', '廣漢', '德陽'],
      ['成都', '郫', '江原', '繁', '廣都', '臨邛', '湔氐道', '汶江道', '八陵（原文；校勘疑為蠶陵）', '廣柔', '綿虒道'],
      ['武陽', '資中', '牛鞞', '南安', '僰道', '江陽', '符節', '南廣', '漢安'],
      ['故且蘭', '平夷', '鄨', '毋斂', '談指', '夜郎', '同並', '談稾', '漏江', '毋單', '宛溫', '鐔封', '漏臥', '句町', '進乘', '西隨'],
      ['邛都', '遂久', '靈關道', '台登', '青蛉', '卑水', '三縫', '會無', '定莋', '闡', '蘇示', '大莋', '莋秦', '姑復'],
      ['滇池', '勝休', '俞元', '律高', '賁古', '毋棳', '建伶', '穀昌', '牧靡', '味', '昆澤', '同瀨', '同勞', '雙柏', '連然', '梇棟', '秦臧'],
      ['不韋', '巂唐', '比蘇', '楪榆', '邪龍', '雲南', '哀牢', '博南'],
      ['陰平道', '甸氐道', '剛氐道'],
      ['漢嘉', '嚴道', '徙', '旄牛'],
      ['朱提', '漢陽'],
    ]);
    for (const key of ['hanzhong', 'ba', 'guanghan', 'shu', 'qianwei', 'zangke', 'yuesui', 'yizhou', 'yongchang', 'guanghanDependent', 'shuDependent', 'qianweiDependent'] as const) {
      expect(HAN_DIVISION_SOURCE_URLS[key]).toContain('7113');
    }
  });
});
