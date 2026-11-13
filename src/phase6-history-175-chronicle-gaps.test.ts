import { describe, expect, it } from 'vitest';
import { createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const addedIds = [
  'tuo-enfeoffed-rencheng-175',
  'seven-commandery-flood-175',
  'amnesty-and-yanling-fire-175',
  'xianbei-raid-youzhou-175',
  'locust-hongnong-sanfu-175',
  'salt-monitor-canal-works-175',
  'disaster-tax-relief-175',
  'prisoners-redeem-unresolved-xiping-4-175',
  'former-emperors-mothers-honored-175',
  'pingzhun-renamed-zhongzhun-175',
] as const;

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(700, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 700, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A700 補列熹平四年本紀記事', () => {
  it('十筆新增記事各自保留來源、年級精度與原文日期界線', () => {
    const fresh = createPhase4Model(174, 1, [], PHASE4_CONTENT_VERSION);
    const items = addedIds.map(id => HISTORY_CONTENT.find(entry => entry.id === id));

    expect(items.every(Boolean)).toBe(true);
    for (const item of items) {
      expect(item).toMatchObject({ startYear: 175, endYear: 175, precision: 'year', introducedRevision: 323 });
      expect(fresh.nodes.some(node => node.contentId === item!.id)).toBe(true);
    }
    expect(items[0]?.source).toContain('孫佗為任城王');
    expect(items[1]?.source).toContain('夏四月');
    expect(items[2]?.source).toContain('五月丁卯');
    expect(items[3]?.source).toContain('鮮卑寇幽州');
    expect(items[4]?.source).toContain('六月');
    expect(items[5]?.source).toContain('穿渠為民興利');
    expect(items[6]?.source).toContain('傷害十四以上');
    expect(items[7]?.source).toContain('冬十月丁巳');
    expect(items[8]?.source).toContain('憲園貴人');
    expect(items[9]?.source).toContain('改平準為中準');
  });

  it('174 年舊存檔升版後跨年至 175 年觸發，175 年及晚年不回補', () => {
    const old = verifySave(toJson(saveAtYear(174, 'phase4-scenario-322', 'a700-before')));
    const continued = dispatch(old.state, {
      version: ENGINE_VERSION,
      commandId: 'a700-cross-to-175',
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

    for (const year of [175, 176]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-322', `a700-late-${year}`)));
      for (const id of addedIds) {
        expect(late.state.phase4?.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 175 });
        expect(late.state.phase4?.eventLedger.some(event => event.detail.includes(HISTORY_CONTENT.find(item => item.id === id)!.title))).toBe(false);
      }
    }
  });

  it('v322 舊 v6 升至 v323 保留事件帳前綴且重複匯入一致', () => {
    const old = saveAtYear(174, 'phase4-scenario-322', 'a700-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
