import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'sun-quan-orders-three-offices-appointments-by-four-standards-233';
const detail = '孫權命三署依四科選用郎吏';

describe('A813 嘉禾二年選任郎吏詔令', () => {
  it('保留裴注引《江表傳》的正月詔令與選任界線', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-438');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 233, endYear: 233, precision: 'year', introducedRevision: 434 });
    expect(content.source).toContain('裴注引《江表傳》');
    expect(content.source).toContain('嘉禾二年春記事下');
    expect(content.source).toContain('選三署皆依四科');
    expect(content.source).toContain('不得以虛辭相飾');
    expect(content.description).toContain('不推定實際候選人');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('嘉禾二年春正月');
  });

  it('232 年續玩跨年至 233 年時只結算一次', () => {
    const advanced = advancePhase4(createPhase4Model(232, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(advanced.year).toBe(233);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v433 遷移保留既有事件帳前綴且已到年份不回補', () => {
    const old = createPhase4Model(232, 1, [], 'phase4-scenario-433');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [233, 234]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-433');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 233 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
