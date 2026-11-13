import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'sun-quan-court-debate-on-suburban-sacrifice-232';
const detail = '群臣議請郊祀，孫權答辯其地與典據';

describe('A812 群臣議請郊祀及孫權答辯', () => {
  it('分清《江表傳》奏議與裴注《志林》評論，只保留冬季精度', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-436');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 232, endYear: 232, precision: 'year', introducedRevision: 433 });
    expect(content.source).toContain('嘉禾元年冬十月');
    expect(content.source).toContain('裴注引《江表傳》');
    expect(content.source).toContain('裴注另引《志林》');
    expect(content.source).toContain('原文明記「是冬」');
    expect(content.description).toContain('不推定祭祀實際舉行');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('只保留冬季');
  });

  it('231 年續玩跨年至 232 年時只結算一次', () => {
    const advanced = advancePhase4(createPhase4Model(231, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(advanced.year).toBe(232);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v432 遷移保留事件帳前綴且已到年份不回補', () => {
    const old = createPhase4Model(231, 1, [], 'phase4-scenario-432');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [232, 233]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-432');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 232 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
