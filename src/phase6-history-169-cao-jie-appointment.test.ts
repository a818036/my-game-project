import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const previousVersion = 'phase4-scenario-305';
const nodeId = 'cao-jie-charioteer-general-169';

function saveAtYear(year: number, commandId: string): SaveFile {
  const facts = createOpeningFacts(683, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 683, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: previousVersion } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A683 建寧二年曹節任車騎將軍記事', () => {
  it('依年級登錄曹節任車騎將軍百餘日罷，不推算日期或繼任者', () => {
    const entry = HISTORY_CONTENT.find(item => item.id === nodeId);
    const model = createPhase4Model(168, 1, people, PHASE4_CONTENT_VERSION);

    expect(entry).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 306 });
    expect(entry?.source).toContain('百餘日罷');
    expect(entry?.source).toContain('未提供起任、免職的月日或繼任者');
    expect(model.nodes.some(node => node.contentId === nodeId)).toBe(true);
  });

  it('舊存檔跨年至169年可觸發，169年與更晚存檔升版不回補', () => {
    const before = verifySave(toJson(saveAtYear(168, 'a683-before')));
    const crossed = advancePhase4(before.state.phase4!, 360);
    expect(crossed.nodes.find(node => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [169, 170]) {
      const migrated = verifySave(toJson(saveAtYear(year, `a683-at-${year}`)));
      expect(migrated.state.phase4?.nodes.find(node => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 169 });
    }
  });

  it('升級 v305 的 v6 存檔保留舊事件前綴並可再次匯入重播', () => {
    const old = saveAtYear(168, 'a683-migrate');
    const prefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));

    expect(migrated.events.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });
});
