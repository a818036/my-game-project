import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const nodeId = 'solar-eclipse-yongkang-167';

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(688, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 688, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A688 永康元年壬子晦日日食記事', () => {
  it('依《後漢書》卷七保留干支與晦日，不推算天文細節', () => {
    const item = HISTORY_CONTENT.find(entry => entry.id === nodeId);
    const fresh = createPhase4Model(166, 1, [], PHASE4_CONTENT_VERSION);

    expect(item).toMatchObject({ startYear: 167, endYear: 167, precision: 'year', introducedRevision: 311 });
    expect(item?.source).toContain('壬子晦，日有食之');
    expect(item?.sourceDateNote).toContain('不換算為模型日期');
    expect(fresh.nodes.some(node => node.contentId === nodeId)).toBe(true);
  });

  it('166 年舊存檔升版後跨年至 167 年觸發，已到年份不回補', () => {
    const old = verifySave(toJson(saveAtYear(166, 'phase4-scenario-310', 'a688-before')));
    const advanced = advancePhase4(old.state.phase4!, 360);
    expect(advanced.nodes.find(node => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [167, 168]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-310', `a688-late-${year}`)));
      expect(late.state.phase4?.nodes.find(node => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 167 });
      expect(late.state.phase4?.eventLedger.some(event => event.detail.includes('永康元年壬子晦日日食'))).toBe(false);
    }
  });

  it('v310 舊 v6 遷移保留事件帳前綴且重複匯入結果一致', () => {
    const old = saveAtYear(166, 'phase4-scenario-310', 'a688-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
