import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-prince-mourns-xiahou-dun-and-sun-sheng-critique-220';
const detail = '魏王為夏侯惇發哀';

describe('A807 裴注所載魏王發哀及孫盛禮議', () => {
  it('分清裴注所記發哀與孫盛評論，不另造確切日期', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-435');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 428 });
    expect(content.source).toContain('裴松之注引《魏書》');
    expect(content.source).toContain('王素服幸鄴東城門發哀');
    expect(content.source).toContain('孫盛另評');
    expect(content.source).toContain('不裁定禮議');
    expect(content.sourceDateNote).toContain('未另標月內日期');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('按 220 年級呈現');
    expect(content.description).toContain('不把評論當成原典正文');
  });

  it('新局由 219 年跨年至 220 年時只結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v427 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-427');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-427');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
