import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'li-xian-dismissed-duan-jiong-appointed-173';

describe('A578 補列 173 年太尉李咸免職與段熲任職', () => {
  it('依卷八保留三月與夏五月記事，只按年級觸發', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 173, endYear: 173, precision: 'year', introducedRevision: 244, lateSameYear: true });
    expect(node?.source).toContain('三月記「太尉李咸免」');
    expect(node?.source).toContain('夏五月記「以司隷校尉段熲為太尉」');
    expect(node?.description).toContain('不改動玩家官職');
    expect(node?.sourceDateNote).toContain('推斷日數間隔');
    expect(advancePhase4(createPhase4Model(172, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v243 舊存檔保留事件帳並可續玩；173 年存檔不回補', () => {
    const old = createPhase4Model(172, 1, [], 'phase4-scenario-243');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(173, 1, [], 'phase4-scenario-243'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 173 });
    expect(late.eventLedger.some((event) => event.detail.includes('太尉李咸免，段熲任太尉'))).toBe(false);
  });
});
