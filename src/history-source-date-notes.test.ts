import { describe, expect, it } from 'vitest';
import { HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES } from './phase4';

describe('原典日期註記與遊戲日期精度分離', () => {
  it('A187 孫權生平索引只主張可證的 71 個年級，不補造每日行程', () => {
    const birth = HISTORY_CONTENT.find((item) => item.id === 'sun-quan-inferred-birth-182');
    const death = HISTORY_CONTENT.find((item) => item.id === 'sun-quan-dies-sun-liang-succeeds-252');
    expect(birth).toMatchObject({ startYear: 182, endYear: 182, precision: 'year' });
    expect(death).toMatchObject({ startYear: 252, endYear: 252, precision: 'year' });
    expect(252 - 182 + 1).toBe(71);
    expect(birth?.source).toContain('年七十一');
    expect(birth?.source).toContain('約為 182 年');
    expect(death?.source).toContain('明年四月孫權去世');

    const milestones = HISTORY_CONTENT.filter((item) =>
      item.startYear >= 182 && item.endYear <= 252 && item.source.includes('孫權'),
    );
    expect(milestones.length).toBeGreaterThanOrEqual(30);
    expect(milestones.every((item) => item.precision === 'year' && item.source.length > 0)).toBe(true);
    expect(milestones.some((item) => item.sourceDateNote?.match(/\d{1,2}時(?:\d{1,2}刻)?/))).toBe(false);
    expect(birth?.description).toContain('不宣稱精確出生日期');
    expect(death?.description).toContain('不推演');
  });

  it('A186 年表史實節點覆蓋 183–280 年每一年', () => {
    const indexedNodes = HISTORY_CONTENT.filter((item) =>
      (item.kind === 'event' || item.kind === 'death')
      && !item.example
      && !item.retired
      && item.id !== 'sun-quan-inferred-birth-182',
    );
    const withinCatalogYears = indexedNodes.filter((event) => event.startYear >= 183 && event.endYear <= 280);
    expect(withinCatalogYears).toHaveLength(151);
    expect(withinCatalogYears.every((event) => event.precision === 'year' && Boolean(event.source))).toBe(true);
    const coveredYears = new Set<number>();
    for (const event of withinCatalogYears) {
      for (let year = event.startYear; year <= event.endYear; year += 1) {
        if (year >= 183 && year <= 280) coveredYears.add(year);
      }
    }
    const missingYears = Array.from({ length: 98 }, (_, index) => 183 + index)
      .filter((year) => !coveredYears.has(year));
    expect(missingYears).toEqual([]);
  });

  it('所有月份註記都對應來源明載的年級事件', () => {
    const evidence: Record<string, string[]> = {
      'winter-cold-eastern-commandries-183': ['光和六年冬大寒'],
      'yuan-shu-proclaims-emperor-195': ['興平二年冬條記袁術議稱帝'],
      'emperor-relocates-xu-196': ['建安元年秋車駕西出洛陽'],
      'zhao-ci-revolt-186': ['中平三年', '二月江夏兵', '六月荊州刺史'],
      'changsha-ou-xing-revolt-187': ['中平四年冬十月'],
      'yizhou-ma-xiang-revolt-188': ['中平五年六月'],
      'emperor-returns-east-195': ['興平二年七月'],
      'hou-yin-rebellion-218': ['建安二十三年冬十月'],
      'sun-quan-hunts-tiger-lingting-218': ['建安二十三年十月', '庱亭射虎', '投以雙戟'],
      'sun-quan-falls-ill-after-southern-suburb-sacrifice-251': ['太元元年冬十一月', '權祭南郊還，寢疾'],
      'sun-quan-accepts-king-of-wu-title-221': ['黃初二年', '十一月魏文帝策命'],
      'sun-quan-ruxu-campaign-216': ['建安二十一年冬曹操至居巢', '攻濡須'],
      'sun-quan-sends-envoy-to-cao-217': ['建安二十二年春', '徐詳', '請降', '修好'],
      'yiling-campaign-222': ['章武二年夏六月', '十二月孫權遣'],
      'sun-quan-renews-alliance-with-shu-224': ['黃武三年夏孫權遣輔義中郎將張溫聘蜀'],
      'dongxing-battle-252': ['孫亮建興元年冬魏軍圍東興'],
      'sima-shi-dies-sima-zhao-succeeds-255': ['正元二年正月司馬師征毌丘儉', '二月司馬昭受任大將軍'],
      'huainan-rebellion-255': ['正元二年正月毌丘儉', '閏月司馬師破文欽'],
      'sun-jun-dies-sun-chen-succeeds-256': ['太平元年九月孫峻去世'],
      'zhuge-dan-revolt-shouchun-wu-relief-257': ['甘露二年五月徵諸葛誕為司空'],
      'zhuge-dan-defeated-shouchun-falls-258': ['甘露三年三月司馬昭克壽春'],
      'sun-xiu-agriculture-tax-deliberation-259': ['永安二年三月孫休詔'],
      'sun-xiu-inspects-officials-and-grievances-261': ['永安四年秋八月'],
      'sun-xiu-empress-crown-prince-262': ['永安五年八月立皇后朱氏及太子'],
      'wu-relief-shu-ceased-after-surrender-263': ['永安六年冬十月蜀告魏來伐'],
      'shi-dan-revolt-sun-qian-266': ['寶鼎元年冬十月'],
      'sun-hao-builds-xianming-palace-267': ['寶鼎二年記夏六月', '冬十二月孫皓移居'],
      'che-jun-zhang-yong-executed-sun-kai-defects-276': ['天璽元年記會稽太守車浚', '秋八月'],
      'sun-shen-raids-zhang-chu-executed-277': ['天紀元年記夏口督孫慎'],
      'wu-enfeoffs-eleven-princes-278': ['天紀二年秋七月記立成紀'],
      'guo-ma-rebellion-279': ['天紀三年夏記郭馬反'],
      'sima-yi-feigns-illness-248': ['正始九年冬李勝出任荊州刺史'],
      'yi-province-surrender-214': ['建安十九年夏雒城破'],
      'cao-crowned-king-of-wei-216': ['建安二十一年五月記天子進公爵'],
      'zhugeliang-moves-to-hanzhong-227': ['建興五年春丞相亮出屯漢中'],
      'shu-yang-yi-demoted-jiang-wan-promoted-235': ['建興十三年春正月', '夏四月'],
      'wu-lu-dai-luling-revolt-response-235': ['嘉禾三年冬廬陵賊', '嘉禾四年夏承前記遣呂岱'],
      'wu-multi-front-campaign-241': ['赤烏四年記全琮略淮南', '六月吳軍還'],
      'shu-surrenders-263': ['景元四年冬劉禪詣鄧艾降'],
      'zhugeliang-south-campaign-225': ['建興三年春三月'],
      'cao-pi-death-cao-rui-accession-226': ['黃初七年五月'],
      'sun-quan-proclaims-emperor-229': ['黃龍元年夏四月'],
      'sun-quan-defeats-huang-zu-jiangxia-208': ['建安十三年記孫權春季再征黃祖'],
      'jianan-epidemic-217': ['去冬天降疫癘'],
      'wu-shu-alliance-partition-229': ['黃龍元年六月蜀使陳震來賀孫權踐位', '沒有提供盟約簽訂月日'],
      'wu-chancellor-succession-225': ['黃武四年夏五月丞相孫邵卒', '六月以太常顧雍為丞相'],
      'zhuge-liang-dies-234': ['青龍二年秋諸葛亮病卒'],
      'sun-quan-moves-capital-to-jianye-229': ['黃龍元年秋九月', '徵上大將軍陸遜輔太子孫登', '掌武昌留事'],
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
      'zhou-yu-captures-deng-long-206': ['建安十一年', '周瑜追擊並生擒鄧龍'],
      'gao-gan-defeat-206': ['建安十一年', '圍壺關三月'],
      'sun-quan-builds-shitou-jianye-ruxu-212': ['明年，城石頭', '作濡須塢'],
      'xun-yu-dies-212': ['建安十七年', '病留壽春、以憂薨'],
      'sun-quan-campaigns-against-shiyang-226': ['征江夏、圍石陽'],
      'wu-xiangyang-jiangxia-campaign-236': ['嘉禾五年', '攻襄陽'],
      'taoxi-campaign-247': ['正始八年', '戰於洮西'],
    };

    expect(Object.keys(HISTORY_SOURCE_DATE_NOTES)).toHaveLength(76);
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
    expect(HISTORY_SOURCE_DATE_NOTES['gao-gan-defeat-206']).toContain('不是漢曆三月');
    expect(HISTORY_SOURCE_DATE_NOTES['sun-quan-campaigns-against-shiyang-226']).toContain('黃初五年秋七月');
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

  it('A225 核實集中與節點內原史日期註記總數', () => {
    const inlineNotes = HISTORY_CONTENT.filter((item) => item.sourceDateNote).map((item) => item.id);
    expect(inlineNotes).toEqual([
      'yellow-turban-184',
      'zhu-ran-zha-zhong-246',
      'sun-quan-falls-ill-after-southern-suburb-sacrifice-251',
      'sun-quan-hefei-bridge-retreat-214',
      'sun-quan-captures-wancheng-214',
      'sun-quan-ruxu-campaign-216',
      'sun-quan-sends-envoy-to-cao-217',
      'sun-quan-hunts-tiger-lingting-218',
      'guan-yu-falls-219',
      'sun-quan-declines-imperial-title-221',
      'sun-quan-capital-reports-sweet-dew-221',
      'sun-quan-builds-wuchang-and-warns-generals-221',
      'wei-three-front-campaign-and-dongkou-storm-222',
      'wu-adopts-qianxiang-calendar-223',
      'wei-morning-raid-ruxu-defeated-223',
      'wu-captures-jin-zong-at-qichun-223',
      'sun-quan-campaigns-at-hefei-234',
      'sun-quan-moves-capital-to-jianye-229',
    ]);
    const uniqueNotedEvents = new Set([...Object.keys(HISTORY_SOURCE_DATE_NOTES), ...inlineNotes]);
    expect(Object.keys(HISTORY_SOURCE_DATE_NOTES)).toHaveLength(76);
    expect(uniqueNotedEvents.size).toBe(88);
  });
});
