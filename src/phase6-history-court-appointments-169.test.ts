import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'taiwei-sikong-appointments-169';

describe('A572 建寧二年三公任免記事', () => {
  it('依卷八保留五月、六月記事次序及年級精度', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 239, lateSameYear: true });
    expect(node?.source).toContain('五月太尉聞人襲罷、司空許栩免；六月劉寵為太尉、許訓為司徒、劉囂為司空');
    expect(node?.description).toContain('不推論原因、任期');
    expect(advancePhase4(createPhase4Model(168, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v238 舊存檔保留事件帳並可續玩；169 年存檔不回補', () => {
    const old = createPhase4Model(168, 1, [], 'phase4-scenario-238');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(169, 1, [], 'phase4-scenario-238'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 169 });
    expect(late.eventLedger.some((event) => event.detail.includes('建寧二年太尉、司徒與司空任免'))).toBe(false);
  });
});
