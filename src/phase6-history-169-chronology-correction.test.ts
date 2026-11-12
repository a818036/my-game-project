import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const retiredIds = ['wind-hail-and-memorial-edict-179', 'duan-jiong-defeats-dongqiang-shehuosai-179'];
const correctedIds = ['great-wind-hail-169', 'court-sealed-memorial-edict-169', 'duan-jiong-defeats-xianling-shehuosai-169'];
const oldVersion = 'phase4-scenario-304';

function oldSaveAtBirthYear(birthYear: number, commandId: string): SaveFile {
  const facts = createOpeningFacts(682, birthYear, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 682, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立舊版世界線');
  const start: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: oldVersion } };
  const state = applyEvent(null, start);
  if (!state) throw new Error('無法重播舊版開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [start], state };
}

describe('A682 建寧二年記事年序勘誤', () => {
  it('將兩則誤列於179年的記事退役，並以169年獨立節點呈現原典三項記事', () => {
    const model = createPhase4Model(168, 1, people, PHASE4_CONTENT_VERSION);
    const corrected = model.nodes.filter(node => correctedIds.includes(node.contentId));

    expect(corrected.map(node => node.contentId)).toEqual(expect.arrayContaining(correctedIds));
    expect(model.nodes.some(node => retiredIds.includes(node.contentId))).toBe(false);
    expect(HISTORY_CONTENT.find(item => item.id === retiredIds[0])).toMatchObject({ startYear: 179, retired: true, retiredIn: 'phase4-scenario-305' });
    expect(HISTORY_CONTENT.find(item => item.id === retiredIds[1])).toMatchObject({ startYear: 179, retired: true, retiredIn: 'phase4-scenario-305' });
    expect(HISTORY_CONTENT.find(item => item.id === correctedIds[2])).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 305 });
    expect(HISTORY_CONTENT.find(item => item.id === correctedIds[2])?.source).toContain('建寧二年秋七月');
    expect(HISTORY_CONTENT.find(item => item.id === correctedIds[2])?.source).toContain('東羌悉平');
  });

  it('遷移已誤觸發的v304存檔時保留帳目舊前綴、追加勘誤且不回補169年', () => {
    const old = oldSaveAtBirthYear(178, 'a682-old-start');
    const next = dispatch(old.state, { version: ENGINE_VERSION, commandId: 'a682-old-advance', expectedRevision: old.state.revision, worldlineId: old.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!next.state || !next.event) throw new Error('無法推進舊版存檔至179年');
    const at179: SaveFile = { ...old, events: [...old.events, next.event], state: next.state };
    expect(retiredIds.every(id => at179.state.phase4?.nodes.find(node => node.contentId === id)?.status === 'triggered')).toBe(true);

    const prefix = structuredClone(at179.events);
    const oldLedgerPrefix = structuredClone(at179.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(at179));
    expect(migrated.events.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.events[prefix.length]).toMatchObject({ type: 'Phase4ContentUpdated', payload: { contentVersion: PHASE4_CONTENT_VERSION } });
    expect(migrated.state.phase4?.eventLedger.slice(0, oldLedgerPrefix.length)).toEqual(oldLedgerPrefix);
    expect(migrated.state.phase4?.eventLedger.some(item => item.type === '史實資料勘誤' && item.detail.includes('射虎塞外谷戰事'))).toBe(true);
    expect(migrated.state.phase4?.nodes.some(node => retiredIds.includes(node.contentId))).toBe(false);
    expect(correctedIds.map(id => [id, migrated.state.phase4?.nodes.find(node => node.contentId === id)?.status, migrated.state.phase4?.nodes.find(node => node.contentId === id)?.resolvedYear])).toEqual(correctedIds.map(id => [id, 'resolved', 169]));
    expect(migrated.state.phase4?.eventLedger.filter(item => item.type === '史實事件形成' && correctedIds.some(id => item.detail.includes(id)))).toHaveLength(0);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('168年舊存檔升版後可跨年觸發三項169年記事並重播一致', () => {
    const old = oldSaveAtBirthYear(168, 'a682-before-start');
    const migrated = verifySave(toJson(old));
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const before = migrated.state.phase4!;
    const advanced = advancePhase4(before, 360);
    for (const id of correctedIds) expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.nodes.some(node => retiredIds.includes(node.contentId))).toBe(false);
  });
});
