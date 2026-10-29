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
