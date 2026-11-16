import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const addedIds = [
  'earthquake-sea-overflow-clear-river-171',
  'solar-eclipse-jianing-4-171',
  'taiwei-li-xian-succeeds-wenren-xi-171',
  'court-memorial-edict-jianing-4-171',
  'sikong-appointments-jianing-4-171',
  'song-lady-made-empress-171',
  'xianbei-raids-bingzhou-171',
] as const;

function saveAtYear(year: number, version: string, commandId: string): SaveFile {
  const facts = createOpeningFacts(696, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 696, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: version } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A696 補齊建寧四年可確認的本紀記事', () => {
  it('為七項來源記事建立彼此分明的年級節點，保留不確定性界線', () => {
    const fresh = createPhase4Model(170, 1, [], PHASE4_CONTENT_VERSION);
    const items = addedIds.map(id => HISTORY_CONTENT.find(entry => entry.id === id));

    expect(items.every(Boolean)).toBe(true);
    for (const item of items) {
      expect(item).toMatchObject({ startYear: 171, endYear: 171, precision: 'year', introducedRevision: 319 });
      expect(fresh.nodes.some(node => node.contentId === item!.id)).toBe(true);
    }
    expect(items[0]?.source).toContain('地震，海水溢，河水清');
    expect(items[1]?.source).toContain('三月辛酉朔');
    expect(items[2]?.source).toContain('聞人襲免，太僕李咸為太尉');
    expect(items[3]?.source).toContain('詔公卿至六百石各上封事');
    expect(items[4]?.source).toContain('司徒許訓免');
    expect(items[5]?.source).toContain('癸丑，立貴人宋氏為皇后');
    expect(items[6]?.source).toContain('鮮卑寇并州');
  });

  it('170 年舊存檔升版後跨年至 171 年觸發，晚年存檔不回補', () => {
    const old = verifySave(toJson(saveAtYear(170, 'phase4-scenario-318', 'a696-before')));
    const advanced = advancePhase4(old.state.phase4!, 360);
    for (const id of addedIds) expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');

    for (const year of [171, 172]) {
      const late = verifySave(toJson(saveAtYear(year, 'phase4-scenario-318', `a696-late-${year}`)));
      for (const id of addedIds) {
        expect(late.state.phase4?.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 171 });
        expect(late.state.phase4?.eventLedger.some(event => event.detail.includes(HISTORY_CONTENT.find(item => item.id === id)!.title))).toBe(false);
      }
    }
  });

  it('v318 舊 v6 遷移保留事件帳前綴且重複匯入結果一致', () => {
    const old = saveAtYear(170, 'phase4-scenario-318', 'a696-prefix');
    const prefix = structuredClone(old.events);
    const upgraded = verifySave(toJson(old));

    expect(upgraded.events.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(upgraded))).toEqual(upgraded);
  });
});
