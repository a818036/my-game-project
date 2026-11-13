import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'southern-palace-pingcheng-gate-arsenal-wall-collapse-177';

describe('A585 補列 177 年南宮與武庫建築自壞記事', () => {
  it('依《後漢書》卷八只記建築自壞，不推演成因或損害', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 177, endYear: 177, precision: 'year', introducedRevision: 251, lateSameYear: true });
    expect(node?.source).toContain('熹平六年二月');
    expect(node?.source).toContain('南宮平城門及武庫東垣屋自壞');
    expect(node?.description).toContain('不推定成因');
    expect(node?.sourceDateNote).toContain('只按 177 年級觸發');
    expect(advancePhase4(createPhase4Model(176, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v250 舊存檔保留事件帳並可續玩；177 年存檔不回補', () => {
    const old = createPhase4Model(176, 1, [], 'phase4-scenario-250');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(177, 1, [], 'phase4-scenario-250'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 177 });
    expect(late.eventLedger.some((event) => event.detail.includes('南宮平城門及武庫東垣屋自壞'))).toBe(false);
  });
});
