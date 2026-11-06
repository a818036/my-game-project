import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'lu-xun-pacifies-pengdan-revolt-237';

describe('A255 孫權年表新增 237 年彭旦起事平定記事', () => {
  it('保留陸遜為行動者，年級觸發並記錄史料中的前一年起事', () => {
    const advanced = advancePhase4(createPhase4Model(236, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(advanced.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.detail.includes('陸遜討平鄱陽彭旦等起事'));
    expect(event?.source).toContain('嘉禾五年記鄱陽賊彭旦等為亂');
    expect(event?.source).toContain('嘉禾六年二月');
    expect(event?.source).toContain('其年，皆破之');
    expect(event?.detail).not.toContain('孫權親征');
  });

  it('v132 的 236 年存檔升級後跨至 237 年觸發；237 年同年及更晚存檔不回補', () => {
    const old = createPhase4Model(236, 1, persons, 'phase4-scenario-132');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [237, 238]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-132'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 237 });
      expect(late.eventLedger.some((item) => item.detail.includes('陸遜討平鄱陽彭旦等起事'))).toBe(false);
    }
  });
});
