import { describe, expect, it } from 'vitest';
import { HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES } from './phase4';

describe('原典日期註記與遊戲日期精度分離', () => {
  it('所有月份註記都對應來源明載的年級事件', () => {
    const evidence: Record<string, string[]> = {
      'zhao-ci-revolt-186': ['中平三年', '二月江夏兵', '六月荊州刺史'],
      'changsha-ou-xing-revolt-187': ['中平四年冬十月'],
      'yizhou-ma-xiang-revolt-188': ['中平五年六月'],
      'emperor-returns-east-195': ['興平二年七月'],
      'hou-yin-rebellion-218': ['建安二十三年冬十月'],
      'sun-quan-accepts-king-of-wu-title-221': ['黃初二年', '十一月魏文帝策命'],
      'yiling-campaign-222': ['章武二年夏六月', '十二月孫權遣'],
      'zhugeliang-south-campaign-225': ['建興三年春三月'],
      'cao-pi-death-cao-rui-accession-226': ['黃初七年五月'],
      'sun-quan-proclaims-emperor-229': ['黃龍元年夏四月'],
      'sun-quan-shiting-campaign-228': ['黃武七年', '秋八月'],
      'pan-jun-wuling-expedition-231': ['黃龍三年春二月'],
      'wu-liaodong-envoy-mission-232': ['嘉禾元年記三月', '九月魏將田豫', '冬十月公孫淵'],
      'wu-liaodong-envoy-execution-233': ['嘉禾二年記三月'],
      'sun-he-crown-prince-and-zhuya-campaign-242': ['赤烏五年記正月', '四月禁進獻御物', '七月遣聶友', '八月立孫霸'],
      'zhuge-ke-lu-an-campaign-243': ['赤烏六年記春正月'],
      'lu-xun-dies-245': ['赤烏八年記春二月'],
      'wu-jurong-canal-public-works-245': ['赤烏八年記八月'],
      'zhu-ran-zha-zhong-246': ['正始七年二月'],
      'sima-yi-dies-251': ['嘉平三年秋七月'],
      'sun-quan-dies-sun-liang-succeeds-252': ['太元元年冬', '明年四月孫權去世'],
      'zhuge-ke-xincheng-campaign-253': ['建興二年春', '夏四月圍新城', '秋八月引軍還'],
      'zhuge-ke-assassinated-253': ['建興二年冬十月'],
      'cao-fang-deposed-cao-mao-succeeds-254': ['嘉平六年秋九月', '十月曹髦即皇帝位'],
      'sun-liang-deposed-sun-xiu-succeeds-258': ['太平三年秋九月', '十月琅邪王孫休即位'],
      'wu-agriculture-relief-and-fortifications-240': ['赤烏三年記正月', '夏四月詔', '冬十一月民饑'],
      'yuan-shao-dies-202': ['建安七年五月卒'],
      'yuan-tan-defeat-205': ['建安十年春正月'],
      'ruxu-campaign-213': ['建安十八年正月'],
      'cao-enfeoffed-duke-of-wei-213': ['建安十八年五月'],
      'wei-succession-239': ['景初三年正月丁亥'],
    };

    expect(Object.keys(HISTORY_SOURCE_DATE_NOTES)).toHaveLength(31);
    expect(Object.keys(HISTORY_SOURCE_DATE_NOTES).sort()).toEqual(Object.keys(evidence).sort());
    for (const [id, sourcePhrases] of Object.entries(evidence)) {
      const content = HISTORY_CONTENT.find((item) => item.id === id);
      expect(content, `${id} must resolve to a historical node`).toBeDefined();
      expect(content?.precision, `${id} keeps annual game triggering`).toBe('year');
      expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('原史紀年');
      for (const phrase of sourcePhrases) {
        expect(content?.source, `${id} source must contain ${phrase}`).toContain(phrase);
      }
    }
  });

  it('年級遊戲精度與帶原史月份的顯示註記並存，不推算時辰', () => {
    for (const id of ['yellow-turban-184', 'sun-quan-campaigns-at-hefei-234']) {
      const content = HISTORY_CONTENT.find((item) => item.id === id);
      expect(content).toMatchObject({ precision: 'year' });
      expect(content?.sourceDateNote).toContain('原史');
      expect(content?.sourceDateNote).toMatch(/不映射|不換算/);
    }
    for (const note of Object.values(HISTORY_SOURCE_DATE_NOTES)) {
      expect(note).not.toMatch(/\d{1,2}時(?:\d{1,2}刻)?/);
    }
  });
});
