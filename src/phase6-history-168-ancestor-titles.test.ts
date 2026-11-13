import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const nodeId = 'jianing-ancestor-posthumous-titles-168';

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(689, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 689, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A694 建寧元年追尊先帝祖考與夫人', () => {
  it('依《後漢書》卷八記錄追尊尊號，不推測未載內容', () => {
    const item = HISTORY_CONTENT.find(entry => entry.id === nodeId);
    const fresh = createPhase4Model(166, 1, [], PHASE4_CONTENT_VERSION);

    expect(item).toMatchObject({ startYear: 168, endYear: 168, precision: 'year', introducedRevision: 317 });
    expect(item?.source).toContain('追尊皇祖為孝元皇');
    expect(item?.sourceDateNote).toContain('不把漢曆月份、日辰映射為遊戲日期');
    expect(fresh.nodes.some(node => node.contentId === nodeId)).toBe(true);
  });

  it('167 年舊存檔升版後跨年至 168 年觸發，已到年份不回補', () => {
    const old = verifySave(toJson(saveAtYear(167, 'phase4-scenario-316', 'a694-before')));
    const advanced = advancePhase4(old.state.phase4!, 360);
    expect(advanced.nodes.find(node => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [168, 169]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-316', `a694-late-${year}`)));
      expect(late.state.phase4?.nodes.find(node => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
      expect(late.state.phase4?.eventLedger.some(event => event.detail.includes('追尊皇祖、考與兩位夫人'))).toBe(false);
    }
  });

  it('v316 舊 v6 遷移保留事件帳前綴且重複匯入結果一致', () => {
    const old = saveAtYear(167, 'phase4-scenario-316', 'a694-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
