import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const eventId = 'sun-quan-inferred-birth-182';

describe('孫權推定出生年資料', () => {
  it('只保留享年推回的公元年，不虛構月日或日常細節', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === eventId);
    expect(content).toMatchObject({ startYear: 182, endYear: 182, precision: 'year', introducedIn: 'phase4-scenario-89' });
    expect(content?.source).toContain('《三國志》卷四十八');
    expect(content?.source).toContain('年七十一');
    expect(content?.source).toContain('未載出生月日');
    expect(content?.description).toContain('年級推定');
  });

  it('新局跨年至 182 年時觸發，旁白來源保留虛歲推定界線', () => {
    const next = advancePhase4(createPhase4Model(181, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(next.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const entry = next.eventLedger.find((item) => item.detail.includes('孫權推定出生年'));
    expect(entry?.source).toContain('年七十一');
    expect(entry?.source).toContain('約為 182 年');
    expect(entry?.detail).not.toMatch(/月\d|日\d/);
  });

  it('v88 存檔遷移只追加新節點並保留既有事件前綴；晚年存檔不回補', () => {
    const old = createPhase4Model(181, 1, persons, 'phase4-scenario-88');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(183, 1, persons, 'phase4-scenario-88'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 182 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權推定出生年'))).toBe(false);
  });
});

describe('200 年孫策去世與孫權承接事務', () => {
  const successionId = 'sun-ce-dies-sun-quan-inherits-200';

  it('依《三國志》保留年級精度與承接事務記錄，不補月日或私生活', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === successionId);
    expect(content).toMatchObject({ startYear: 200, endYear: 200, precision: 'year', introducedIn: 'phase4-scenario-91' });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('策薨，以事授權');
    expect(content?.source).toContain('未提供月日');
    expect(content?.description).toContain('不補寫死亡日');
  });

  it('新局跨年至 200 年時觸發；v90 舊存檔不回補 200 年史事', () => {
    const fresh = advancePhase4(createPhase4Model(199, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === successionId)?.status).toBe('triggered');
    expect(fresh.eventLedger.find((item) => item.detail.includes('孫策去世、孫權承接軍政事務'))?.source).toContain('策薨，以事授權');

    const old = createPhase4Model(199, 1, persons, 'phase4-scenario-90');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === successionId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === successionId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(201, 1, persons, 'phase4-scenario-90'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === successionId)).toMatchObject({ status: 'resolved', resolvedYear: 200 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫策去世、孫權承接軍政事務'))).toBe(false);
  });
});

describe('208 年孫權決議抗曹', () => {
  const decisionId = 'sun-quan-chooses-resistance-208';

  it('依《三國志》記錄孫權與周瑜、魯肅同意拒曹並遣軍合劉，不補私下獨白', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === decisionId);
    expect(content).toMatchObject({ startYear: 208, endYear: 208, precision: 'year', introducedIn: 'phase4-scenario-92', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('多數議者勸孫權迎降');
    expect(content?.source).toContain('意與權同');
    expect(content?.description).toContain('不把史料中的議論改寫成私下獨白');
  });

  it('新局跨年至 208 年觸發；v91 存檔保留前綴，已進入 208 年的舊存檔不回補', () => {
    const fresh = advancePhase4(createPhase4Model(207, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === decisionId)?.status).toBe('triggered');
    expect(fresh.eventLedger.find((item) => item.detail.includes('孫權決議抗曹、與劉備合兵'))?.source).toContain('《三國志》卷四十七');

    const old = createPhase4Model(207, 1, persons, 'phase4-scenario-91');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === decisionId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === decisionId)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(208, 1, persons, 'phase4-scenario-91'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === decisionId)).toMatchObject({ status: 'resolved', resolvedYear: 208 });
    expect(sameYear.nodes.find((node) => node.contentId === decisionId)?.evidence[0]).toContain('無法判定事件在目前年份內是否已發生');
    expect(sameYear.eventLedger.some((item) => item.detail.includes('孫權決議抗曹、與劉備合兵'))).toBe(false);

    const late = upgradePhase4Content(createPhase4Model(209, 1, persons, 'phase4-scenario-91'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === decisionId)).toMatchObject({ status: 'resolved', resolvedYear: 208 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權決議抗曹、與劉備合兵'))).toBe(false);
  });
});

describe('221 年孫權受魏封吳王', () => {
  const titleId = 'sun-quan-accepts-king-of-wu-title-221';

  it('依《三國志》與裴注記錄冊封及群臣議論，不推演外交動機', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === titleId);
    expect(content).toMatchObject({ startYear: 221, endYear: 221, precision: 'year', introducedIn: 'phase4-scenario-93', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('自公安都鄂、改名武昌');
    expect(content?.source).toContain('十一月魏文帝策命孫權為吳王');
    expect(content?.source).toContain('《江表傳》');
    expect(content?.description).toContain('不推演外交動機');
  });

  it('新局跨年至 221 年觸發；v92 存檔只追加遷移，不回補同年或晚年的事件', () => {
    const fresh = advancePhase4(createPhase4Model(220, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === titleId)?.status).toBe('triggered');
    expect(fresh.eventLedger.find((item) => item.detail.includes('孫權徙治武昌、受魏封吳王'))?.source).toContain('策命孫權為吳王');

    const old = createPhase4Model(220, 1, persons, 'phase4-scenario-92');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === titleId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === titleId)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(221, 1, persons, 'phase4-scenario-92'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === titleId)).toMatchObject({ status: 'resolved', resolvedYear: 221 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('孫權受魏封吳王'))).toBe(false);
    const late = upgradePhase4Content(createPhase4Model(222, 1, persons, 'phase4-scenario-92'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === titleId)).toMatchObject({ status: 'resolved', resolvedYear: 221 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權受魏封吳王'))).toBe(false);
  });
});

describe('222 年孫權遣使復通蜀漢', () => {
  it('記錄夷陵戰局後遣鄭泉使白帝，不臆造盟約內容', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === 'yiling-campaign-222');
    expect(content).toMatchObject({ startYear: 222, endYear: 222, precision: 'year' });
    expect(content?.source).toContain('卷四十七');
    expect(content?.source).toContain('十二月孫權遣太中大夫鄭泉聘劉備於白帝');
    expect(content?.source).toContain('始復通也');
    expect(content?.description).toContain('不推演完整戰役');
  });
});

