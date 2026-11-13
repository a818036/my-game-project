import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'xianbei-raid-beidi-bingzhou-174';

describe('A579 補列 174 年鮮卑侵擾北地與并州記事', () => {
  it('依卷八保留十二月兩則記事及各自結果範圍，只按年級觸發', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 174, endYear: 174, precision: 'year', introducedRevision: 245, lateSameYear: true });
    expect(node?.source).toContain('十二月條記「鮮卑寇北地，北地太守夏育追擊破之」');
    expect(node?.source).toContain('「鮮卑又寇并州」');
    expect(node?.description).toContain('不把北地戰果延伸至并州');
    expect(node?.sourceDateNote).toContain('十二月原註');
    expect(advancePhase4(createPhase4Model(173, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v244 舊存檔保留事件帳並可續玩；174 年存檔不回補', () => {
    const old = createPhase4Model(173, 1, [], 'phase4-scenario-244');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(174, 1, [], 'phase4-scenario-244'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 174 });
    expect(late.eventLedger.some((event) => event.detail.includes('鮮卑寇北地'))).toBe(false);
  });
});
