import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-cao-pi-orders-official-remonstrance-220';

describe('A792 延康元年秋七月魏王令百官盡規諫記事', () => {
  it('保留詔令日期與職責原文，不推定實際執行或政務效果', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-440');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 413 });
    expect(content.source).toContain('秋七月庚辰');
    expect(content.source).toContain('百官有司，其務以職盡規諫');
    expect(content.source).toContain('將率陳軍法，朝士明制度，牧守申政事，縉紳考六藝');
    expect(content.description).toContain('不推定實際執行、奏議內容或政務結果');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('延康元年秋七月庚辰');
  });

  it('新局跨年至 220 年時只形成一筆規諫詔令記事', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes('魏王令百官有司依職責盡規諫'))).toHaveLength(1);
  });

  it('v412 舊存檔保留事件帳前綴，跨年觸發一次且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-412');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes('魏王令百官有司依職責盡規諫'))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-412');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('魏王令百官有司依職責盡規諫'))).toBe(false);
    }
  });
});
