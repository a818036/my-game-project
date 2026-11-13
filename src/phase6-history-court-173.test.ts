import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'zong-ju-dies-yang-ci-sikong-173';

describe('A577 補列 173 年司空宗俱去世與楊賜任職記事', () => {
  it('依卷八保留記事次序，只按年級觸發且不改玩家官職', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 173, endYear: 173, precision: 'year', introducedRevision: 243, lateSameYear: true });
    expect(node?.source).toContain('丁丑，司空宗俱薨');
    expect(node?.source).toContain('以光祿勳楊賜為司空');
    expect(node?.description).toContain('不改動玩家官職');
    expect(node?.sourceDateNote).toContain('保留史文次序與干支');
    expect(advancePhase4(createPhase4Model(172, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v242 舊存檔保留事件帳並可續玩；173 年存檔不回補', () => {
    const old = createPhase4Model(172, 1, [], 'phase4-scenario-242');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(173, 1, [], 'phase4-scenario-242'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 173 });
    expect(late.eventLedger.some((event) => event.detail.includes('司空宗俱薨，楊賜為司空'))).toBe(false);
  });
});