describe('223 年孫權遣使弔劉備', () => {
  const condolenceId = 'sun-quan-sends-condolences-to-shu-223';

  it('依《吳書》裴注記錄孫權遣馮熙赴蜀弔喪', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === condolenceId);
    expect(content).toMatchObject({ startYear: 223, endYear: 223, precision: 'year', introducedIn: 'phase4-scenario-94', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《吳書》');
    expect(content?.source).toContain('孫權遣立信都尉馮熙聘蜀弔喪');
    expect(content?.description).toContain('不推演使團路線');
  });

  it('v93 年級存檔保留事件前綴、跨年至 223 年可觸發，晚載入不回補', () => {
    const old = createPhase4Model(222, 1, persons, 'phase4-scenario-93');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === condolenceId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === condolenceId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('孫權遣使弔劉備'))?.source).toContain('馮熙');

    const late = upgradePhase4Content(createPhase4Model(224, 1, persons, 'phase4-scenario-93'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === condolenceId)).toMatchObject({ status: 'resolved', resolvedYear: 223 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權遣使弔劉備'))).toBe(false);
  });
});

describe('224 年吳蜀互遣使重結盟好', () => {
  const allianceId = 'sun-quan-renews-alliance-with-shu-224';

  it('依《三國志》卷四十七記錄張溫、鄧芝往來，不虛構盟約條文', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === allianceId);
    expect(content).toMatchObject({ startYear: 224, endYear: 224, precision: 'year', introducedIn: 'phase4-scenario-95', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('張溫聘蜀');
    expect(content?.source).toContain('蜀遣鄧芝來聘');
    expect(content?.source).toContain('重結盟好');
    expect(content?.description).toContain('不推演使節談判細節');
  });

  it('v94 年級存檔保留事件前綴、跨年至 224 年觸發，晚載入不回補', () => {
    const old = createPhase4Model(223, 1, persons, 'phase4-scenario-94');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === allianceId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === allianceId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('孫權、劉禪互遣使重結盟好'))?.source).toContain('鄧芝');

    const late = upgradePhase4Content(createPhase4Model(225, 1, persons, 'phase4-scenario-94'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === allianceId)).toMatchObject({ status: 'resolved', resolvedYear: 224 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權、劉禪互遣使重結盟好'))).toBe(false);
  });
});

