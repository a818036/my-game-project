import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-decree-burial-for-fallen-soldiers-220';

describe('A789 延康元年冬十一月收殮從軍死亡士卒詔令', () => {
  it('只記錄原典所述未收殮士卒及詔令處置，不推演個案或成效', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-432');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 410 });
    expect(content.source).toContain('延康元年冬十一月癸卯');
    expect(content.source).toContain('給槥櫝殯斂，送致其家，官為設祭');
    expect(content.sourceDateNote).toContain('保留冬十一月及癸卯註記');
    expect(content.description).toContain('不擴寫為全體陣亡者');
    expect(content.description).not.toContain('孫權');
  });

  it('新局跨年至 220 年形成詔令記事', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.some(event => event.detail.includes('送家設祭'))).toBe(true);
  });

  it('v409 舊存檔保留事件帳前綴，225 年及晚年升級不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-409');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-409');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('送家設祭'))).toBe(false);
    }
  });
});
