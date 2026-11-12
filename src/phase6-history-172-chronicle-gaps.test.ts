import { describe, expect, it } from 'vitest';
import { createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const addedIds = [
  'great-amnesty-xiping-1-172',
  'hou-lan-suicide-172',
  'capital-rainwater-172',
  'empress-dowager-dou-dies-buried-172',
  'taixue-students-arrested-172',
  'bohai-king-kui-dies-172',
  'situ-yuan-wei-succeeds-xu-xun-172',
  'xianbei-raid-bingzhou-172',
  'ganling-prince-hui-dies-172',
] as const;

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(697, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 697, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A697 補齊熹平元年本紀記事', () => {
  it('為九筆缺漏記事建立獨立年級節點並保留原文界線', () => {
    const fresh = createPhase4Model(171, 1, [], PHASE4_CONTENT_VERSION);
    const items = addedIds.map(id => HISTORY_CONTENT.find(entry => entry.id === id));

    expect(items.every(Boolean)).toBe(true);
    for (const item of items) {
      expect(item).toMatchObject({ startYear: 172, endYear: 172, precision: 'year', introducedRevision: 320 });
      expect(fresh.nodes.some(node => node.contentId === item!.id)).toBe(true);
    }
    expect(items[0]?.source).toContain('大赦天下，改元熹平');
    expect(items[1]?.source).toContain('有罪，自殺');
    expect(items[2]?.source).toContain('六月記「京師雨水」');
    expect(items[3]?.source).toContain('竇氏崩');
    expect(items[4]?.source).toContain('諷司隷校尉段熲捕繫太學諸生千餘人');
    expect(items[5]?.source).toContain('被誣謀反');
    expect(items[6]?.source).toContain('司徒許栩罷');
    expect(items[7]?.source).toContain('鮮卑寇并州');
    expect(items[8]?.source).toContain('甘陵王恢薨');
    expect(items[4]?.source).toContain('千餘人');
    expect(items[5]?.source).toContain('不將指控當成已證實罪行');
  });

  it('171 年舊存檔升版後跨年至 172 年觸發，晚年存檔不回補', () => {
    const old = verifySave(toJson(saveAtYear(171, 'phase4-scenario-319', 'a697-before')));
    const continued = dispatch(old.state, {
      version: ENGINE_VERSION,
      commandId: 'a697-cross-to-172',
      expectedRevision: old.state.revision,
      worldlineId: old.worldlineId,
      type: 'Phase4Action',
      action: { type: 'AdvanceDays', days: 360 },
    });
    expect(continued.state).toBeDefined();
    expect(continued.event).toBeDefined();
    const continuedSave: SaveFile = { ...old, events: [...old.events, continued.event!], state: continued.state! };
    for (const id of addedIds) expect(continued.state!.phase4?.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(replay(continuedSave.events)).toEqual(continuedSave.state);
    expect(verifySave(toJson(continuedSave))).toEqual(continuedSave);

    for (const year of [172, 173]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-319', `a697-late-${year}`)));
      for (const id of addedIds) {
        expect(late.state.phase4?.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 172 });
        expect(late.state.phase4?.eventLedger.some(event => event.detail.includes(HISTORY_CONTENT.find(item => item.id === id)!.title))).toBe(false);
      }
    }
  });

  it('v319 舊 v6 遷移保留事件帳前綴且重複匯入結果一致', () => {
    const old = saveAtYear(171, 'phase4-scenario-319', 'a697-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