describe('226 年孫權征江夏石陽', () => {
  const campaignId = 'sun-quan-campaigns-against-shiyang-226';

  it('記錄圍石陽未克而還，不推演兵力與戰損', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === campaignId);
    expect(content).toMatchObject({ startYear: 226, endYear: 226, precision: 'year', introducedIn: 'phase4-scenario-96', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('卷四十七');
    expect(content?.source).toContain('征江夏、圍石陽，不克而還');
    expect(content?.description).toContain('不推演兵力、傷亡');
  });

  it('v95 年級存檔保留事件前綴並支援跨年觸發及晚載入不回補', () => {
    const old = createPhase4Model(225, 1, persons, 'phase4-scenario-95');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === campaignId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === campaignId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('孫權出兵圍江夏石陽'))?.source).toContain('不克而還');

    const late = upgradePhase4Content(createPhase4Model(227, 1, persons, 'phase4-scenario-95'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === campaignId)).toMatchObject({ status: 'resolved', resolvedYear: 226 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權出兵圍江夏石陽'))).toBe(false);
  });
});

describe('228 年孫權命陸遜破曹休於石亭', () => {
  const shitingId = 'sun-quan-shiting-campaign-228';

  it('記錄周魴誘敵及陸遜擊破曹休，不添加未載的兵力與戰損', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === shitingId);
    expect(content).toMatchObject({ startYear: 228, endYear: 228, precision: 'year', introducedIn: 'phase4-scenario-97', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('周魴偽叛誘曹休');
    expect(content?.source).toContain('孫權至皖口');
    expect(content?.source).toContain('陸遜督諸將大破曹休於石亭');
    expect(content?.description).toContain('不推演兵力、傷亡數');
  });

  it('v96 年級存檔保留前綴，跨年至 228 年觸發且晚載入不回補', () => {
    const old = createPhase4Model(227, 1, persons, 'phase4-scenario-96');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === shitingId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === shitingId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('周魴誘曹休'))?.source).toContain('石亭');

    const late = upgradePhase4Content(createPhase4Model(229, 1, persons, 'phase4-scenario-96'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === shitingId)).toMatchObject({ status: 'resolved', resolvedYear: 228 });
    expect(late.eventLedger.some((item) => item.detail.includes('周魴誘曹休'))).toBe(false);
  });
});

