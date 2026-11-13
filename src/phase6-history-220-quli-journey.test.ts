import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const transitionId = 'wei-han-transition-220';

describe('A790 補列漢魏禪代年表中的曲蠡記事', () => {
  it('保留丙午行至曲蠡原文，不推測今址或行程路線', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-432');
    const content = HISTORY_CONTENT.find(item => item.id === transitionId)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year' });
    expect(content.source).toContain('丙午，行至曲蠡');
    expect(HISTORY_SOURCE_DATE_NOTES[transitionId]).toContain('延康元年冬十一月癸卯令後記丙午');
    expect(content.description).toContain('不推測曲蠡今址');
    expect(content.description).not.toContain('孫權');
  });

  it('新局跨年至 220 年時於禪代記事保留曲蠡原文', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === transitionId)?.status).toBe('triggered');
    const event = state.eventLedger.find(item => item.detail.includes('漢魏禪代'));
    expect(event?.source).toContain('丙午，行至曲蠡');
  });

  it('v410 舊存檔升級保留事件帳前綴，不重複追加禪代記事', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-410');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === transitionId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === transitionId)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(item => item.detail.includes('漢魏禪代'))).toHaveLength(1);
  });
});
