import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { applyEvent, createOpeningFacts, createStartEvent, dispatch, ENGINE_VERSION, LEGACY_ENGINE_VERSION, replay, type GameCommand, type GameEvent, type OpeningHistory } from './engine';
import { commitWorldline, loadWorkspace, openSaveDb, parseSave, toJson, verifySave, assertSlotCompatible, type LegacySaveFile, type SaveFile } from './storage';

const noHistory: OpeningHistory = { regions: [], surnames: [] };
function makeSave(id = 'storage-world') {
  const facts = createOpeningFacts(9, 184, noHistory);
  const result = dispatch(null, { version:ENGINE_VERSION, commandId:id, expectedRevision:0, type:'StartGame', name:`${facts.surname}元直`, seed:9, facts });
  if (!result.state || !result.event) throw new Error('storage fixture failed');
  return { format:'shenzhou-save' as const, version:4 as const, worldlineId:result.state.worldlineId, events:[result.event], state:result.state } satisfies SaveFile;
}
function makeLegacySave(id = 'legacy-world', turns = 0): LegacySaveFile {
  const facts = createOpeningFacts(99, 184, noHistory);
  const command = { version:LEGACY_ENGINE_VERSION, commandId:id, expectedRevision:0, type:'StartGame' as const, name:`${facts.surname}舊存`, seed:99, facts } satisfies GameCommand;
  const event = createStartEvent(command); const state = applyEvent(null, event);
  if (!state) throw new Error('legacy fixture failed');
  const events: GameEvent[] = [event]; let current = state;
  for (let turn = 1; turn <= turns; turn++) {
    const resolved: GameEvent = { version:LEGACY_ENGINE_VERSION, eventId:`${current.worldlineId}:${current.revision + 1}`, commandId:`${id}-turn-${turn}`, commandHash:`legacy-${turn}`, revision:current.revision + 1, type:'IntentResolved', payload:{ intent:'耕讀自持' } };
    current = applyEvent(current, resolved)!; events.push(resolved);
  }
  return { format:'shenzhou-save', version:2, worldlineId:current.worldlineId, events, state:current };
}
function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase('shenzhou-three-kingdoms'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('database deletion blocked')); });
}

