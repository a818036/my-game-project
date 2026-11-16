import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'bingzhou-raid-169';

describe('A573 建寧二年鮮卑侵擾并州記事', () => {
  it('只記卷八建寧二年所載侵擾，不外推戰事或控制變化', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 240, lateSameYear: true });
    expect(node?.source).toContain('建寧二年條記「鮮卑寇并州」');
    expect(node?.description).toContain('只記侵擾');
    expect(advancePhase4(createPhase4Model(168, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v239 舊存檔升級保留事件帳前綴並可續玩；169 年不回補', () => {
    const old = createPhase4Model(168, 1, [], 'phase4-scenario-239');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(169, 1, [], 'phase4-scenario-239'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 169 });
    expect(late.eventLedger.some((event) => event.detail.includes('鮮卑寇并州'))).toBe(false);
  });
});
