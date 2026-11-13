import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'cao-pi-enfeoffs-prince-jian-225';

describe('A788 黃初六年秋七月立皇子鑒為東武陽王', () => {
  it('依原文保留封爵及月份，不推測封地與人物背景', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-435');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 409 });
    expect(content.source).toContain('秋七月');
    expect(content.source).toContain('立皇子鑒為東武陽王');
    expect(content.sourceDateNote).toContain('保留月份，不補日');
    expect(content.description).toContain('不推演封地範圍');
    expect(content.description).not.toContain('孫權');
  });

  it('新局跨年至 225 年形成封爵記事', () => {
    const state = advancePhase4(createPhase4Model(224, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.some(event => event.detail.includes('立皇子鑒為東武陽王'))).toBe(true);
  });

  it('v408 存檔保留事件帳前綴，225 年及晚年升級不回補', () => {
    const old = createPhase4Model(224, 1, [], 'phase4-scenario-408');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-408');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('立皇子鑒為東武陽王'))).toBe(false);
    }
  });
});
