import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const persons: PersonRef[] = [];
const id = 'changping-nandun-claimants-162';

function oldSave(year: number, suffix: string): SaveFile {
  const facts = createOpeningFacts(548, year, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: `a548-${suffix}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 548, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('could not create old content save');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-223' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('could not replay old content save');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function world(): GameState {
  const facts = createOpeningFacts(548, 184, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a548-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 548, facts });
  if (!result.state) throw new Error('could not create question world');
  return result.state;
}

describe('A548 162 年陳景、管伯記事', () => {
  it('依《後漢書》分開記錄兩人圖舉兵與伏誅，不推定協作或人物狀態', () => {
    const advanced = advancePhase4(createPhase4Model(161, 1, persons, PHASE4_CONTENT_VERSION), 360);
    const node = advanced.nodes.find(item => item.contentId === id);
    const event = advanced.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('陳景、管伯'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('冬十月');
    expect(event?.source).toContain('不推定彼此協作');
    expect(HISTORY_CONTENT.find(item => item.id === id)).toMatchObject({ startYear: 162, endYear: 162, precision: 'year', introducedIn: 'phase4-scenario-224', lateSameYear: true });
    expect(answerKnownHistoricalEventQuestion('西元 162 年陳景與管伯發生什麼事？', world())?.answer).toContain('管伯');
  });

  it('v223 舊存檔保留事件帳並可續玩、重播及再匯出；同年與晚年升級不回補', () => {
    const old = oldSave(161, 'v223');
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a548-v223-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('could not continue v223 save');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    for (const year of [162, 184]) {
      const late = createPhase4Model(year, 1, persons, 'phase4-scenario-223');
      const upgraded = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(item => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
      expect(upgraded.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('陳景、管伯'))).toBe(false);
    }
  });
});
