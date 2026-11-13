import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'p1', name: '示例人物甲', alive: true, location: '郡府', office: '縣令' }];
const id = 'liang-xi-defeats-kebineng-225';

describe('A783 梁習討破軻比能記事', () => {
  it('依原典只列 225 年，不將未繫月日的記事併入前後日期', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-432');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 225, endYear: 225, precision: 'year', introducedRevision: 404 });
    expect(content.source).toContain('并州刺史梁習討鮮卑軻比能，大破之');
    expect(content.source).toContain('未明確將梁習討破記事繫於月日');
    expect(content.description).toContain('不推演戰場位置');
  });

  it('新局跨年至 225 年形成獨立記事，保留原典內容及年級精度', () => {
    const state = advancePhase4(createPhase4Model(224, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.source?.includes('軻比能'));
    expect(event?.source).toContain('大破之');
    expect(event?.source).toContain('不補定月份');
  });

  it('v403 存檔保留事件帳前綴並可續玩；已到 225 年或晚年升版不回補', () => {
    const old = createPhase4Model(224, 1, persons, 'phase4-scenario-403');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [225, 226]) {
      const late = createPhase4Model(year, 1, persons, 'phase4-scenario-403');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.source?.includes('軻比能'))).toBe(false);
    }
  });
});
