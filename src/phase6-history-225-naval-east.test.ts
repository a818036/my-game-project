import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'p1', name: '示例人物甲', alive: true, location: '郡府', office: '縣令' }];
const id = 'wei-naval-expedition-east-225';

describe('A784 曹丕為舟師東征記事', () => {
  it('保留辛未干支，不補定月份或推定已實際出航', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-434');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 405 });
    expect(content.source).toContain('辛未，帝為舟師東征');
    expect(content.source).toContain('不另推定月份');
    expect(content.sourceDateNote).toContain('只保留辛未干支');
    expect(content.description).toContain('不推演艦船數量');
  });

  it('新局跨年至 225 年觸發，記錄原文而不虛構航程與戰果', () => {
    const state = advancePhase4(createPhase4Model(224, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.detail.includes('曹丕為舟師東征'));
    expect(event?.source).toContain('五月戊申，幸譙');
    expect(event?.source).toContain('不把「為舟師」擴寫成實際出航');
  });

  it('v404 存檔保留事件帳前綴並可續玩；升版時已到或晚於 225 年不回補', () => {
    const old = createPhase4Model(224, 1, persons, 'phase4-scenario-404');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, persons, 'phase4-scenario-404');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('曹丕為舟師東征'))).toBe(false);
    }
  });
});
