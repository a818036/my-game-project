import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createOpeningFacts, dispatch, ENGINE_VERSION, replay, type OpeningHistory } from './engine';
import { commitWorldline, loadWorkspace, parseSave, toJson, verifySave, assertSlotCompatible, type SaveFile } from './storage';

const noHistory: OpeningHistory = { regions: [], surnames: [] };
function makeSave(id = 'storage-world') {
  const facts = createOpeningFacts(9, 184, noHistory);
  const result = dispatch(null, { version:ENGINE_VERSION, commandId:id, expectedRevision:0, type:'StartGame', name:`${facts.surname}元直`, seed:9, facts });
  if (!result.state || !result.event) throw new Error('storage fixture failed');
  return { format:'shenzhou-save' as const, version:2 as const, worldlineId:result.state.worldlineId, events:[result.event], state:result.state } satisfies SaveFile;
}
function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase('shenzhou-three-kingdoms'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('database deletion blocked')); });
}

describe('A05／A06 存檔交易與重播', () => {
  beforeEach(async () => { vi.stubGlobal('indexedDB', indexedDB); await deleteDatabase(); });
  afterEach(() => vi.unstubAllGlobals());

  it('A06 匯出後可驗證事件重播，版本未知或內容毀損會拒絕', () => {
    const save = makeSave(); expect(verifySave(toJson(save))).toEqual(save);
    expect(() => parseSave(JSON.stringify({ ...save, version:3 }))).toThrow('存檔格式或版本不符');
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
