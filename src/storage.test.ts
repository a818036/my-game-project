import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { applyEvent, createOpeningFacts, createStartEvent, dispatch, ENGINE_VERSION, LEGACY_ENGINE_VERSION, replay, type GameCommand, type GameEvent, type OpeningHistory } from './engine';
import { commitWorldline, loadWorkspace, openSaveDb, parseSave, toJson, verifySave, assertSlotCompatible, type LegacySaveFile, type SaveFile } from './storage';
import { dispatch as dispatchV3 } from './engine.v3';

const noHistory: OpeningHistory = { regions: [], surnames: [] };
function makeSave(id = 'storage-world') {
  const facts = createOpeningFacts(9, 184, noHistory);
  const result = dispatch(null, { version:ENGINE_VERSION, commandId:id, expectedRevision:0, type:'StartGame', name:`${facts.surname}元直`, seed:9, facts });
  if (!result.state || !result.event) throw new Error('storage fixture failed');
  return { format:'shenzhou-save' as const, version:6 as const, worldlineId:result.state.worldlineId, events:[result.event], state:result.state } satisfies SaveFile;
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
    expect(() => parseSave(JSON.stringify({ ...save, version:7 }))).toThrow('存檔格式或版本不符');
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

  it('第四階段 v6 存檔可由 IndexedDB 載入、續玩、重播並再次儲存', async () => {
    const start=makeSave('phase4-v6-roundtrip');
    const phase4=dispatch(start.state,{version:ENGINE_VERSION,commandId:'phase4-v6-policy-time',expectedRevision:start.state.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:40}});
    expect(phase4.state?.phase4?.year).toBe(184);
    expect(phase4.event?.type).toBe('Phase4Changed');
    const original:SaveFile={...start,events:[...start.events,phase4.event!],state:phase4.state!};
    const originalJson=toJson(original);
    await commitWorldline(original,noHistory);

    const loaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===original.worldlineId)!;
    expect(loaded.version).toBe(6);
    expect(loaded.events).toEqual(original.events);
    expect(replay(loaded.events)).toEqual(loaded.state);
    expect(loaded.state.phase4?.day).toBe(40);

    const next=dispatch(loaded.state,{version:ENGINE_VERSION,commandId:'phase4-v6-continue',expectedRevision:loaded.state.revision,worldlineId:loaded.worldlineId,type:'SubmitActionPlan',intents:['耕讀自持'],supplement:''});
    expect(next.state?.turn).toBe(1);
    const continued:SaveFile={format:'shenzhou-save',version:6,worldlineId:loaded.worldlineId,events:[...loaded.events,next.event!],state:next.state!};
    expect(replay(continued.events)).toEqual(continued.state);
    await commitWorldline(continued,noHistory);

    const reloaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===continued.worldlineId)!;
    expect(reloaded).toEqual(continued);
    expect(verifySave(toJson(reloaded))).toEqual(continued);
    expect(replay(reloaded.events)).toEqual(reloaded.state);
    expect(toJson(original)).toBe(originalJson);
  });

  it('舊 v6 歷史內容版只追加一次更新事件，保留原事件並將當年新增節點接入重播',async()=>{
    const current=makeSave('phase6-content-migration');const originalStart=current.events[0];if(originalStart.type!=='WorldCreated')throw new Error('expected opening event');
    const {phase4ContentVersion:_contentVersion,...legacyPayload}=originalStart.payload;
    const legacyStart:GameEvent={...originalStart,payload:legacyPayload};
    const oldState=applyEvent(null,legacyStart)!;
    const old:SaveFile={...current,events:[legacyStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(legacyStart);
    expect(migrated.events).toHaveLength(2);
    expect(migrated.events[1].type).toBe('Phase4ContentUpdated');
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-13');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='yellow-turban-184')?.status).toBe('triggered');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='palace-succession-189')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='emperor-relocates-xu-196')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='shu-surrenders-263')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='zhuge-liang-dies-234')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='gaopingling-249')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='guan-yu-falls-219')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='liu-bei-proclaims-emperor-221')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='yiling-campaign-222')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='liu-bei-dies-223')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-proclaims-emperor-229')?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
    await commitWorldline(old,noHistory);const loaded=await loadWorkspace();expect(loaded.saves[0]).toEqual(migrated);
    const archiveDb=await openSaveDb();const archived=await new Promise<SaveFile|undefined>((resolve,reject)=>{const tx=archiveDb.transaction('profile','readonly');const request=tx.objectStore('profile').get(`legacy:${old.worldlineId}:v6-phase4-scenario-1`);request.onsuccess=()=>resolve(request.result as SaveFile|undefined);request.onerror=()=>reject(request.error);});archiveDb.close();expect(archived).toEqual(old);
  });

  it('較早的 phase4-scenario-2 至 v11 更新事件在新內容版本中仍可重播並接續升級',()=>{
    const current=makeSave('phase6-version-chain');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');const {phase4ContentVersion:_version,...payload}=start.payload;const legacyStart:GameEvent={...start,payload};let state=applyEvent(null,legacyStart)!;const events:GameEvent[]=[legacyStart];
    const update2:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:2`,commandId:'phase4-content-v2',commandHash:'phase4-content-v2',revision:2,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-2'}};state=applyEvent(state,update2);events.push(update2);expect(state.phase4?.nodes.some(node=>node.contentId==='yellow-turban-184')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='emperor-relocates-xu-196')).toBe(false);
    const update3:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:3`,commandId:'phase4-content-v3',commandHash:'phase4-content-v3',revision:3,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-3'}};state=applyEvent(state,update3);events.push(update3);expect(state.phase4?.nodes.some(node=>node.contentId==='emperor-relocates-xu-196')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='shu-surrenders-263')).toBe(false);
    const update4:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:4`,commandId:'phase4-content-v4',commandHash:'phase4-content-v4',revision:4,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-4'}};state=applyEvent(state,update4);events.push(update4);expect(state.phase4?.nodes.some(node=>node.contentId==='shu-surrenders-263')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='zhuge-liang-dies-234')).toBe(false);
    const update5:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:5`,commandId:'phase4-content-v5',commandHash:'phase4-content-v5',revision:5,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-5'}};state=applyEvent(state,update5);events.push(update5);expect(state.phase4?.nodes.some(node=>node.contentId==='zhuge-liang-dies-234')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='gaopingling-249')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='guan-yu-falls-219')).toBe(false);
    const update6:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:6`,commandId:'phase4-content-v6',commandHash:'phase4-content-v6',revision:6,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-6'}};state=applyEvent(state,update6);events.push(update6);expect(state.phase4?.nodes.some(node=>node.contentId==='guan-yu-falls-219')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='liu-bei-proclaims-emperor-221')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='yiling-campaign-222')).toBe(false);
    const update7:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:7`,commandId:'phase4-content-v7',commandHash:'phase4-content-v7',revision:7,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-7'}};state=applyEvent(state,update7);events.push(update7);expect(state.phase4?.nodes.some(node=>node.contentId==='yiling-campaign-222')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='liu-bei-dies-223')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='sun-quan-proclaims-emperor-229')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='zhuge-liang-first-northern-expedition-228')).toBe(false);
    const update8:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:8`,commandId:'phase4-content-v8',commandHash:'phase4-content-v8',revision:8,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-8'}};state=applyEvent(state,update8);events.push(update8);expect(state.phase4?.nodes.some(node=>node.contentId==='zhuge-liang-first-northern-expedition-228')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='guandu-campaign-200')).toBe(false);
    const update9:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:9`,commandId:'phase4-content-v9',commandHash:'phase4-content-v9',revision:9,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-9'}};state=applyEvent(state,update9);events.push(update9);expect(state.phase4?.nodes.some(node=>node.contentId==='guandu-campaign-200')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='lu-bu-xiapi-198')).toBe(false);
    const update10:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:10`,commandId:'phase4-content-v10',commandHash:'phase4-content-v10',revision:10,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-10'}};state=applyEvent(state,update10);events.push(update10);expect(state.phase4?.nodes.some(node=>node.contentId==='lu-bu-xiapi-198')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-shao-dies-202')).toBe(false);
    const update11:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:11`,commandId:'phase4-content-v11',commandHash:'phase4-content-v11',revision:11,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-11'}};state=applyEvent(state,update11);events.push(update11);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-shao-dies-202')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='white-wolf-mountain-207')).toBe(false);const update12:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:12`,commandId:'phase4-content-v12',commandHash:'phase4-content-v12',revision:12,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-12'}};state=applyEvent(state,update12);events.push(update12);expect(state.phase4?.nodes.some(node=>node.contentId==='white-wolf-mountain-207')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-tan-defeat-205')).toBe(false);const update13:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:13`,commandId:'phase4-content-v13',commandHash:'phase4-content-v13',revision:13,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-13'}};state=applyEvent(state,update13);events.push(update13);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-tan-defeat-205')).toBe(true);expect(replay(events)).toEqual(state);
  });

  it('歷史內容更新不回溯觸發早於存檔年份的事件',()=>{
    const current=makeSave('phase6-no-retroactive-content');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');const {phase4ContentVersion:_version,...payload}=start.payload;const oldStart:GameEvent={...start,payload};const initial=applyEvent(null,oldStart)!;
    const advanced=dispatch(initial,{version:ENGINE_VERSION,commandId:'phase6-old-world-advance',expectedRevision:initial.revision,worldlineId:initial.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:6*360}});const old:SaveFile={...current,events:[oldStart,advanced.event!],state:advanced.state!};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,old.events.length)).toEqual(old.events);expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='yellow-turban-184')).toMatchObject({status:'resolved',resolvedYear:184});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='palace-succession-189')).toMatchObject({status:'resolved',resolvedYear:189});expect(migrated.state.phase4?.eventLedger.some(event=>event.detail.includes('黃巾起事'))).toBe(false);expect(replay(migrated.events)).toEqual(migrated.state);
  });

  it('舊 v6 scenario v4 長局升至最新內容保留事件前綴且不回溯新節點',()=>{
    const current=makeSave('phase6-v6-nonretroactive');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');const {phase4ContentVersion:_version,...payload}=start.payload;const legacyStart:GameEvent={...start,payload};let state=applyEvent(null,legacyStart)!;const events:GameEvent[]=[legacyStart];
    for(const [index,contentVersion] of ['phase4-scenario-2','phase4-scenario-3','phase4-scenario-4'].entries()){const revision=state.revision+1;const update:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:${revision}`,commandId:`phase6-v${index+2}`,commandHash:`phase6-v${index+2}`,revision,type:'Phase4ContentUpdated',payload:{contentVersion}};state=applyEvent(state,update);events.push(update);}
    for(let index=0,remaining=76*360;remaining>0;index++){const days=Math.min(3600,remaining);const advance=dispatch(state,{version:ENGINE_VERSION,commandId:`phase6-old-v4-advance-${index}`,expectedRevision:state.revision,worldlineId:state.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});state=advance.state!;events.push(advance.event!);remaining-=days;}expect(state.phase4?.year).toBe(260);const oldPrefix=[...events];const oldSave:SaveFile={...current,events,state};
    const migrated=verifySave(toJson(oldSave));expect(migrated.events.slice(0,oldPrefix.length)).toEqual(oldPrefix);for(const [id,year] of [['guan-yu-falls-219',219],['liu-bei-proclaims-emperor-221',221],['yiling-campaign-222',222],['liu-bei-dies-223',223],['zhuge-liang-first-northern-expedition-228',228],['sun-quan-proclaims-emperor-229',229],['zhuge-liang-dies-234',234],['gaopingling-249',249]] as const)expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:year,evidence:['此歷史內容於目前存檔日期後才加入；不回溯觸發。']});expect(migrated.state.phase4?.eventLedger.some(event=>['荊州失守、關羽遇害','劉備於成都即皇帝位','夷陵戰局逆轉','劉備崩於永安宮','諸葛亮首次北伐與街亭失利','孫權即皇帝位','諸葛亮病卒於渭濱','高平陵政局轉折'].some(title=>event.detail.includes(title)))).toBe(false);expect(replay(migrated.events)).toEqual(migrated.state);
  });

  it('舊版第一階段存檔先封存原檔，再遷移並可續玩', async () => {
    const legacy = makeLegacySave('migration-world', 10);
    const db = await openSaveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('worldlines', 'readwrite'); tx.objectStore('worldlines').put(legacy);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
    const loaded = await loadWorkspace(); const migrated = loaded.saves[0];
    expect(migrated.version).toBe(6); expect(migrated.state.phase2).toBeDefined(); expect(migrated.state.innate).toBeDefined(); expect(migrated.state.phase4).toBeDefined();
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

  it('既有 v3 第二階段存檔以附加事件升級至新版引擎，不改寫原事件',()=>{
    const facts=createOpeningFacts(21,184,noHistory);
    const oldStart=createStartEvent({version:2,commandId:'phase2-save',expectedRevision:0,type:'StartGame',name:`${facts.surname}舊進度`,seed:21,facts});
    const oldState=applyEvent(null,oldStart)!;
    const v3={format:'shenzhou-save' as const,version:3 as const,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(JSON.stringify(v3));
    expect(migrated.version).toBe(6);expect(migrated.events[0]).toEqual(oldStart);expect(migrated.events.some(event=>event.type==='Phase4ContentUpdated')).toBe(true);expect(migrated.events.filter(event=>event.type==='EngineUpgraded')).toHaveLength(2);
    expect(migrated.state.innate).toBeDefined();expect(migrated.state.turn).toBe(oldState.turn);expect(replay(migrated.events)).toEqual(migrated.state);
  });

  it('舊 v4 天生技進度以舊 reducer 驗證後追加升級事件，原事件與快照均保留',()=>{
    const facts=createOpeningFacts(37,184,noHistory);
    const start=dispatchV3(null,{version:3,commandId:'phase3-old-save',expectedRevision:0,type:'StartGame',name:`${facts.surname}舊天生`,seed:37,facts});
    const turn=dispatchV3(start.state,{version:3,commandId:'phase3-old-turn',expectedRevision:start.state!.revision,worldlineId:start.state!.worldlineId,type:'ChooseIntent',intent:'耕讀自持'});
    const oldEvents=[start.event!,turn.event!];
    const old={format:'shenzhou-save' as const,version:4 as const,worldlineId:turn.state!.worldlineId,events:oldEvents,state:turn.state!};
    const migrated=verifySave(JSON.stringify(old));
    expect(migrated.version).toBe(6);
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);
    expect(migrated.events.some(event=>event.type==='Phase4ContentUpdated')).toBe(true);
    expect(migrated.state.turn).toBe(old.state.turn);
    expect(replay(migrated.events)).toEqual(migrated.state);
  });

  it('第四階段保留既有 v5 第三階段存檔事件流並以追加升級事件遷移',()=>{
    const facts=createOpeningFacts(52,184,noHistory);const oldStart=dispatchV3(null,{version:3,commandId:'phase3-v5-start',expectedRevision:0,type:'StartGame',name:`${facts.surname}舊線`,seed:52,facts});const oldTurn=dispatchV3(oldStart.state,{version:3,commandId:'phase3-v5-turn',expectedRevision:oldStart.state!.revision,worldlineId:oldStart.state!.worldlineId,type:'ChooseIntent',intent:'耕讀自持'});const oldEvents=[oldStart.event!,oldTurn.event!];const v4Upgrade:GameEvent={version:4,eventId:`${oldTurn.state!.worldlineId}:upgrade-v4`,commandId:'upgrade-v4',commandHash:'upgrade-v4',revision:oldTurn.state!.revision+1,type:'EngineUpgraded'};const v4State=applyEvent(oldTurn.state!,v4Upgrade);const phase3Save={format:'shenzhou-save' as const,version:5 as const,worldlineId:v4State.worldlineId,events:[...oldEvents,v4Upgrade],state:v4State};const migrated=verifySave(JSON.stringify(phase3Save));expect(migrated.version).toBe(6);expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events.at(-1)?.version).toBe(5);expect(migrated.state.phase4).toBeDefined();expect(migrated.state.turn).toBe(v4State.turn);expect(replay(migrated.events)).toEqual(migrated.state);
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
