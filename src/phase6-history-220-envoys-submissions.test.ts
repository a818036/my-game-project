import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-court-envoys-and-submissions-220';

describe('A793 補列 220 年使者、歸降與內附記事', () => {
  it('保留本紀原文及年級精度，不補細部日期、歸降對象或因果', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-421');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 414 });
    expect(content.source).toContain('孫權遣使奉獻');
    expect(content.source).toContain('蜀將孟達率衆降');
    expect(content.source).toContain('武都氐王楊僕率種人內附，居漢陽郡');
    expect(content.description).toContain('不把它們合成同一行動或因果');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未為三項記事另繫月日');
  });

  it('新局跨年至 220 年時只形成一筆三項史料記事', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes('魏廷記孫權遣使、孟達與楊僕來附'))).toHaveLength(1);
  });

  it('v413 舊存檔保留事件帳前綴，跨年觸發一次且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-413');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes('魏廷記孫權遣使、孟達與楊僕來附'))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-413');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes('魏廷記孫權遣使、孟達與楊僕來附'))).toBe(false);
    }
  });
});
