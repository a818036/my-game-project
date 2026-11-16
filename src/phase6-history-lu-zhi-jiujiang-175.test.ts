import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'lu-zhi-jiujiang-revolt-175';

describe('A581 補列 175 年九江起事與盧植任職記事', () => {
  it('依卷六十四保留年級與原文範圍，不推測群體細節或任期', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 175, endYear: 175, precision: 'year', introducedRevision: 247, lateSameYear: true });
    expect(node?.source).toContain('九江蠻反');
    expect(node?.source).toContain('蠻寇賓服');
    expect(node?.description).toContain('不推演族群身分');
    expect(node?.sourceDateNote).toContain('未另標月份');
    expect(advancePhase4(createPhase4Model(174, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v246 舊存檔保留事件帳並可續玩；175 年存檔不回補', () => {
    const old = createPhase4Model(174, 1, [], 'phase4-scenario-246');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(175, 1, [], 'phase4-scenario-246'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 175 });
    expect(late.eventLedger.some((event) => event.detail.includes('九江蠻反'))).toBe(false);
  });
});
