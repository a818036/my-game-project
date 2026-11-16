import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'liao-shi-revolt-lingling-guiyang-233';
const detail = '廖式起事並攻零陵、桂陽';

describe('A816 嘉禾二年冬十月廖式起事', () => {
  it('記錄原文所載人物、地名與跨年結果界線', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-440');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 233, endYear: 233, precision: 'year', introducedRevision: 437 });
    expect(content.source).toContain('嘉禾二年冬十月');
    expect(content.source).toContain('廖式殺臨賀太守嚴綱等');
    expect(content.source).toContain('與弟廖潛攻零陵、桂陽');
    expect(content.source).toContain('交州蒼梧、鬱林');
    expect(content.source).toContain('眾數萬人');
    expect(content.source).toContain('歲餘皆破');
    expect(content.description).toContain('不推定平定發生於 233 年');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('冬十月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('跨年後續結果');
  });

  it('232 年續玩跨年至 233 年時只結算一次', () => {
    const advanced = advancePhase4(createPhase4Model(232, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(advanced.year).toBe(233);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v436 遷移保留事件帳前綴、未到年份可觸發且不回補已過年份', () => {
    const old = createPhase4Model(232, 1, [], 'phase4-scenario-436');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [233, 234]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-436');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 233 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
