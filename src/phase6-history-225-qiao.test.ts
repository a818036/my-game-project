import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'p1', name: '示例人物甲', alive: true, location: '郡府', office: '縣令' }];
const id = 'wei-visits-qiao-225';

describe('A785 黃初六年五月戊申行幸譙', () => {
  it('依原文保留月份與干支，不擴寫行幸目的與影響', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-406');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 406 });
    expect(content.source).toContain('五月戊申，幸譙');
    expect(content.sourceDateNote).toContain('五月戊申');
    expect(content.description).toContain('不補行程');
  });

  it('新局跨年至 225 年觸發行幸記事', () => {
    const state = advancePhase4(createPhase4Model(224, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.some(event => event.detail.includes('魏帝行幸譙'))).toBe(true);
  });

  it('v405 存檔保留事件帳前綴，225 年及晚年升版不回補', () => {
    const old = createPhase4Model(224, 1, persons, 'phase4-scenario-405');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, persons, 'phase4-scenario-405');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('魏帝行幸譙'))).toBe(false);
    }
  });
});