describe('234 年孫權進向合肥新城', () => {
  const campaignId = 'sun-quan-campaigns-at-hefei-234';

  it('依《三國志》按年級記錄進軍、分遣及魏廷東征，不臆造戰果', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === campaignId);
    expect(content).toMatchObject({ startYear: 234, endYear: 234, precision: 'year', introducedIn: 'phase4-scenario-98', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷三');
    expect(content?.source).toContain('陸議、孫韶');
    expect(content?.source).toContain('秋七月魏明帝親東征');
    expect(content?.description).toContain('不推演戰鬥');
    expect(content?.sourceDateNote).toContain('青龍二年五月');
    expect(content?.sourceDateNote).toContain('不映射為本遊戲 30 日制日期');
    expect(HISTORY_CONTENT.find((node) => node.id === 'yellow-turban-184')?.sourceDateNote).toContain('中平元年二月');
  });

  it('v97 年級存檔跨年至 234 年觸發；同年及晚載入不回補', () => {
    const old = createPhase4Model(233, 1, persons, 'phase4-scenario-97');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === campaignId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === campaignId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('孫權進向合肥新城'))?.source).toContain('五月');

    const sameYear = upgradePhase4Content(createPhase4Model(234, 1, persons, 'phase4-scenario-97'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === campaignId)).toMatchObject({ status: 'resolved', resolvedYear: 234 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('孫權進向合肥新城'))).toBe(false);
    const late = upgradePhase4Content(createPhase4Model(235, 1, persons, 'phase4-scenario-97'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === campaignId)).toMatchObject({ status: 'resolved', resolvedYear: 234 });
  });
});

describe('183 年北海、東萊、琅邪寒候記錄', () => {
  const coldId = 'winter-cold-eastern-commandries-183';

  it('按原典只記年級寒候，不推演每天氣候或生活細節', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === coldId);
    expect(content).toMatchObject({ startYear: 183, endYear: 183, precision: 'year', introducedIn: 'phase4-scenario-90' });
    expect(content?.source).toContain('《後漢書》卷一〇五');
    expect(content?.source).toContain('北海、東萊、琅邪');
    expect(content?.source).toContain('冰厚尺餘');
    expect(content?.description).toContain('不推演農損、疾病');
  });

  it('新局跨年至 183 年時觸發；v89 遷移不回補該年事件', () => {
    const fresh = advancePhase4(createPhase4Model(182, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === coldId)?.status).toBe('triggered');
    expect(fresh.eventLedger.find((item) => item.detail.includes('北海、東萊、琅邪冬寒記錄'))?.source).toContain('光和六年冬');

    const old = createPhase4Model(182, 1, persons, 'phase4-scenario-89');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === coldId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === coldId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(184, 1, persons, 'phase4-scenario-89'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === coldId)).toMatchObject({ status: 'resolved', resolvedYear: 183 });
    expect(late.eventLedger.some((item) => item.detail.includes('北海、東萊、琅邪冬寒記錄'))).toBe(false);
  });
});

describe('218 年孫權於庱亭射虎', () => {
  const huntId = 'sun-quan-hunts-tiger-lingting-218';

  it('依《三國志》記錄年級事件與十月來源註記，不擴寫日常', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === huntId);
    expect(content).toMatchObject({ startYear: 218, endYear: 218, precision: 'year', introducedIn: 'phase4-scenario-99', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('建安二十三年十月');
    expect(content?.source).toContain('孫權投以雙戟');
    expect(content?.source).toContain('隨從張世');
    expect(content?.description).toContain('不擴寫為日常狩獵習慣');
    expect(content?.sourceDateNote).toContain('原文不載月內日期');
  });

  it('新局跨年至 218 年觸發；v98 存檔保留事件前綴且不回補同年事件', () => {
    const old = createPhase4Model(217, 1, persons, 'phase4-scenario-98');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === huntId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === huntId)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('孫權於庱亭射虎'))?.source).toContain('投以雙戟');

    const sameYear = upgradePhase4Content(createPhase4Model(218, 1, persons, 'phase4-scenario-98'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === huntId)).toMatchObject({ status: 'resolved', resolvedYear: 218 });
    expect(sameYear.nodes.find((node) => node.contentId === huntId)?.evidence[0]).toContain('無法判定事件在目前年份內是否已發生');
    expect(sameYear.eventLedger.some((item) => item.detail.includes('孫權於庱亭射虎'))).toBe(false);

    const late = upgradePhase4Content(createPhase4Model(219, 1, persons, 'phase4-scenario-98'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === huntId)).toMatchObject({ status: 'resolved', resolvedYear: 218 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權於庱亭射虎'))).toBe(false);
  });
});

