import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'p1', name: '示例人物甲', alive: true, location: '郡府', office: '縣令' }];
const id = 'wei-visits-zhaoling-and-tulao-canal-225';

describe('A782 黃初六年行幸召陵、通討虜渠記事', () => {
  it('只保留春三月年級記事，並明示乙巳日期不繫於本句', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-412');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 403 });
    expect(content.source).toContain('黃初六年春三月');
    expect(content.source).toContain('「行幸召陵，通討虜渠」');
    expect(content.sourceDateNote).toContain('不把乙巳日繫到本節點');
    expect(content.description).toContain('不推測渠道所在');
  });

  it('新局跨年至 225 年觸發，事件保留原文且不推演渠工細節', () => {
    const state = advancePhase4(createPhase4Model(224, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.source?.includes('通討虜渠'));
    expect(event?.source).toContain('「行幸召陵，通討虜渠」');
    expect(event?.source).toContain('不推定工程類型');
  });

  it('v402 舊存檔保留事件帳前綴並可續玩；225 年及晚年升版不回補', () => {
    const old = createPhase4Model(224, 1, persons, 'phase4-scenario-402');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, persons, 'phase4-scenario-402');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.source?.includes('通討虜渠'))).toBe(false);
    }
  });
});
