import { describe, expect, it } from 'vitest';
import { answerKnownSunQuanBiographyQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'wu-captures-pengqi-243';

describe('A256 孫權年表新增 243 年擒獲彭綺記事', () => {
  it('保留原文未具名的吳將為行動者，並將前一年起事與本年擒獲分清', () => {
    expect(HISTORY_CONTENT.find((node) => node.id === nodeId)).toMatchObject({ startYear: 243, endYear: 243, precision: 'year' });
    const advanced = advancePhase4(createPhase4Model(242, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(advanced.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.detail.includes('吳將擒獲鄱陽賊彭綺'));
    expect(event?.source).toContain('赤烏五年冬');
    expect(event?.source).toContain('赤烏六年春正月');
    expect(event?.source).toContain('諸將獲彭綺');
    expect(event?.detail).not.toContain('孫權親自出戰');
    expect(answerKnownSunQuanBiographyQuestion('請整理孫權七十一年生平年表')?.answer)
      .toContain('59 筆可考年級紀錄，分布於 46 個年次');
  });

  it('v133 存檔升至 v134 僅追加節點，跨至 243 年才觸發；同年及 244 年存檔不回補', () => {
    const old = createPhase4Model(242, 1, persons, 'phase4-scenario-133');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [243, 244]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-133'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 243 });
      expect(late.eventLedger.some((item) => item.detail.includes('吳將擒獲鄱陽賊彭綺'))).toBe(false);
    }
  });
});