describe('203、207 年孫權征黃祖', () => {
  const campaigns = [
    { id: 'sun-quan-western-campaign-huang-zu-203', year: 203, detail: '孫權西征黃祖、破其舟軍' },
    { id: 'sun-quan-western-expedition-huang-zu-207', year: 207, detail: '孫權再征黃祖、擄其人民而還' },
  ];

  it('依《三國志》保留兩次不同年份的西征記載與原文限制', () => {
    for (const campaign of campaigns) {
      const content = HISTORY_CONTENT.find((node) => node.id === campaign.id);
      expect(content).toMatchObject({ startYear: campaign.year, endYear: campaign.year, precision: 'year', introducedIn: 'phase4-scenario-100' });
      expect(content?.source).toContain('《三國志》卷四十七');
      expect(content?.source).toContain(campaign.year === 203 ? '破其舟軍而未克城' : '虜其人民而還');
    }
    expect(HISTORY_CONTENT.find((node) => node.id === campaigns[0].id)?.description).toContain('不把未克城改寫為攻陷');
    expect(HISTORY_CONTENT.find((node) => node.id === campaigns[1].id)?.description).toContain('不推估人數');
  });

  it('v99、202 年存檔跨年至 203 觸發兩個新節點；晚載入不回補', () => {
    const old = createPhase4Model(202, 1, persons, 'phase4-scenario-99');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    for (const campaign of campaigns) expect(upgraded.nodes.find((node) => node.contentId === campaign.id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 5 * 360);
    for (const campaign of campaigns) expect(advanced.nodes.find((node) => node.contentId === campaign.id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes(campaigns[0].detail))?.source).toContain('山寇復動');
    expect(advanced.eventLedger.find((item) => item.detail.includes(campaigns[1].detail))?.source).toContain('虜其人民而還');

    const late = upgradePhase4Content(createPhase4Model(208, 1, persons, 'phase4-scenario-99'), PHASE4_CONTENT_VERSION);
    for (const campaign of campaigns) expect(late.nodes.find((node) => node.contentId === campaign.id)).toMatchObject({ status: 'resolved', resolvedYear: campaign.year });
    expect(late.eventLedger.some((item) => campaigns.some((campaign) => item.detail.includes(campaign.detail)))).toBe(false);

    for (const year of [203, 207]) {
      const sameYear = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-99'), PHASE4_CONTENT_VERSION);
      for (const campaign of campaigns.filter((item) => item.year <= year)) {
        expect(sameYear.nodes.find((node) => node.contentId === campaign.id)).toMatchObject({ status: 'resolved', resolvedYear: campaign.year });
      }
      expect(sameYear.eventLedger.some((item) => item.detail.includes(campaigns.find((campaign) => campaign.year === year)!.detail))).toBe(false);
    }
  });
});

describe('209 年孫權任命周瑜並受劉備表奏', () => {
  const id = 'sun-quan-appoints-zhou-yu-nanjun-209';

  it('依卷四十七記錄年級官職任命，不補任命日或政治交易', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === id);
    expect(content).toMatchObject({ startYear: 209, endYear: 209, precision: 'year', introducedIn: 'phase4-scenario-103', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('以周瑜為南郡太守');
    expect(content?.source).toContain('行車騎將軍、領徐州牧');
    expect(content?.description).toContain('不推演具體任命日期');
  });

  it('v102、208 年存檔跨年至 209 觸發並保留事件前綴；同年舊檔不回補', () => {
    const old = createPhase4Model(208, 1, persons, 'phase4-scenario-102');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.find((event) => event.detail.includes('孫權任周瑜為南郡太守'))?.source).toContain('劉備表孫權');

    const sameYear = upgradePhase4Content(createPhase4Model(209, 1, persons, 'phase4-scenario-102'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 209 });
    expect(sameYear.eventLedger.some((event) => event.detail.includes('孫權任周瑜為南郡太守'))).toBe(false);
  });
});

