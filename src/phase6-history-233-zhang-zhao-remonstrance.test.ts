import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wu-liaodong-envoy-execution-233';
const detail = '吳使冊封公孫淵，公孫淵轉而殺使';

describe('A811 補列張昭反對冊立公孫淵為燕王', () => {
  it('合併《吳主傳》出使記事與《張昭傳》進諫脈絡，不推定月內日期', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-436');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 233, endYear: 233, precision: 'year' });
    expect(content.source).toContain('卷四十七〈吳書·吳主傳〉');
    expect(content.source).toContain('卷五十二〈吳書·張昭傳〉');
    expect(content.source).toContain('張昭仍陳忠諫');
    expect(content.source).toContain('最後仍遣張彌、許晏');
    expect(content.description).toContain('張昭議論的月內日期');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('卷五十二張昭傳補述進諫');
  });

  it('v431 舊存檔保留事件帳前綴，跨年至 233 年仍只結算一次', () => {
    const old = createPhase4Model(232, 1, [], 'phase4-scenario-431');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.year).toBe(233);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('已到 233 年或更晚的舊存檔不會回補記事', () => {
    for (const year of [233, 234]) {
      const before = advancePhase4(createPhase4Model(232, 1, [], 'phase4-scenario-431'), (year - 232) * 360);
      const old = structuredClone(before);
      const prefix = structuredClone(old.eventLedger);
      const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'triggered', resolvedYear: 233 });
      expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
      expect(upgraded.eventLedger.slice(prefix.length).some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
