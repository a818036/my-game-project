import { describe, expect, it } from 'vitest';
import { createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const addedIds = [
  'situ-tang-zhen-succeeds-yang-ci-173',
  'rinan-foreign-envoys-tribute-173',
  'duan-jiong-dismissed-taiwei-173',
  'xianbei-raid-you-bing-173',
  'solar-eclipse-xiping-2-173',
] as const;

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(698, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 698, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A698 補列熹平二年本紀記事', () => {
  it('五筆新增記事各自保留來源、年級精度與原文限制', () => {
    const fresh = createPhase4Model(172, 1, [], PHASE4_CONTENT_VERSION);
    const items = addedIds.map(id => HISTORY_CONTENT.find(entry => entry.id === id));

    expect(items.every(Boolean)).toBe(true);
    for (const item of items) {
      expect(item).toMatchObject({ startYear: 173, endYear: 173, precision: 'year', introducedRevision: 321 });
      expect(fresh.nodes.some(node => node.contentId === item!.id)).toBe(true);
    }
    expect(items[0]?.source).toContain('秋七月');
    expect(items[1]?.source).toContain('日南徼外國重譯貢獻');
    expect(items[2]?.source).toContain('太尉段熲罷');
    expect(items[3]?.source).toContain('鮮卑寇幽并二州');
    expect(items[4]?.source).toContain('癸酉晦，日有食之');
  });

  it('172 年舊存檔升版後跨年至 173 年觸發，173 年及晚年不回補', () => {
    const old = verifySave(toJson(saveAtYear(172, 'phase4-scenario-320', 'a698-before')));
    const continued = dispatch(old.state, {
      version: ENGINE_VERSION,
      commandId: 'a698-cross-to-173',
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

    for (const year of [173, 174]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-320', `a698-late-${year}`)));
      for (const id of addedIds) {
        expect(late.state.phase4?.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 173 });
        expect(late.state.phase4?.eventLedger.some(event => event.detail.includes(HISTORY_CONTENT.find(item => item.id === id)!.title))).toBe(false);
      }
    }
  });

  it('v320 舊 v6 升至 v321 保留事件帳前綴且重複匯入一致', () => {
    const old = saveAtYear(172, 'phase4-scenario-320', 'a698-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
