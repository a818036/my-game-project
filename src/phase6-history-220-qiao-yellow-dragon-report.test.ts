import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'qiao-reports-yellow-dragon-again-220';
const detail = '譙縣再報黃龍、殷登以昔言相驗';

describe('A804 補列譙縣三月黃龍記事及殷登言', () => {
  it('保留三月註記、記事與注文界線，不把祥瑞傳聞寫成實證', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-431');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ kind: 'event', startYear: 220, endYear: 220, precision: 'year', introducedRevision: 425 });
    expect(content.source).toContain('延康元年條承前載熹平五年黃龍見譙');
    expect(content.source).toContain('至四十五年仍有殷登在世');
    expect(content.source).toContain('續記「三月，黃龍見譙」');
    expect(content.source).toContain('殷登聞之曰「單颺之言，其驗茲乎！」');
    expect(content.source).toContain('注文引《魏書》另載');
    expect(content.sourceDateNote).toContain('保留原史三月註記與文本層次');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不判定祥瑞真偽');
    expect(content.description).toContain('不判定祥瑞為已核實事實');
  });

  it('新局由 219 年跨年至 220 年時只結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v424 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-424');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-424');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
