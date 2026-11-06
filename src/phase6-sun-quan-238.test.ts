import { describe, expect, it } from 'vitest';
import { answerKnownSunQuanBiographyQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'wu-lu-dai-pacifies-luling-238';

describe('A254 孫權年表新增 238 年廬陵記事', () => {
  it('按年觸發 238 年記事，並在年表問答中列出而不補作私人日常', () => {
    expect(HISTORY_CONTENT.find((node) => node.id === nodeId)).toMatchObject({ startYear: 238, endYear: 238, precision: 'year' });
    const advanced = advancePhase4(createPhase4Model(237, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(advanced.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.detail.includes('呂岱討平廬陵賊'));
    expect(event?.source).toContain('赤烏元年夏');
    expect(event?.source).toContain('還陸口');
    const biography = answerKnownSunQuanBiographyQuestion('請整理孫權七十一年生平年表');
    expect(biography?.answer).toContain('59 筆可考年級紀錄，分布於 46 個年次');
    expect(biography?.answer).toContain('238年・呂岱討平廬陵賊，事畢還屯陸口');
    expect(biography?.answer).toContain('日常時辰也不能用模擬補成史實');
  });

  it('v132 存檔升至 v133 只追加節點，跨至 238 年才觸發；239 年存檔不回補', () => {
    const old = createPhase4Model(237, 1, persons, 'phase4-scenario-132');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(239, 1, persons, 'phase4-scenario-132'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 238 });
    expect(late.eventLedger.some((item) => item.detail.includes('呂岱討平廬陵賊'))).toBe(false);

    const sameYear = upgradePhase4Content(createPhase4Model(238, 1, persons, 'phase4-scenario-132'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 238 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('呂岱討平廬陵賊'))).toBe(false);
  });
});
