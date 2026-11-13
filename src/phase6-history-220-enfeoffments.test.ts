import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-prince-cao-pi-honors-ancestors-and-enfeoffs-cao-rui-220';
const detail = '魏王追尊皇祖太尉與夫人丁氏、封曹叡武德侯';

describe('A798 補列延康元年五月追尊與曹叡受封記事', () => {
  it('保留五月戊寅原文稱謂與記事範圍，不推定親屬姓名或封邑', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-425');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 419 });
    expect(content.source).toContain('延康元年五月戊寅');
    expect(content.source).toContain('皇祖太尉曰太王，夫人丁氏曰太王后，封王子叡為武德侯');
    expect(content.source).toContain('不另推定未載親屬姓名');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('五月戊寅');
  });

  it('新局由 219 年跨年至 220 年時將記事結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v418 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-418');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-418');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
