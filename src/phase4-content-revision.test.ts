import { describe, expect, it } from 'vitest';
import { createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';

describe('歷史內容的精簡修訂標記', () => {
  it('保留最新內容的版本門檻，並拒絕不支援的版本字串', () => {
    const newest = HISTORY_CONTENT.filter((item) => item.introducedRevision === 237);
    expect(newest.length).toBeGreaterThan(0);

    const prior = createPhase4Model(168, 1, [], 'phase4-scenario-236');
    const v237 = createPhase4Model(168, 1, [], 'phase4-scenario-237');
    const current = createPhase4Model(168, 1, [], PHASE4_CONTENT_VERSION);
    const unknown = createPhase4Model(168, 1, [], 'phase4-scenario-unknown');

    for (const item of newest) {
      expect(prior.nodes.some((node) => node.contentId === item.id)).toBe(false);
      expect(v237.nodes.some((node) => node.contentId === item.id)).toBe(true);
      expect(current.nodes.some((node) => node.contentId === item.id)).toBe(true);
      expect(unknown.nodes.some((node) => node.contentId === item.id)).toBe(false);
    }
    expect(v237.nodes.some((node) => node.contentId === 'jiangxia-danyang-revolts-179')).toBe(true);
    expect(current.nodes.some((node) => node.contentId === 'jiangxia-danyang-revolts-179')).toBe(false);
  });
});