describe('孫權早年可考年級節點（202、211、212）', () => {
  it('卷四十七支持建安七年孫權之母吳氏去世，正確換算為 202 年', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === 'sun-quan-mother-dies-202');
    expect(content).toMatchObject({ startYear: 202, endYear: 202, precision: 'year', introducedIn: 'phase4-scenario-106', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('建安七年，權母吳氏薨');
    expect(content?.source).toContain('建安四年為公元 199 年');
    expect(content?.source).toContain('建安七年為公元 202 年');
    expect(content?.description).toContain('不補死亡日期、病因');
    expect(HISTORY_CONTENT.find((node) => node.id === 'sun-quan-mother-dies-201')?.retired).toBe(true);
  });

  it('卷四十七支持徙治秣陵及翌年築城改名備濡須，保留年級精度', () => {
    const move = HISTORY_CONTENT.find((node) => node.id === 'sun-quan-moves-governance-to-muling-211');
    const works = HISTORY_CONTENT.find((node) => node.id === 'sun-quan-builds-shitou-jianye-ruxu-212');
    expect(move).toMatchObject({ startYear: 211, endYear: 211, precision: 'year', introducedIn: 'phase4-scenario-104', sameYearMigrationIsLate: true });
    expect(move?.source).toContain('建安十六年「權徙治秣陵」');
    expect(works).toMatchObject({ startYear: 212, endYear: 212, precision: 'year', introducedIn: 'phase4-scenario-104', sameYearMigrationIsLate: true });
    expect(works?.source).toContain('明年，城石頭，改秣陵為建業');
    expect(works?.source).toContain('作濡須塢');
    expect(works?.description).toContain('不推演工程規模');
  });

  it('v103 舊存檔只追加節點、跨年觸發；同年遷移不回補', () => {
    const old = createPhase4Model(210, 1, persons, 'phase4-scenario-103');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === 'sun-quan-mother-dies-202')?.status).toBe('resolved');
    expect(upgraded.nodes.find((node) => node.contentId === 'sun-quan-moves-governance-to-muling-211')?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 720);
    expect(advanced.nodes.find((node) => node.contentId === 'sun-quan-moves-governance-to-muling-211')?.status).toBe('triggered');
    expect(advanced.nodes.find((node) => node.contentId === 'sun-quan-builds-shitou-jianye-ruxu-212')?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.some((event) => event.detail.includes('孫權徙治秣陵'))).toBe(true);
    expect(advanced.eventLedger.some((event) => event.detail.includes('築石頭城、改秣陵為建業並備濡須'))).toBe(true);

    const sameYear = upgradePhase4Content(createPhase4Model(211, 1, persons, 'phase4-scenario-103'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === 'sun-quan-mother-dies-202')).toMatchObject({ status: 'resolved', resolvedYear: 202 });
    expect(sameYear.nodes.find((node) => node.contentId === 'sun-quan-moves-governance-to-muling-211')).toMatchObject({ status: 'resolved', resolvedYear: 211 });
    expect(sameYear.eventLedger.some((event) => event.detail.includes('孫權徙治秣陵'))).toBe(false);
  });
});

