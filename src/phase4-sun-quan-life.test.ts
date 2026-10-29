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
