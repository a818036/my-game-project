import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'li-cheng-revolt-pacified-225';

describe('A787 黃初六年六月利成郡兵起事及討平', () => {
  it('依原文記錄起事、討平與赦免，不補戰況及個案', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-434');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 408 });
    expect(content.source).toContain('六月');
    expect(content.source).toContain('蔡方等以郡反，殺太守徐質');
    expect(content.source).toContain('任福、步兵校尉段昭');
    expect(content.source).toContain('皆赦其罪');
    expect(content.sourceDateNote).toContain('保留月份但不補日');
    expect(content.description).toContain('不推演兵力、戰況、傷亡');
  });

  it('新局跨年至 225 年形成記事，事件保留原文處置', () => {
    const state = advancePhase4(createPhase4Model(224, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.detail.includes('利成郡兵反'));
    expect(event?.source).toContain('殺太守徐質');
    expect(event?.source).toContain('皆赦其罪');
  });

  it('v407 存檔保留事件帳前綴，225 年及晚年升級不回補', () => {
    const old = createPhase4Model(224, 1, [], 'phase4-scenario-407');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-407');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('利成郡兵反'))).toBe(false);
    }
  });
});