describe('v105 存檔之建安七年勘誤遷移', () => {
  const legacyId='sun-quan-mother-dies-201',correctedId='sun-quan-mother-dies-202';

  it('停用舊 201 年節點、保留事件前綴並於 202 年觸發正確節點', () => {
    const old=createPhase4Model(200,1,persons,'phase4-scenario-105');
    const oldNode=old.nodes.find(node=>node.contentId===legacyId)!;
    oldNode.status='triggered';oldNode.resolvedYear=201;
    old.eventLedger.push({id:'old-201-record',day:360,year:201,month:1,dayOfMonth:1,type:'史實事件形成',detail:'孫權之母吳氏去世（舊版誤年）'});
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node=>node.contentId===legacyId)).toMatchObject({status:'triggered',resolvedYear:201});
    expect(upgraded.nodes.find(node=>node.contentId===legacyId)?.evidence.join('')).toContain('正確換算為 202 年');
    expect(upgraded.nodes.find(node=>node.contentId===correctedId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.at(-1)?.type).toBe('史實資料勘誤');
    const advanced=advancePhase4(upgraded,720);
    expect(advanced.nodes.find(node=>node.contentId===correctedId)?.status).toBe('triggered');
    expect(advanced.nodes.find(node=>node.contentId===legacyId)?.status).toBe('triggered');
    expect(advanced.eventLedger.some(event=>event.detail.includes('孫權之母吳氏去世')&&event.year===202)).toBe(true);
  });

  it('202 年當年載入的舊存檔不回補正確事件，只附勘誤說明', () => {
    const old=createPhase4Model(202,1,persons,'phase4-scenario-105');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node=>node.contentId===correctedId)).toMatchObject({status:'resolved',resolvedYear:202});
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.some(event=>event.type==='史實資料勘誤'&&event.year===202)).toBe(true);
    expect(upgraded.eventLedger.some(event=>event.type==='史實事件形成'&&event.detail.includes('孫權之母吳氏去世')&&event.year===202)).toBe(false);
  });
});

describe('214 年孫權合肥撤軍遭襲', () => {
  const id = 'sun-quan-hefei-bridge-retreat-214';

  it('保留合肥未克、撤軍遭襲及越津橋記載，不擴寫交戰細節', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === id);
    expect(content).toMatchObject({ startYear: 214, endYear: 214, precision: 'year', introducedIn: 'phase4-scenario-101', sameYearMigrationIsLate: true });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('卷十七〈魏書·張遼傳〉');
    expect(content?.source).toContain('繫年有異');
    expect(content?.sourceDateNote).toContain('建安二十年（215）');
    expect(content?.source).toContain('征合肥未下、撤軍遭張遼襲擊');
    expect(content?.source).toContain('張遼襲擊');
    expect(content?.source).toContain('乘駿馬越津橋');
    expect(content?.description).toContain('不推演未載的完整交戰');
  });

  it('v100、213 年存檔跨年至 214 觸發；同年及之後遷移不回補', () => {
    const old = createPhase4Model(213, 1, persons, 'phase4-scenario-100');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.detail.includes('合肥未克，孫權撤軍時遭張遼襲擊'))?.source).toContain('凌統、甘寧等護衛孫權');

    const sameYear = upgradePhase4Content(createPhase4Model(214, 1, persons, 'phase4-scenario-100'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 214 });
    const late = upgradePhase4Content(createPhase4Model(215, 1, persons, 'phase4-scenario-100'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 214 });
    expect(late.eventLedger.some((item) => item.detail.includes('合肥未克，孫權撤軍時遭張遼襲擊'))).toBe(false);
  });
});

