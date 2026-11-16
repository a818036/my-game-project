import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const eventId = 'border-incursions-166';

function legacySave(year: number): SaveFile {
  const facts = createOpeningFacts(554, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId: `a554-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 554, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立歷史內容舊存檔');
  const event: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: 'phase4-scenario-225' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(554, 184, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a554-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 554, facts });
  if (!result.state) throw new Error('無法建立問答測試世界線');
  return result.state;
}

describe('A554 166 年緣邊九郡受侵與張奐出擊', () => {
  it('保留九郡、三族和原文先後，不把年末歸降擴為鮮卑降服', () => {
    const model = advancePhase4(createPhase4Model(165, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = model.nodes.find(item => item.contentId === eventId);
    const ledger = model.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('緣邊九郡遭侵'));
    expect(node?.status).toBe('triggered');
    expect(ledger?.source).toContain('六月南匈奴及烏桓、鮮卑寇緣邊九郡');
    expect(ledger?.source).toContain('十二月南匈奴、烏桓率眾詣張奐降');
    expect(ledger?.source).toContain('不推定三族聯盟、鮮卑降服');
    expect(HISTORY_CONTENT.find(item => item.id === eventId)).toMatchObject({ startYear: 166, endYear: 166, precision: 'year', introducedRevision:226, lateSameYear: true });
    const answer = answerKnownHistoricalEventQuestion('西元166年邊郡發生什麼事？', questionWorld());
    expect(answer?.answer).toContain('緣邊九郡遭侵');
    expect(answer?.answer).toContain('《後漢書》卷七〈孝桓帝紀〉');
  });

  it('v225 v6 舊存檔可跨年續玩與重播；同年及晚年遷移不回補', () => {
    const old = legacySave(165);
    const oldPrefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('pending');
    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a554-v225-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v225 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('triggered');
    const nextSave: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(nextSave.events)).toEqual(nextSave.state);
    expect(verifySave(toJson(nextSave))).toEqual(nextSave);

    for (const year of [166, 167, 184]) {
      const migratedLate = upgradePhase4Content(createPhase4Model(year, 1, people, 'phase4-scenario-225'), PHASE4_CONTENT_VERSION);
      expect(migratedLate.nodes.find(item => item.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 166 });
      expect(migratedLate.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('緣邊九郡遭侵'))).toBe(false);
    }
  });
});
