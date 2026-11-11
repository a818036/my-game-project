import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const id = 'qiang-incursions-167';

function oldSave(year: number): SaveFile {
  const facts = createOpeningFacts(556, year, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: `a556-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 556, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 v226 歷史內容舊存檔');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-226' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 v226 歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(556, 184, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'a556-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 556, facts });
  if (!started.state) throw new Error('無法建立史實問答測試世界線');
  return started.state;
}

describe('A556 167 年羌事原典記事', () => {
  it('保留三次侵擾與兩名將領的原典差異，不把「悉平」擴寫成全年無事', () => {
    const before = createPhase4Model(166, 1, people, PHASE4_CONTENT_VERSION);
    const advanced = advancePhase4(before, 360);
    const node = advanced.nodes.find(item => item.contentId === id);
    const entry = advanced.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('永康元年先零、當煎羌侵擾'));
    const content = HISTORY_CONTENT.find(item => item.id === id);

    expect(node?.status).toBe('triggered');
    expect(entry?.source).toContain('春正月先零羌寇三輔');
    expect(entry?.source).toContain('當煎羌寇武威');
    expect(entry?.source).toContain('夏四月再記先零羌寇三輔');
    expect(entry?.source).toContain('冬十月又記張奐擊破先零羌');
    expect(entry?.source).toContain('不據「西羌悉平」斷言全年無後續');
    expect(content).toMatchObject({ startYear: 167, endYear: 167, precision: 'year', introducedIn: 'phase4-scenario-227', lateSameYear: true });
    expect(content?.sourceDateNote).toContain('不換算為模型月份');

    const state = questionWorld();
    const snapshot = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 167 年羌人發生什麼事？', state);
    expect(answer?.answer).toContain('先零羌侵擾三輔');
    expect(answer?.answer).toContain('當煎羌侵擾武威');
    expect(answer?.answer).toContain('《後漢書》卷七〈孝桓帝紀〉');
    expect(state).toEqual(snapshot);
  });

  it('v226 v6 舊存檔可升級、跨年觸發、重播及再匯出；167 年同年與晚年升級不回補', () => {
    const old = oldSave(166);
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a556-v226-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v226 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    for (const year of [167, 184]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, 'phase4-scenario-226'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 167 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('永康元年先零、當煎羌侵擾'))).toBe(false);
    }
  });
});
