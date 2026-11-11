import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

describe('歷史內容的精簡修訂標記', () => {
  it('保留最新內容的版本門檻，並拒絕不支援的版本字串', () => {
    const newest = HISTORY_CONTENT.filter((item) => item.introducedRevision === 245);
    expect(newest.length).toBeGreaterThan(0);

    const v237 = createPhase4Model(168, 1, [], 'phase4-scenario-237');
    const prior = createPhase4Model(168, 1, [], 'phase4-scenario-244');
    const v238 = createPhase4Model(168, 1, [], 'phase4-scenario-238');
    const current = createPhase4Model(168, 1, [], PHASE4_CONTENT_VERSION);
    const unknown = createPhase4Model(168, 1, [], 'phase4-scenario-unknown');

    for (const item of newest) {
      expect(prior.nodes.some((node) => node.contentId === item.id)).toBe(false);
      expect(current.nodes.some((node) => node.contentId === item.id)).toBe(true);
      expect(unknown.nodes.some((node) => node.contentId === item.id)).toBe(false);
    }
    expect(v237.nodes.some((node) => node.contentId === 'jiangxia-danyang-revolts-179')).toBe(true);
    expect(v238.nodes.some((node) => node.contentId === 'jiangxia-danyang-revolts-179')).toBe(false);
    expect(current.nodes.some((node) => node.contentId === 'jiangxia-danyang-revolts-179')).toBe(false);
    const lateV237 = upgradePhase4Content(createPhase4Model(178, 1, [], 'phase4-scenario-237'), PHASE4_CONTENT_VERSION);
    expect(lateV237.nodes.find((node) => node.contentId === 'jiangxia-uprising-169')).toMatchObject({ status: 'resolved', resolvedYear: 169 });
  });

  it('省略與節點同名的單一原因時仍沿用相同因果結算', () => {
    const defaultModel = createPhase4Model(168, 1, [], PHASE4_CONTENT_VERSION);
    const defaultCause = defaultModel.nodes.find((node) => node.contentId === 'bingzhou-raid-169');
    expect(defaultCause?.actualCause).toEqual(['bingzhou-raid-169']);

    defaultModel.causes = defaultModel.causes.filter((cause) => cause !== 'bingzhou-raid-169');
    const defaultResolved = advancePhase4(defaultModel, 360);
    expect(defaultResolved.nodes.find((node) => node.contentId === 'bingzhou-raid-169')?.status).toBe('cancelled');

    const explicitModel = createPhase4Model(183, 1, [], PHASE4_CONTENT_VERSION);
    const explicitCause = explicitModel.nodes.find((node) => node.contentId === 'zhu-jun-captures-wancheng-184');
    expect(explicitCause?.actualCause).toEqual(['zhu-jun-wancheng-campaign-184']);
    explicitModel.causes = explicitModel.causes.filter((cause) => cause !== 'zhu-jun-wancheng-campaign-184');

    const resolved = advancePhase4(explicitModel, 360);
    expect(resolved.nodes.find((node) => node.contentId === 'zhu-jun-captures-wancheng-184')?.status).toBe('cancelled');
  });
});
