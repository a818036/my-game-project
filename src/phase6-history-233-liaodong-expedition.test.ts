import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wu-envoys-attack-wei-garrisons-in-liaodong-233';
const detail = '吳使赴遼東攻魏守將，俘獲男女';

describe('A814 嘉禾二年三月吳使赴遼東', () => {
  it('只記錄來源明載行動並保留月份與年級精度', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-435');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 233, endYear: 233, precision: 'year', introducedRevision: 435 });
    expect(content.source).toContain('嘉禾二年三月');
    expect(content.source).toContain('遣使者羊衜、鄭冑');
    expect(content.source).toContain('孫怡');
    expect(content.source).toContain('擊魏守將張持、高慮');
    expect(content.source).toContain('虜得男女');
    expect(content.source).toContain('未載所獲人數、傷亡');
    expect(content.description).toContain('與張彌等冊立公孫淵的使團分開');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('嘉禾二年三月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不換算日數');
  });

  it('232 年續玩跨年至 233 年時結算一次', () => {
    const advanced = advancePhase4(createPhase4Model(232, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(advanced.year).toBe(233);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v434 遷移保留事件帳前綴、未到年份可觸發且不回補已過年份', () => {
    const old = createPhase4Model(232, 1, [], 'phase4-scenario-434');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [233, 234]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-434');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 233 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});


