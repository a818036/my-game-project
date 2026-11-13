import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-cao-pi-grants-grain-silk-and-orders-inspection-220';
const detail = '魏王賜諸侯王將相粟帛並遣使巡行郡國';

describe('A795 補列延康元年二月賜粟帛與巡行舉罪記事', () => {
  it('保留辛亥詔令原文，不擴張受賜範圍或推定執行結果', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-436');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 416 });
    expect(content.source).toContain('延康元年二月辛亥');
    expect(content.source).toContain('賜諸侯王將相已下大將粟萬斛，帛千匹，金銀各有差等');
    expect(content.source).toContain('遣使者循行郡國，有違理掊克暴虐者，舉其罪');
    expect(content.source).toContain('不推定實際發放');
    expect(content.description).toContain('不推測清單所指官員層級');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('二月辛亥');
  });

  it('新局由 219 年跨年至 220 年時結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v415 舊存檔保留事件帳前綴，只在跨年時觸發且不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-415');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-415');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
