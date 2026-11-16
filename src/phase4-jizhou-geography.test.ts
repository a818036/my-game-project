import { describe, expect, it } from 'vitest';
import {
  HAN_ANPING_COUNTY_NAMES,
  HAN_BOHAI_COUNTY_NAMES,
  HAN_CHANGSHAN_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_HEJIAN_COUNTY_NAMES,
  HAN_JULU_COUNTY_NAMES,
  HAN_QINGHE_COUNTY_NAMES,
  HAN_WEI_COUNTY_NAMES,
  HAN_ZHAO_COUNTY_NAMES,
  HAN_ZHONGSHAN_COUNTY_NAMES,
} from './phase4-geography';

describe('《後漢書》冀州郡國名錄', () => {
  it('按卷一一〇原文次序列出可見名目，並保留總數與轉錄不一致', () => {
    const registers = [HAN_WEI_COUNTY_NAMES, HAN_JULU_COUNTY_NAMES, HAN_CHANGSHAN_COUNTY_NAMES, HAN_ZHONGSHAN_COUNTY_NAMES, HAN_ANPING_COUNTY_NAMES, HAN_HEJIAN_COUNTY_NAMES, HAN_QINGHE_COUNTY_NAMES, HAN_ZHAO_COUNTY_NAMES, HAN_BOHAI_COUNTY_NAMES];
    expect(registers.map(({ length }) => length)).toEqual([15, 15, 13, 13, 13, 11, 7, 5, 8]);
    expect(registers.flat()).toHaveLength(100);
    expect(HAN_WEI_COUNTY_NAMES).toEqual(['鄴', '繁陽', '內黃', '魏', '元城', '黎陽', '陰安', '館陶', '清淵', '平恩', '沙', '斥丘', '武安', '曲梁', '梁期']);
    expect(HAN_JULU_COUNTY_NAMES).toEqual(['陶', '鉅鹿', '楊氏', '鄡', '下曲陽', '任', '南和', '廣平', '斥章', '廣宗', '曲周', '列人', '廣年', '平鄉', '南䜌']);
    expect(HAN_CHANGSHAN_COUNTY_NAMES).toEqual(['元氏', '高邑', '都鄉', '南行唐', '房子', '平棘', '欒城', '九門', '靈壽', '蒲吾', '井陘', '眞定', '上艾']);
    expect(HAN_ZHONGSHAN_COUNTY_NAMES).toEqual(['盧奴', '北平', '毋極', '新市', '望都', '唐', '安國', '安憙', '漢昌', '蠡吾', '上曲陽', '蒲陰', '廣昌']);
    expect(HAN_ANPING_COUNTY_NAMES).toEqual(['信都', '阜城', '南宮', '扶柳', '下博', '武邑', '觀津', '經', '堂陽', '武遂', '饒陽', '安平', '南深澤']);
    expect(HAN_HEJIAN_COUNTY_NAMES).toEqual(['樂成', '弓高', '易', '武垣', '中水', '鄚', '高陽', '文安', '束州', '成平', '東平舒']);
    expect(HAN_QINGHE_COUNTY_NAMES).toEqual(['甘陵', '貝丘', '東武城', '鄃', '靈', '繹幕', '廣川']);
    expect(HAN_ZHAO_COUNTY_NAMES).toEqual(['邯鄲', '易陽', '襄國', '柏人', '中丘']);
    expect(HAN_BOHAI_COUNTY_NAMES).toEqual(['南皮', '高城', '重合', '浮陽', '東光', '章武', '陽信', '脩']);
    expect(HAN_DIVISION_SOURCE_URLS.wei).toContain('/%E5%8D%B7110');
  });
});