describe('A05／A06 存檔交易與重播', () => {
  beforeEach(async () => { vi.stubGlobal('indexedDB', indexedDB); await deleteDatabase(); });
  afterEach(() => vi.unstubAllGlobals());

  it('A06 匯出後可驗證事件重播，版本未知或內容毀損會拒絕', () => {
    const save = makeSave(); expect(verifySave(toJson(save))).toEqual(save);
    expect(() => parseSave(JSON.stringify({ ...save, version:5 }))).toThrow('存檔格式或版本不符');
    const corrupt = { ...save, state:{ ...save.state, character:{ ...save.state.character, money:999 } } };
    expect(() => verifySave(toJson(corrupt))).toThrow('事件重播結果不一致');
  });

  it('A06 有效 JSON 匯入成獨立存檔後可重新載入並繼續重播', async () => {
    const exported = makeSave('portable-world');
    const imported = verifySave(toJson(exported));
    await commitWorldline(imported, noHistory, true);
    const reloaded = await loadWorkspace();
    expect(reloaded.profile.activeWorldlineId).toBe(imported.worldlineId);
    expect(reloaded.saves).toEqual([imported]);
    expect(replay(reloaded.saves[0].events)).toEqual(reloaded.saves[0].state);
  });

  it('舊版第一階段存檔先封存原檔，再遷移並可續玩', async () => {
    const legacy = makeLegacySave('migration-world', 10);
    const db = await openSaveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('worldlines', 'readwrite'); tx.objectStore('worldlines').put(legacy);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
    const loaded = await loadWorkspace(); const migrated = loaded.saves[0];
    expect(migrated.version).toBe(4); expect(migrated.state.phase2).toBeDefined(); expect(migrated.state.innate).toBeDefined();
    expect(migrated.events.slice(0, legacy.events.length)).toEqual(legacy.events); expect(migrated.state.turn).toBe(10); expect(migrated.state.status).toBe('playing');
    expect(migrated.state.phase2?.assetBalances.錢.private).toBe(legacy.state.character.money);
    expect(migrated.state.phase2?.age).toBe(legacy.state.character.age);
    const archivedDb = await openSaveDb();
    const archived = await new Promise<LegacySaveFile | undefined>((resolve, reject) => {
      const tx = archivedDb.transaction('profile', 'readonly'); const req = tx.objectStore('profile').get(`legacy:${legacy.worldlineId}:v2`);
      req.onsuccess = () => resolve(req.result as LegacySaveFile | undefined); req.onerror = () => reject(req.error);
    }); archivedDb.close();
    expect(archived).toEqual(legacy);
    const advanced = dispatch(migrated.state, { version:ENGINE_VERSION, commandId:'post-migration-turn', expectedRevision:migrated.state.revision, worldlineId:migrated.worldlineId, type:'ChooseIntent', intent:'耕讀自持' });
    expect(advanced.state?.turn).toBe(11); expect(replay([...migrated.events, advanced.event!])).toEqual(advanced.state);
    const completedOldSave = makeLegacySave('completed-old-world', 20);
    const reopened = verifySave(JSON.stringify(completedOldSave));
    expect(completedOldSave.state.status).toBe('complete'); expect(reopened.state.status).toBe('playing');
    const afterOldLimit = dispatch(reopened.state, { version:ENGINE_VERSION, commandId:'past-old-limit', expectedRevision:reopened.state.revision, worldlineId:reopened.worldlineId, type:'ChooseIntent', intent:'耕讀自持' });
    expect(afterOldLimit.state?.turn).toBe(21);
  });

  it('既有 v3 第二階段存檔以附加事件遷移至天生技 v4，不改寫原事件',()=>{
    const facts=createOpeningFacts(21,184,noHistory);
    const oldStart=createStartEvent({version:2,commandId:'phase2-save',expectedRevision:0,type:'StartGame',name:`${facts.surname}舊進度`,seed:21,facts});
    const oldState=applyEvent(null,oldStart)!;
    const v3={format:'shenzhou-save' as const,version:3 as const,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(JSON.stringify(v3));
    expect(migrated.version).toBe(4);expect(migrated.events[0]).toEqual(oldStart);expect(migrated.events.at(-1)?.type).toBe('InnateSystemUpgraded');
    expect(migrated.state.innate).toBeDefined();expect(migrated.state.turn).toBe(oldState.turn);expect(replay(migrated.events)).toEqual(migrated.state);
  });

  it('A05 IndexedDB 寫入失敗時仍能載回上一個完整世界線', async () => {
    const good = makeSave(); await commitWorldline(good, noHistory);
    const badState = { ...good.state, malicious: () => 'cannot be cloned' };
    const bad = { ...good, state:badState } as unknown as SaveFile;
    await expect(commitWorldline(bad, { regions:['污染'], surnames:['污染'] })).rejects.toBeTruthy();
    const after = await loadWorkspace();
    expect(after.saves).toEqual([good]); expect(after.profile.regions).toEqual([]); expect(replay(after.saves[0].events)).toEqual(good.state);
  });

  it('A02 匯入相同世界線不覆蓋不同存檔，A06 無效匯入不改動目前世界線', async () => {
    const saved = makeSave('retained-world'); await commitWorldline(saved, noHistory);
    const before = await loadWorkspace();
    const altered = { ...saved, state:{ ...saved.state, turn:7 } };
    expect(() => assertSlotCompatible(saved, altered)).toThrow('未覆蓋舊資料');
    expect(() => verifySave('{broken json')).toThrow();
    expect(await loadWorkspace()).toEqual(before);
  });

  it('新世界線以獨立 slot 保存，原事件流和 profile 去重資料同筆交易更新', async () => {
    const first = makeSave('slot-1'); const firstHistory = { regions:['司隸'], surnames:['陳'] };
    await commitWorldline(first, firstHistory);
    const second = makeSave('slot-2'); await commitWorldline(second, { regions:['司隸','豫州'], surnames:['陳','劉'] });
    const workspace = await loadWorkspace();
    expect(workspace.saves).toHaveLength(2); expect(workspace.profile.activeWorldlineId).toBe(second.worldlineId);
    expect(workspace.profile.regions).toEqual(['司隸','豫州']); expect(workspace.profile.surnames).toEqual(['陳','劉']);
    expect(workspace.saves.find((save) => save.worldlineId === first.worldlineId)?.events).toEqual(first.events);
  });
});