describe('216–217 年孫權濡須與遣使', () => {
  const campaigns = [
    { id: 'sun-quan-ruxu-campaign-216', year: 216, fact: '至居巢並攻濡須', evidence: '建安二十一年冬' },
    { id: 'sun-quan-sends-envoy-to-cao-217', year: 217, fact: '徐詳赴曹操處請降', evidence: '建安二十二年春' },
  ];

  it('保留濡須攻守與外交先後的原典內容、年級精度及季節註記', () => {
    for (const item of campaigns) {
      const content = HISTORY_CONTENT.find((node) => node.id === item.id);
      expect(content).toMatchObject({ startYear: item.year, endYear: item.year, precision: 'year', introducedIn: 'phase4-scenario-102', sameYearMigrationIsLate: true });
      expect(content?.source).toContain('《三國志》卷四十七');
      expect(content?.source).toContain(item.fact);
      expect(content?.sourceDateNote).toContain(item.evidence);
    }
    expect(HISTORY_CONTENT.find((node) => node.id === campaigns[1].id)?.description).toContain('不代玩家作出外交選擇');
  });

  it('v101、215 年存檔跨年至 216、217 依序觸發，保存舊事件前綴', () => {
    const old = createPhase4Model(215, 1, persons, 'phase4-scenario-101');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    for (const item of campaigns) expect(upgraded.nodes.find((node) => node.contentId === item.id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 720);
    for (const item of campaigns) expect(advanced.nodes.find((node) => node.contentId === item.id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.find((event) => event.detail.includes('曹操進攻濡須、孫權與之相持'))?.source).toContain('建安二十一年冬');
    expect(advanced.eventLedger.find((event) => event.detail.includes('孫權遣徐詳赴曹操處請降'))?.source).toContain('曹操遣使回覆修好');
  });

  it('同年與較晚載入都不回補已過的歷史事件', () => {
    const at216 = upgradePhase4Content(createPhase4Model(216, 1, persons, 'phase4-scenario-101'), PHASE4_CONTENT_VERSION);
    expect(at216.nodes.find((node) => node.contentId === campaigns[0].id)).toMatchObject({ status: 'resolved', resolvedYear: 216 });
    expect(at216.nodes.find((node) => node.contentId === campaigns[1].id)?.status).toBe('pending');

    for (const year of [217, 218]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-101'), PHASE4_CONTENT_VERSION);
      for (const item of campaigns.filter((campaign) => campaign.year <= year)) {
        expect(late.nodes.find((node) => node.contentId === item.id)).toMatchObject({ status: 'resolved', resolvedYear: item.year });
      }
      expect(late.eventLedger.some((event) => campaigns.some((item) => event.detail.includes(item.year === 216 ? '曹操進攻濡須、孫權與之相持' : '孫權遣徐詳赴曹操處請降')))).toBe(false);
    }
  });
});

describe('246 年朱然征柤中史料校勘', () => {
  const id = 'zhu-ran-zha-zhong-246';

  it('在既有柤中節點並列兩史記載、保留年級精度與來源日期', () => {
    const content = HISTORY_CONTENT.find((node) => node.id === id);
    expect(content).toMatchObject({ startYear: 246, endYear: 246, precision: 'year', introducedIn: 'phase4-scenario-40', sourceDateNote: expect.stringContaining('春二月') });
    expect(content?.source).toContain('《三國志》卷四十七');
    expect(content?.source).toContain('斬獲千餘');
    expect(content?.source).toContain('《資治通鑑》卷七十五');
    expect(content?.source).toContain('殺掠數千');
    expect(content?.source).toContain('《宋書》卷二十八');
    expect(content?.description).toContain('不將兩種表述相加或互相換算');
    expect(HISTORY_CONTENT.filter((node) => node.startYear === 246 && node.carrier.includes('朱然'))).toHaveLength(1);
  });

  it('v130 舊存檔續玩仍只結算既有節點，升版不重複新增事件', () => {
    const before = createPhase4Model(245, 1, persons, 'phase4-scenario-130');
    const prefix = structuredClone(before.eventLedger);
    const upgraded = upgradePhase4Content(before, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'triggered', resolvedYear: 246 });
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter((event) => event.detail.includes('朱然征柤中'))).toHaveLength(1);
    expect(advanced.eventLedger.find((event) => event.detail.includes('朱然征柤中'))?.source).toContain('斬獲千餘');
    expect(advanced.eventLedger.find((event) => event.detail.includes('朱然征柤中'))?.source).toContain('殺掠數千');

    const alreadyRecorded = createPhase4Model(246, 1, persons, 'phase4-scenario-130');
    const recordedPrefix = structuredClone(alreadyRecorded.eventLedger);
    const migrated = upgradePhase4Content(alreadyRecorded, PHASE4_CONTENT_VERSION);
    expect(migrated.eventLedger).toEqual(recordedPrefix);
    expect(migrated.eventLedger.filter((event) => event.detail.includes('朱然征柤中'))).toHaveLength(1);
  });
});
