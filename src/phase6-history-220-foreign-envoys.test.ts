import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-court-envoys-from-northwest-and-western-regions-220';
const detail = '濊貃、扶餘單于、焉耆、于闐各遣使奉獻';

describe('A800 補列延康元年遣使記事並釐清干支界線', () => {
  it('保留三月記事段與原典稱謂，不把任命句的己卯套用到遣使句', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-431');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 421 });
    expect(content.source).toContain('延康元年三月記事段');
    expect(content.source).toContain('濊貃、扶餘單于、焉耆、于闐王皆各遣使奉獻');
    expect(content.source).toContain('不把前句己卯套用於本句');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).not.toContain('本句己卯');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('三月記事段');
    expect(content.description).toContain('不推測使者身分、貢物內容');
  });

  it('新局由 219 年跨年至 220 年時只結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v420 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-420');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-420');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
