import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'p1', name: '示例人物甲', alive: true, location: '郡府', office: '縣令' }];
const oldId = 'cao-campaign-guangling-224';
const correctedId = 'cao-campaign-guangling-225';

describe('A781 黃初六年廣陵觀兵記事年序勘誤', () => {
  it('原典將臨江觀兵繫於黃初六年，舊索引退役且新索引保留史料界線', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-409');
    expect(HISTORY_CONTENT.find(item => item.id === oldId)).toMatchObject({ retired: true, retiredIn: 'phase4-scenario-402', startYear: 224 });
    expect(HISTORY_CONTENT.find(item => item.id === correctedId)).toMatchObject({ startYear: 225, endYear: 225, precision: 'year' });
    const corrected = HISTORY_CONTENT.find(item => item.id === correctedId)!;
    expect(corrected.source).toContain('黃初六年冬十月');
    expect(corrected.source).toContain('戎卒十餘萬，旌旗數百里');
    expect(corrected.source).toContain('大寒');
    expect(corrected.description).toContain('不把「戎卒十餘萬、旌旗數百里」改寫為玩家部隊');
  });

  it('新局在 225 年觸發正確節點且不再觸發 224 年舊節點', () => {
    const state = advancePhase4(createPhase4Model(224, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(225);
    expect(state.nodes.find(node => node.contentId === oldId)).toBeUndefined();
    expect(state.nodes.find(node => node.contentId === correctedId)?.status).toBe('triggered');
    expect(state.eventLedger.some(event => event.detail.includes('曹丕行幸廣陵故城、臨江觀兵'))).toBe(true);
  });

  it('舊 v401 存檔在 224 年保留原事件帳前綴、追加勘誤，並可於 225 年觸發正確記事', () => {
    let old = upgradePhase4Content(createPhase4Model(223, 1, persons, 'phase4-scenario-19'), 'phase4-scenario-401');
    old = advancePhase4(old, 360);
    expect(old.nodes.find(node => node.contentId === oldId)?.status).toBe('triggered');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.at(-1)?.type).toBe('史實資料勘誤');
    expect(upgraded.eventLedger.at(-1)?.detail).toContain('黃初六年（225）冬十月');
    expect(upgraded.nodes.find(node => node.contentId === oldId)).toBeUndefined();
    expect(upgraded.nodes.find(node => node.contentId === correctedId)?.status).toBe('pending');
    const continued = advancePhase4(upgraded, 360);
    expect(continued.nodes.find(node => node.contentId === correctedId)?.status).toBe('triggered');
    expect(continued.eventLedger.slice(0, prefix.length)).toEqual(prefix);
  });

  it('升版時已到或晚於 225 年不回溯重播更正後記事', () => {
    for (const year of [225, 226]) {
      const old = createPhase4Model(year, 1, persons, 'phase4-scenario-401');
      const prefix = structuredClone(old.eventLedger);
      const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(node => node.contentId === correctedId)).toMatchObject({ status: 'resolved', resolvedYear: 225 });
      expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
      expect(upgraded.eventLedger.some(event => event.detail.includes('曹丕行幸廣陵故城、臨江觀兵'))).toBe(false);
    }
  });
});
