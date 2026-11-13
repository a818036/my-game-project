import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-general-xiahou-dun-dies-220';
const detail = '大將軍夏侯惇薨';

describe('A797 補列延康元年夏四月夏侯惇去世記事', () => {
  it('保留四月庚午原史日期註記，不推測死因或另建玩家死亡節點', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-423');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 418 });
    expect(content.source).toContain('延康元年夏四月');
    expect(content.source).toContain('庚午，大將軍夏侯惇薨');
    expect(content.source).toContain('不推測死因、享年');
    expect(content.description).toContain('不建立玩家死亡介入節點');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('夏四月庚午');
    expect(HISTORY_CONTENT.some(item => item.kind === 'death' && item.id === id)).toBe(false);
  });

  it('新局由 219 年跨年至 220 年時將死訊記事結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v417 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-417');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-417');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
