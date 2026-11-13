import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'sun-quan-edict-relieves-arrears-234';
const detail = '孫權詔寬緩逋課';

describe('A817 嘉禾三年春正月寬緩逋課詔', () => {
  it('保留詔文、日期精度及執行結果界線', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-439');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 234, endYear: 234, precision: 'year', introducedRevision: 438 });
    expect(content.source).toContain('嘉禾三年春正月');
    expect(content.source).toContain('民困於役');
    expect(content.source).toContain('歳或不登');
    expect(content.source).toContain('其寬諸逋，勿復督課');
    expect(content.description).toContain('不推測欠課類別');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('春正月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不推定執行結果');
  });

  it('233 年續玩跨年至 234 年時只結算一次', () => {
    const advanced = advancePhase4(createPhase4Model(233, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(advanced.year).toBe(234);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('A818 區分嘉禾三年 234 年詔令與赤烏三年 240 年農政修城記事', () => {
    const jiahe = HISTORY_CONTENT.find(item => item.id === id)!;
    const chiwu = HISTORY_CONTENT.find(item => item.id === 'wu-agriculture-relief-and-fortifications-240')!;
    expect(jiahe).toMatchObject({ startYear: 234, endYear: 234 });
    expect(jiahe.source).toContain('嘉禾三年春正月');
    expect(jiahe.source).toContain('其寬諸逋，勿復督課');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('嘉禾三年春正月');
    expect(chiwu).toMatchObject({ startYear: 240, endYear: 240 });
    expect(chiwu.retired).toBeFalsy();
    expect(chiwu.source).toContain('赤烏三年');
    expect(chiwu.source).toContain('夏四月詔諸郡縣修治城郭');
    expect(chiwu.source).toContain('冬十一月民饑，詔開倉廩');
    expect(HISTORY_SOURCE_DATE_NOTES[chiwu.id]).toContain('赤烏三年');
    expect(jiahe.id).not.toBe(chiwu.id);
  });

  it('v437 遷移保留事件帳前綴、未到年份可觸發且不回補已過年份', () => {
    const old = createPhase4Model(233, 1, [], 'phase4-scenario-437');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [234, 235]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-437');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 234 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
