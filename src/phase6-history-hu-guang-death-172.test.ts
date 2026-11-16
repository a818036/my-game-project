import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'hu-guang-dies-172';

describe('A576 補列 172 年太傅胡廣去世記事', () => {
  it('依卷八保留春三月壬戌來源註記，只按年級觸發', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 172, endYear: 172, precision: 'year', introducedRevision: 242, lateSameYear: true });
    expect(node?.source).toContain('熹平元年春三月壬戌條記「太傅胡廣薨」');
    expect(node?.description).toContain('不改動玩家人物');
    expect(node?.sourceDateNote).toContain('春三月壬戌');
    expect(advancePhase4(createPhase4Model(171, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v241 舊存檔保留事件帳並可續玩；172 年存檔不回補', () => {
    const old = createPhase4Model(171, 1, [], 'phase4-scenario-241');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(172, 1, [], 'phase4-scenario-241'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 172 });
    expect(late.eventLedger.some((event) => event.detail.includes('172年太傅胡廣薨'))).toBe(false);
  });
});
