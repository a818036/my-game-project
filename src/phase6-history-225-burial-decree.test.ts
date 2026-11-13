import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-decree-burial-for-fallen-soldiers-225';

describe('A789 黃初六年冬十一月收殮戰死士卒詔令', () => {
  it('只記錄原典所述未收殮士卒及詔令處置，不推演個案或成效', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-410');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 410 });
    expect(content.source).toContain('冬十一月癸卯');
    expect(content.source).toContain('給槥櫝殯斂，送致其家，官為設祭');
    expect(content.sourceDateNote).toContain('保留冬十一月及癸卯註記');
    expect(content.description).toContain('不擴寫為全體陣亡者');
    expect(content.description).not.toContain('孫權');
  });

  it('新局跨年至 225 年形成詔令記事', () => {
    const state = advancePhase4(createPhase4Model(224, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.some(event => event.detail.includes('送家設祭'))).toBe(true);
  });

  it('v409 舊存檔保留事件帳前綴，225 年及晚年升級不回補', () => {
    const old = createPhase4Model(224, 1, [], 'phase4-scenario-409');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-409');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('送家設祭'))).toBe(false);
    }
  });
});
