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
