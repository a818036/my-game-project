import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-cao-pi-reduces-barrier-and-park-taxes-220';
const detail = '魏王令除池籞之禁、輕關津之稅';

describe('A794 補列延康元年魏王減輕關津與池籞禁令', () => {
  it('保留庚戌令原文與日期精度，不換算稅率或推定執行效果', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-420');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 415 });
    expect(content.source).toContain('延康元年二月條引《魏書》');
    expect(content.source).toContain('庚戌令');
    expect(content.source).toContain('其除池籞之禁，輕關津之稅，皆復什一');
    expect(content.source).toContain('不換算「什一」為現代稅率');
    expect(content.description).toContain('不推定實際執行');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('庚戌令');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不將「什一」換算為現代稅率');
  });

  it('新局由 219 年跨年至 220 年時結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v414 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-414');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-414');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
