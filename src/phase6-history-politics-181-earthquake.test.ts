import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const id = 'earthquake-sea-overflow-clear-river-181';

function oldV257Save(): SaveFile {
  const facts = createOpeningFacts(611, 180, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'a613-v257-start', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 611, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('could not create v257 start event');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-257' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('could not replay v257 start event');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

describe('A613 181 年地震與水文記事', () => {
  it('依《後漢書》保留三項原文現象及日期精度', () => {
    const advanced = advancePhase4(createPhase4Model(180, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = advanced.nodes.find((item) => item.contentId === id);
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('地震、海水溢'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('光和四年二月癸卯');
    expect(event?.source).toContain('地震，海水溢，河水清');
    expect(event?.source).toContain('不補地名、潮汐、災害範圍或政治徵兆');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({ startYear: 181, endYear: 181, precision: 'year', introducedRevision: 258 });
  });

  it('v257 舊存檔保留事件前綴，續玩可觸發並再次匯入重播', () => {
    const old = oldV257Save();
    const prefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a613-v257-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('could not continue v257 save');
    expect(continued.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });

  it('181 年同年存檔升級後不回溯觸發', () => {
    const upgraded = upgradePhase4Content(createPhase4Model(181, 1, people, 'phase4-scenario-257'), PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 181 });
    expect(upgraded.eventLedger.some((item) => item.type === '史實事件形成' && item.detail.includes('地震、海水溢'))).toBe(false);
  });
});
