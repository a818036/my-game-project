import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-appoints-zheng-cheng-as-prince-ruis-tutor-220';
const detail = '任鄭稱為武德侯傅';

describe('A809 裴注所載任鄭稱為武德侯傅', () => {
  it('保留裴注引《魏略》來源，且不把五月戊寅套用於注中任命', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-440');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 430 });
    expect(content.source).toContain('裴松之注引《魏略》');
    expect(content.source).toContain('以侍中鄭稱為武德侯傅');
    expect(content.source).toContain('命其勉以經學輔侯、旦夕入侍');
    expect(content.source).toContain('不推定與前句五月戊寅之日相同');
    expect(content.sourceDateNote).toContain('不把正文戊寅套用於注文任命');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('按 220 年級呈現');
    expect(content.description).toContain('不補未載授職日期');
  });

  it('新局由 219 年跨年至 220 年時只結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v429 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-429');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-429');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
