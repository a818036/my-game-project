import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-mars-enters-taiwei-renxu-225';

describe('A786 黃初六年五月壬戌熒惑入太微', () => {
  it('並列兩書日期記載，只保存天象原文而不附會占驗', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-428');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 407 });
    expect(content.source).toContain('《三國志》卷二');
    expect(content.source).toContain('壬戌，熒惑入太微');
    expect(content.source).toContain('《宋書》卷二十三');
    expect(content.sourceDateNote).toContain('五月十六日壬戌');
    expect(content.description).toContain('不推定現代天體辨識');
    expect(content.description).not.toContain('預示');
  });

  it('新局跨年至 225 年形成天象記事', () => {
    const state = advancePhase4(createPhase4Model(224, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.detail.includes('熒惑入太微'));
    expect(event?.source).toContain('《三國志》卷二');
    expect(event?.source).toContain('《宋書》卷二十三');
  });

  it('v406 存檔保留事件帳前綴，已到年份升版不回補', () => {
    const old = createPhase4Model(224, 1, [], 'phase4-scenario-406');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-406');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('熒惑入太微'))).toBe(false);
    }
  });
});
