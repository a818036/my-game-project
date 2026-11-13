import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-cao-pi-southern-expedition-220';

describe('A791 延康元年魏王六月治兵南征記事', () => {
  it('保留辛亥治兵、庚午南征，不補目標或戰果', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-427');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 412 });
    expect(content.source).toContain('辛亥，治兵於東郊');
    expect(content.source).toContain('庚午，遂南征');
    expect(content.description).toContain('未在此處交代目標');
    expect(content.description).toContain('不與 222 年的南征記事混為一談');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('延康元年六月辛亥治兵於東郊');
  });

  it('新局跨年至 220 年時只形成一筆南征記事', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes('魏王於東郊治兵後南征'))).toHaveLength(1);
  });

  it('v411 舊存檔保留事件帳前綴，跨年觸發一次且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-411');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes('魏王於東郊治兵後南征'))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-411');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('魏王於東郊治兵後南征'))).toBe(false);
    }
  });
});
