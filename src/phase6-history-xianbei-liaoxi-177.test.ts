import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'xianbei-raids-liaoxi-177';

describe('A584 補列 177 年鮮卑寇遼西記事', () => {
  it('依《後漢書》卷八獨立記錄遼西侵擾，不推演未載結果', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 177, endYear: 177, precision: 'year', introducedRevision: 250, lateSameYear: true });
    expect(node?.source).toContain('鮮卑寇遼西');
    expect(node?.description).toContain('不推演與三路出塞的關係');
    expect(node?.sourceDateNote).toContain('此句未標月份');
    expect(advancePhase4(createPhase4Model(176, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v249 舊存檔保留事件帳並可續玩；177 年存檔不回補', () => {
    const old = createPhase4Model(176, 1, [], 'phase4-scenario-249');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(177, 1, [], 'phase4-scenario-249'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 177 });
    expect(late.eventLedger.some((event) => event.detail.includes('鮮卑侵擾遼西'))).toBe(false);
  });
});
