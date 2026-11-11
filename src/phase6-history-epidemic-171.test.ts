import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import type { GameState } from './engine';

const id = 'epidemic-lingdi-171';

describe('A575 建寧四年疫病記事', () => {
  it('依卷八保留三月記事，不推演疫病或救療後果', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 171, endYear: 171, precision: 'year', introducedRevision: 241, lateSameYear: true });
    expect(node?.source).toContain('建寧四年三月記「大疫，使中謁者巡行致醫藥」');
    expect(node?.sourceDateNote).toContain('漢曆三月');
    expect(node?.description).toContain('不推演疫病傳播');
    expect(advancePhase4(createPhase4Model(170, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');

    const state = { world: { year: 170 } } as unknown as GameState;
    const answer = answerKnownHistoricalEventQuestion('西元 171 年有哪些史實事件？', state);
    expect(answer?.answer).toContain('建寧四年春三月大疫');
    expect(answer?.answer).toContain('使中謁者巡行致醫藥');
    expect(answer?.answer).toContain('《後漢書》卷八');
    expect(state.world.year).toBe(170);
  });

  it('v240 舊存檔保留事件帳並可續玩；171 年存檔不回補', () => {
    const old = createPhase4Model(170, 1, [], 'phase4-scenario-240');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(171, 1, [], 'phase4-scenario-240'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 171 });
    expect(late.eventLedger.some((event) => event.detail.includes('建寧四年春三月大疫'))).toBe(false);
  });
});
