import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { applyEvent, createOpeningFacts, createStartEvent, dispatch, ENGINE_VERSION, LEGACY_ENGINE_VERSION, RULES_VERSION, SOURCE_HASHES, replay, type GameCommand, type GameEvent, type OpeningHistory } from './engine';
import { commitWorldline, loadWorkspace, openSaveDb, parseSave, toJson, verifySave, assertSlotCompatible, type LegacySaveFile, type SaveFile } from './storage';
import { dispatch as dispatchV3 } from './engine.v3';
import { buildNarrationPayload } from './narration/client';
import { PHASE4_CONTENT_VERSION, type BattleSceneManifest, type WarUnit } from './phase4';

const noHistory: OpeningHistory = { regions: [], surnames: [] };
function makeSave(id = 'storage-world', birthYear = 184) {
  const facts = createOpeningFacts(9, birthYear, noHistory);
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
    const protagonistObservation=dispatch(phase4.state!,{version:ENGINE_VERSION,commandId:'phase4-v6-player-observation',expectedRevision:phase4.state!.revision,worldlineId:start.worldlineId,type:'Phase2Action',action:{type:'RecordObservation',observation:{id:'saved-player-observation',witnessId:'protagonist',turn:1,observation:'主角在庭院親見',known:['主角親眼看到院門前有馬車'],unknown:['未在場消息']}}});
    const npcObservation=dispatch(protagonistObservation.state!,{version:ENGINE_VERSION,commandId:'phase4-v6-npc-observation',expectedRevision:protagonistObservation.state!.revision,worldlineId:start.worldlineId,type:'Phase2Action',action:{type:'RecordObservation',observation:{id:'saved-npc-observation',witnessId:'opening-family-0',turn:2,observation:'家人在庭院親見',known:['家人親眼看到院門前有車'],unknown:['主角私下所知消息']}}});
    const original:SaveFile={...start,events:[...start.events,phase4.event!,protagonistObservation.event!,npcObservation.event!],state:npcObservation.state!};
    const originalJson=toJson(original);
    await commitWorldline(original,noHistory);

    const loaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===original.worldlineId)!;
    expect(loaded.version).toBe(6);
    expect(loaded.events).toEqual(original.events);
    expect(replay(loaded.events)).toEqual(loaded.state);
    expect(loaded.state.phase4?.day).toBe(40);
    const loadedNarration=buildNarrationPayload(loaded.state,npcObservation.event!);
    expect(loadedNarration.playerView.knownFacts).toEqual([{turn:1,observation:'主角在庭院親見',facts:['主角親眼看到院門前有馬車']}]);
    expect(loadedNarration.visibleNpcs.find(person=>person.id==='opening-family-0')?.knownFacts).toEqual([{turn:2,observation:'家人在庭院親見',facts:['家人親眼看到院門前有車']}]);
    expect(JSON.stringify(loadedNarration)).not.toContain('未在場消息');
    expect(JSON.stringify(loadedNarration)).not.toContain('主角私下所知消息');

    const next=dispatch(loaded.state,{version:ENGINE_VERSION,commandId:'phase4-v6-continue',expectedRevision:loaded.state.revision,worldlineId:loaded.worldlineId,type:'SubmitActionPlan',intents:['耕讀自持'],supplement:''});
    expect(next.state?.turn).toBe(1);
    const later=dispatch(next.state,{version:ENGINE_VERSION,commandId:'phase4-v6-continue-again',expectedRevision:next.state!.revision,worldlineId:loaded.worldlineId,type:'SubmitActionPlan',intents:['經商營生'],supplement:'不送入回憶'});
    expect(later.state?.turn).toBe(2);
    const continued:SaveFile={format:'shenzhou-save',version:6,worldlineId:loaded.worldlineId,events:[...loaded.events,next.event!,later.event!],state:later.state!};
    expect(replay(continued.events)).toEqual(continued.state);
    await commitWorldline(continued,noHistory);

    const reloaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===continued.worldlineId)!;
    expect(reloaded).toEqual(continued);
    expect(verifySave(toJson(reloaded))).toEqual(continued);
    expect(replay(reloaded.events)).toEqual(reloaded.state);
    const narrativeContext=buildNarrationPayload(reloaded.state,later.event!);
    expect(narrativeContext.protagonistMemory).toHaveLength(1);
    expect(narrativeContext.protagonistMemory?.[0]).toMatchObject({turn:1});
    expect(JSON.stringify(narrativeContext)).not.toContain('不送入回憶');
    expect(narrativeContext.playerView.knownFacts).toEqual([{turn:1,observation:'主角在庭院親見',facts:['主角親眼看到院門前有馬車']}]);
    expect(narrativeContext.visibleNpcs.some(person=>person.id==='opening-family-0')).toBe(false);
    expect(toJson(original)).toBe(originalJson);
  });

  it('A266 NPC 對話寫入世界線事件後，可重載續聊並重播且不推進回合或關係', async () => {
    const start = makeSave('phase6-dialogue-roundtrip');
    const speakerId = start.state.phase2!.scene.presentIds.find(id => id !== 'protagonist')!;
    const speaker = start.state.phase2!.persons.find(person => person.id === speakerId)!;
    const beforeTurn = start.state.turn;
    const beforeWorld = start.state.world;
    const beforeRelationships = start.state.phase2!.relationships;
    const first = dispatch(start.state, {
      version:ENGINE_VERSION,
      commandId:'phase6-dialogue-first',
      expectedRevision:start.state.revision,
      worldlineId:start.worldlineId,
      type:'Phase2Action',
      action:{type:'RecordDialogueExchange',exchange:{speakerId,speakerName:speaker.name,turn:start.state.turn,playerText:'第一次問候',npcText:'第一次答覆'}},
    });
    if (!first.state || !first.event) throw new Error('對話事件未建立');
    const firstSave:SaveFile={...start,events:[...start.events,first.event],state:first.state};
    await commitWorldline(firstSave,noHistory);

    const loaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===start.worldlineId)!;
    expect(loaded.state.phase2?.dialogueHistory).toEqual([{speakerId,speakerName:speaker.name,turn:beforeTurn,playerText:'第一次問候',npcText:'第一次答覆'}]);
    expect(loaded.events.slice(0,start.events.length)).toEqual(start.events);
    expect(replay(loaded.events)).toEqual(loaded.state);
    expect(loaded.state.turn).toBe(beforeTurn);
    expect(loaded.state.world).toEqual(beforeWorld);
    expect(loaded.state.phase2?.relationships).toEqual(beforeRelationships);

    const second=dispatch(loaded.state,{version:ENGINE_VERSION,commandId:'phase6-dialogue-second',expectedRevision:loaded.state.revision,worldlineId:loaded.worldlineId,type:'Phase2Action',action:{type:'RecordDialogueExchange',exchange:{speakerId,speakerName:speaker.name,turn:beforeTurn,playerText:'承接上次談話',npcText:'延續回應'}}});
    if(!second.state||!second.event)throw new Error('續聊事件未建立');
    const continued:SaveFile={...loaded,events:[...loaded.events,second.event],state:second.state};
    const imported=verifySave(toJson(continued));
    await commitWorldline(imported,noHistory);
    const reloaded=(await loadWorkspace()).saves.find(save=>save.worldlineId===start.worldlineId)!;
    expect(reloaded.state.phase2?.dialogueHistory?.map(exchange=>exchange.playerText)).toEqual(['第一次問候','承接上次談話']);
    expect(reloaded.events.slice(0,start.events.length)).toEqual(start.events);
    expect(replay(reloaded.events)).toEqual(reloaded.state);
    expect(verifySave(toJson(reloaded))).toEqual(reloaded);
    expect(reloaded.state.turn).toBe(beforeTurn);
    expect(reloaded.state.world).toEqual(beforeWorld);
    expect(reloaded.state.phase2?.relationships).toEqual(beforeRelationships);
  });

  it('v6 戰役場景清冊經 JSON 匯入、IndexedDB 載入與續玩後仍可重播', async () => {
    const start=makeSave('battle-scene-roundtrip');
    const units:WarUnit[]=[{id:'guard',faction:'守軍・示例',commanderId:'guard-captain',commanderName:'守將・示例',location:'渡口北岸',strength:100,reserve:10,supply:3,morale:70,fatigue:0,terrain:'渡口',wounded:0,killed:0,routed:0,order:'待命'},{id:'attacker',faction:'攻軍・示例',commanderId:'attacker-captain',commanderName:'前軍校尉・示例',location:'渡口南岸',strength:120,reserve:0,supply:3,morale:65,fatigue:0,terrain:'渡口',wounded:0,killed:0,routed:0,order:'待命'}];
    const scene:BattleSceneManifest={example:true,objects:[{id:'platform',label:'弩臺・示例',location:'北岸土坡',condition:'支架穩固',position:{x:0,y:0},integrity:5},{id:'rope',label:'牽繫木索・示例',location:'弩臺與拒馬間',condition:'繃緊',position:{x:2,y:0},integrity:8}],potentialChains:[{id:'platform-rope',fromObjectId:'platform',toObjectId:'rope',triggerCondition:'弩臺側架受擊斷裂',possibleEffect:'斷索波及守軍前列（傷亡數為預置軍籍）',affectedUnitIds:['guard'],impactForce:8,maxDistance:3,affectedRadius:2,moraleImpact:4,casualties:[{unitId:'guard',killed:1,wounded:2,routed:0}]}],observers:[{id:'rear-observer',side:'守軍後陣',location:'北岸後列',visibility:'可辨旗號，無法看清前沿細節'}]};
    const battle=dispatch(start.state,{version:ENGINE_VERSION,commandId:'battle-scene-start',expectedRevision:start.state.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'StartBattle',id:'battle-scene-roundtrip',location:'汝南渡口（示例）',units,protagonistPresent:true,scene}});
    const impact=dispatch(battle.state!,{version:ENGINE_VERSION,commandId:'battle-scene-impact',expectedRevision:battle.state!.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'ResolveBattleImpact',targetObjectId:'platform',force:5}});
    const round=dispatch(impact.state!,{version:ENGINE_VERSION,commandId:'battle-scene-round',expectedRevision:impact.state!.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'BattleRound',orders:{guard:'防守',attacker:'防守'}}});
    const save:SaveFile={...start,events:[...start.events,battle.event!,impact.event!,round.event!],state:round.state!};
    const imported=verifySave(toJson(save));
    await commitWorldline(imported,noHistory,true);
    const loaded=(await loadWorkspace()).saves.find(item=>item.worldlineId===start.worldlineId)!;
    expect(loaded.state.phase4?.battle?.scene?.settledChainIds).toEqual(['platform-rope']);
    expect(loaded.state.phase4?.battle?.scene?.potentialChains[0].casualties).toEqual([{unitId:'guard',killed:1,wounded:2,routed:0}]);
    expect(loaded.events).toEqual(save.events);
    expect(replay(loaded.events)).toEqual(loaded.state);
    expect(loaded.state.phase4?.battle?.units.every(unit=>unit.killed+unit.wounded<=20)).toBe(true);
  });

  it('v6 剛體碰撞推進經 JSON 匯入、IndexedDB 載入與事件重播保持一致',async()=>{
    const start=makeSave('physics-scene-roundtrip'),units:WarUnit[]=[{id:'guard',faction:'守軍・示例',commanderId:'captain',commanderName:'守將・示例',location:'木門旁',strength:10,reserve:0,supply:2,morale:60,fatigue:0,terrain:'平地',wounded:0,killed:0,routed:0,order:'防守'}],scene:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'ram',label:'撞木',location:'木門外',condition:'待推',position:{x:0,y:0,z:0},radius:.5,rigidBody:{massKg:1,restitution:0,velocityMps:{x:0,y:0,z:0},failureEnergyJ:20}},{id:'gate',label:'固定木門',location:'門洞',condition:'固定',position:{x:2,y:0,z:0},radius:.5,rigidBody:{massKg:100,restitution:0,anchored:true,velocityMps:{x:0,y:0,z:0}}}],potentialChains:[],observers:[]};
    const battle=dispatch(start.state,{version:ENGINE_VERSION,commandId:'physics-battle-start',expectedRevision:start.state.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'StartBattle',id:'physics-roundtrip',location:'木門（示例）',units,protagonistPresent:false,scene}});
    const impact=dispatch(battle.state!,{version:ENGINE_VERSION,commandId:'physics-impulse',expectedRevision:battle.state!.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'ResolveBattleImpulse',targetObjectId:'ram',impulseNs:{x:10,y:0,z:0}}});
    const step=dispatch(impact.state!,{version:ENGINE_VERSION,commandId:'physics-step',expectedRevision:impact.state!.revision,worldlineId:start.worldlineId,type:'Phase4Action',action:{type:'AdvanceBattlePhysics',seconds:.1}});
    const save:SaveFile={...start,events:[...start.events,battle.event!,impact.event!,step.event!],state:step.state!},imported=verifySave(toJson(save));
    await commitWorldline(imported,noHistory,true);
    const loaded=(await loadWorkspace()).saves.find(item=>item.worldlineId===start.worldlineId)!;
    expect(loaded.events).toEqual(save.events);expect(loaded.state.phase4?.battle?.scene?.objects[0]).toMatchObject({destroyed:true,integrity:0});expect(replay(loaded.events)).toEqual(loaded.state);
    expect(loaded.state.phase4?.battle?.units[0]).toMatchObject({strength:10,killed:0,wounded:0,routed:0});
  });

  it('舊 v6 歷史內容版只追加一次更新事件，保留原事件並將當年新增節點接入重播',async()=>{
    const current=makeSave('phase6-content-migration');const originalStart=current.events[0];if(originalStart.type!=='WorldCreated')throw new Error('expected opening event');
    const {phase4ContentVersion:_contentVersion,rulesVersion:_rulesVersion,sourceHashes:_sourceHashes,...legacyPayload}=originalStart.payload;
    const legacyStart:GameEvent={...originalStart,payload:legacyPayload};
    const oldState=applyEvent(null,legacyStart)!;
    const old:SaveFile={...current,events:[legacyStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(legacyStart);
    expect(migrated.events).toHaveLength(3);
    expect(migrated.events[1].type).toBe('Phase4ContentUpdated');
    expect(migrated.events[2]).toMatchObject({type:'RulesUpdated',payload:{fromVersion:'3.15',toVersion:RULES_VERSION,sourceHashes:SOURCE_HASHES}});
    expect(migrated.state.rulesVersion).toBe(RULES_VERSION);
    expect(migrated.state.sourceHashes).toEqual(SOURCE_HASHES);
    const rulesUpdate=migrated.events[2];if(rulesUpdate.type!=='RulesUpdated')throw new Error('expected rules update event');
    const forgedRulesEvent={...rulesUpdate,payload:{...rulesUpdate.payload,sourceHashes:{...SOURCE_HASHES,rules:'0'.repeat(64)}}};
    const afterContentUpdate=applyEvent(oldState,migrated.events[1]);
    expect(()=>applyEvent(afterContentUpdate,forgedRulesEvent)).toThrow('規則來源升級事件無效');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='dong-zhuo-killed-192')?.status).toBe('pending');
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
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='tong-pass-campaign-211')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='yi-province-surrender-214')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='han-zhong-campaign-215')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='cao-crowned-king-of-wei-216')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='jianan-epidemic-217')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='hou-yin-rebellion-218')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='cao-campaign-guangling-224')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='zhugeliang-south-campaign-225')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='cao-pi-death-cao-rui-accession-226')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='zhugeliang-moves-to-hanzhong-227')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='wu-expedition-yizhou-230')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='pan-jun-wuling-expedition-231')?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
    expect(verifySave(toJson(migrated)).events).toHaveLength(migrated.events.length);
    await commitWorldline(old,noHistory);const loaded=await loadWorkspace();expect(loaded.saves[0]).toEqual(migrated);
    const archiveDb=await openSaveDb();const archived=await new Promise<SaveFile|undefined>((resolve,reject)=>{const tx=archiveDb.transaction('profile','readonly');const request=tx.objectStore('profile').get(`legacy:${old.worldlineId}:v6-phase4-scenario-1`);request.onsuccess=()=>resolve(request.result as SaveFile|undefined);request.onerror=()=>reject(request.error);});archiveDb.close();expect(archived).toEqual(old);
  });

  it('A167 舊 v6 v88 存檔升至目前 scenario 時不回補新增史事且可重播',()=>{
    const current=makeSave('phase6-v88-to-v90');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-88'}};
    const oldState=applyEvent(null,legacyStart)!;const old:SaveFile={...current,events:[legacyStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(legacyStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-inferred-birth-182')).toMatchObject({status:'resolved',resolvedYear:182,evidence:['此歷史內容於目前存檔日期後才加入；不回溯觸發。']});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='winter-cold-eastern-commandries-183')).toMatchObject({status:'resolved',resolvedYear:183,evidence:['此歷史內容於目前存檔日期後才加入；不回溯觸發。']});
    expect(migrated.state.phase4?.eventLedger.some(event=>event.detail.includes('孫權推定出生年'))).toBe(false);
    expect(migrated.state.phase4?.eventLedger.some(event=>event.detail.includes('北海、東萊、琅邪冬寒記錄'))).toBe(false);
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A169 舊 v6 v90 存檔升至目前 scenario 時不回補新增史事且可重播',()=>{
    const current=makeSave('phase6-v90-to-v100');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-90'}};
    let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let daysRemaining=(201-oldState.phase4!.year)*360;let step=0;
    while(daysRemaining>0){const days=Math.min(3650,daysRemaining);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v90-turn-${++step}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not advance legacy v90 fixture');oldState=result.state;oldEvents.push(result.event);daysRemaining-=days;}
    const old:SaveFile={...current,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(legacyStart);
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);
    expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-ce-dies-sun-quan-inherits-200')).toMatchObject({status:'resolved',resolvedYear:200,evidence:['此歷史內容於目前存檔日期後才加入；不回溯觸發。']});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-chooses-resistance-208')).toMatchObject({status:'pending'});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-accepts-king-of-wu-title-221')).toMatchObject({status:'pending'});
    expect(migrated.state.phase4?.eventLedger.some(event=>event.detail.includes('孫策去世、孫權承接軍政事務'))).toBe(false);
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A188 v6 scenario v98 JSON 存檔追加升至目前版本，保留事件前綴並納入射虎節點',()=>{
    const current=makeSave('phase6-v98-to-v102');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const priorStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-98'}};
    const priorState=applyEvent(null,priorStart)!;const old:SaveFile={...current,events:[priorStart],state:priorState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(priorStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-hunts-tiger-lingting-218')?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A194 v6 scenario v103 存檔追加升至目前版本，保留事件前綴並可重播',()=>{
    const current=makeSave('phase6-v103-to-v105');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const priorStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-103'}};
    const priorState=applyEvent(null,priorStart)!;const old:SaveFile={...current,events:[priorStart],state:priorState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(priorStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-mother-dies-202')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-moves-governance-to-muling-211')?.status).toBe('pending');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-builds-shitou-jianye-ruxu-212')?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A214 v106 203 年存檔追加翊遇害節點、續玩觸發並保留重播一致',()=>{
    const current=makeSave('phase6-v106-sun-yi');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-106'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];for(const [index,days] of [3600,3240].entries()){const reached=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v106-sun-yi-reach-203-${index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!reached.state||!reached.event)throw new Error('could not prepare v106 fixture');oldState=reached.state;oldEvents.push(reached.event);}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-brother-sun-yi-killed-204')?.status).toBe('pending');
    const next=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v106-sun-yi-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!next.state||!next.event)throw new Error('could not advance migrated v106 fixture');const continued:SaveFile={...migrated,events:[...migrated.events,next.event],state:next.state};expect(next.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-brother-sun-yi-killed-204')?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  });

  it('A215 v107 204 年存檔升至 v108 後續玩觸發 205 年節點並保留重播',()=>{
    const current=makeSave('phase6-v107-he-qi');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-107'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];for(const [index,days] of [3600,3600].entries()){const reached=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v107-he-qi-reach-204-${index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!reached.state||!reached.event)throw new Error('could not prepare v107 fixture');oldState=reached.state;oldEvents.push(reached.event);}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-he-qi-shangrao-205')?.status).toBe('pending');
    const next=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v107-he-qi-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!next.state||!next.event)throw new Error('could not advance migrated v107 fixture');const continued:SaveFile={...migrated,events:[...migrated.events,next.event],state:next.state};expect(next.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-he-qi-shangrao-205')?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A216 v108 209 年存檔升至 v110 後續玩觸發 210 年節點並保留重播',()=>{
    const current=makeSave('phase6-v108-reorganize');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-108'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];for(const [index,days] of [3600,3600,1800].entries()){const reached=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v108-reorganize-reach-209-${index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!reached.state||!reached.event)throw new Error('could not prepare v108 fixture');oldState=reached.state;oldEvents.push(reached.event);}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-reorganizes-yuzhang-changsha-210')?.status).toBe('pending');
    const next=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v108-reorganize-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!next.state||!next.event)throw new Error('could not advance migrated v108 fixture');const continued:SaveFile={...migrated,events:[...migrated.events,next.event],state:next.state};expect(next.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-reorganizes-yuzhang-changsha-210')?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A217 v109 207 年存檔升至 v110 後續玩觸發 208 年節點並保留重播',()=>{
    const current=makeSave('phase6-v109-huang-zu');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-109'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];for(const [index,days] of [3600,3600,1080].entries()){const reached=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v109-huang-zu-reach-207-${index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!reached.state||!reached.event)throw new Error('could not prepare v109 fixture');oldState=reached.state;oldEvents.push(reached.event);}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-defeats-huang-zu-jiangxia-208')?.status).toBe('pending');
    const next=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v109-huang-zu-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!next.state||!next.event)throw new Error('could not advance migrated v109 fixture');const continued:SaveFile={...migrated,events:[...migrated.events,next.event],state:next.state};expect(next.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-defeats-huang-zu-jiangxia-208')?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A218 v110 213 年存檔升至 v111 後續玩觸發皖城節點並保留重播',()=>{
    const current=makeSave('phase6-v110-wancheng');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-110'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];for(const [index,days] of [3600,3600,3240].entries()){const reached=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v110-wancheng-reach-213-${index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!reached.state||!reached.event)throw new Error('could not prepare v110 fixture');oldState=reached.state;oldEvents.push(reached.event);}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-captures-wancheng-214')?.status).toBe('pending');
    const next=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v110-wancheng-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!next.state||!next.event)throw new Error('could not advance migrated v110 fixture');const continued:SaveFile={...migrated,events:[...migrated.events,next.event],state:next.state};expect(next.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-captures-wancheng-214')?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A212 v105 存檔勘誤遷移、續玩 202 年並保留重播一致',()=>{
    const current=makeSave('phase6-v105-correction');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-105'}};
    const oldState=applyEvent(null,legacyStart)!;const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[legacyStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(legacyStart);
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-mother-dies-201')).toMatchObject({status:'cancelled'});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='sun-quan-mother-dies-202')?.status).toBe('pending');
    expect(migrated.state.phase4?.eventLedger.at(-1)?.type).toBe('史實資料勘誤');
    let advancedState=migrated.state;const continuationEvents:GameEvent[]=[];
    for(const [index,days] of [3600,2880].entries()){
      const advanced=dispatch(advancedState,{version:ENGINE_VERSION,commandId:`phase6-v105-correction-advance-${index}`,expectedRevision:advancedState.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});
      if(!advanced.state||!advanced.event)throw new Error('could not advance migrated v105 fixture');
      advancedState=advanced.state;continuationEvents.push(advanced.event);
    }
    const continued:SaveFile={...migrated,events:[...migrated.events,...continuationEvents],state:advancedState};
    expect(advancedState.phase4?.nodes.find(node=>node.contentId==='sun-quan-mother-dies-202')?.status).toBe('triggered');
    expect(replay(continued.events)).toEqual(continued.state);
    expect(verifySave(toJson(continued))).toEqual(continued);
  });

  it('v3.16 v6 存檔升至 v3.17 只追加來源版本事件，保留既有事件與結算',()=>{
    const current=makeSave('rules-316-to-317');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const priorHashes={rules:'042ee27fc3e6bf373db7851ce8ad38c5448978c58bb36dfc292c89d046cc5832',skills:SOURCE_HASHES.skills};
    const priorStart:GameEvent={...start,payload:{...start.payload,rulesVersion:'3.16',sourceHashes:priorHashes}};
    const priorState=applyEvent(null,priorStart)!;const old:SaveFile={...current,events:[priorStart],state:priorState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(priorStart);
    expect(migrated.events.slice(1).map(event=>event.type)).toEqual(['RulesUpdated']);
    expect(migrated.events[1]).toMatchObject({type:'RulesUpdated',payload:{fromVersion:'3.16',toVersion:'3.17',sourceHashes:SOURCE_HASHES}});
    expect(migrated.state.rulesVersion).toBe('3.17');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
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
    const update11:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:11`,commandId:'phase4-content-v11',commandHash:'phase4-content-v11',revision:11,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-11'}};state=applyEvent(state,update11);events.push(update11);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-shao-dies-202')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='white-wolf-mountain-207')).toBe(false);const update12:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:12`,commandId:'phase4-content-v12',commandHash:'phase4-content-v12',revision:12,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-12'}};state=applyEvent(state,update12);events.push(update12);expect(state.phase4?.nodes.some(node=>node.contentId==='white-wolf-mountain-207')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-tan-defeat-205')).toBe(false);const update13:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:13`,commandId:'phase4-content-v13',commandHash:'phase4-content-v13',revision:13,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-13'}};state=applyEvent(state,update13);events.push(update13);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-tan-defeat-205')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='ye-falls-204')).toBe(false);const update14:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:14`,commandId:'phase4-content-v14',commandHash:'phase4-content-v14',revision:14,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-14'}};state=applyEvent(state,update14);events.push(update14);expect(state.phase4?.nodes.some(node=>node.contentId==='ye-falls-204')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-brothers-conflict-203')).toBe(false);const update15:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':15',commandId:'phase4-content-v15',commandHash:'phase4-content-v15',revision:15,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-15'}};state=applyEvent(state,update15);events.push(update15);expect(state.phase4?.nodes.some(node=>node.contentId==='yuan-brothers-conflict-203')).toBe(true);expect(state.phase4?.nodes.some(node=>node.contentId==='gao-gan-defeat-206')).toBe(false);const update16:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':16',commandId:'phase4-content-v16',commandHash:'phase4-content-v16',revision:16,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-16'}};state=applyEvent(state,update16);events.push(update16);expect(state.phase4?.nodes.some(node=>node.contentId==='gao-gan-defeat-206')).toBe(true);const update17:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':17',commandId:'phase4-content-v17',commandHash:'phase4-content-v17',revision:17,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-17'}};state=applyEvent(state,update17);events.push(update17);expect(state.phase4?.nodes.map(node=>node.contentId).filter(id=>['tong-pass-campaign-211','yi-province-surrender-214','han-zhong-campaign-215'].includes(id))).toEqual(['tong-pass-campaign-211','yi-province-surrender-214','han-zhong-campaign-215']);const update18:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':18',commandId:'phase4-content-v18',commandHash:'phase4-content-v18',revision:18,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-18'}};state=applyEvent(state,update18);events.push(update18);expect(state.phase4?.nodes.some(node=>node.contentId==='hou-yin-rebellion-218')).toBe(true);const update19:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':19',commandId:'phase4-content-v19',commandHash:'phase4-content-v19',revision:19,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-19'}};state=applyEvent(state,update19);events.push(update19);expect(state.phase4?.nodes.map(node=>node.contentId).filter(id=>['cao-campaign-guangling-224','zhugeliang-south-campaign-225','cao-pi-death-cao-rui-accession-226','zhugeliang-moves-to-hanzhong-227'].includes(id))).toEqual(['cao-campaign-guangling-224','zhugeliang-south-campaign-225','cao-pi-death-cao-rui-accession-226','zhugeliang-moves-to-hanzhong-227']);const update20:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':20',commandId:'phase4-content-v20',commandHash:'phase4-content-v20',revision:20,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-20'}};state=applyEvent(state,update20);events.push(update20);expect(state.phase4?.nodes.some(node=>node.contentId==='wu-expedition-yizhou-230')).toBe(true);const update21:GameEvent={version:ENGINE_VERSION,eventId:state.worldlineId+':21',commandId:'phase4-content-v21',commandHash:'phase4-content-v21',revision:21,type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-21'}};state=applyEvent(state,update21);events.push(update21);expect(state.phase4?.nodes.some(node=>node.contentId==='pan-jun-wuling-expedition-231')).toBe(true);expect(replay(events)).toEqual(state);
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
    const migrated=verifySave(toJson(oldSave));expect(migrated.events.slice(0,oldPrefix.length)).toEqual(oldPrefix);for(const [id,year] of [['guan-yu-falls-219',219],['liu-bei-proclaims-emperor-221',221],['yiling-campaign-222',222],['liu-bei-dies-223',223],['zhuge-liang-first-northern-expedition-228',228],['sun-quan-proclaims-emperor-229',229],['zhuge-liang-dies-234',234],['gaopingling-249',249],['tong-pass-campaign-211',211],['yi-province-surrender-214',214],['han-zhong-campaign-215',215]] as const)expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:year,evidence:['此歷史內容於目前存檔日期後才加入；不回溯觸發。']});expect(migrated.state.phase4?.eventLedger.some(event=>['荊州失守、關羽遇害','劉備於成都即皇帝位','夷陵戰局逆轉','劉備崩於永安宮','諸葛亮首次北伐與街亭失利','孫權即皇帝位','諸葛亮病卒於渭濱','高平陵政局轉折','潼關戰事與關中平定','雒城陷落與劉璋出降','曹操征定漢中、張魯出降'].some(title=>event.detail.includes(title)))).toBe(false);expect(replay(migrated.events)).toEqual(migrated.state);
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

  it('A264 v136 的 243 年 v6 存檔升至 v138、續玩觸發陸遜拜相且可重播',()=>{
    const current=makeSave('phase6-v136-lu-xun-chancellor');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-136'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(243-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v136-lu-xun-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v136 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='sun-quan-appoints-lu-xun-chancellor-244';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v136-lu-xun-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event)throw new Error('could not trigger migrated v136 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },30000);

  it('A222 v111 的 220 年 v6 JSON 升級至 v115、跨年觸發孫登節點並保持可重播',()=>{
    const current=makeSave('phase6-v111-sun-deng');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-111'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(220-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v111-sun-deng-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v111 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='sun-quan-wei-envoys-and-sun-deng-investiture-221';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='wu-chancellor-succession-225')?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v111-sun-deng-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event)throw new Error('could not trigger migrated v111 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A224 v112 的 224 年 v6 JSON 升級新增 225 年史事、續玩可觸發並可重播',()=>{
    const current=makeSave('phase6-v112-gu-yong');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-112'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(224-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v112-gu-yong-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v112 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='wu-chancellor-succession-225';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v112-gu-yong-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v112 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(result.event.payload).toMatchObject({action:{type:'AdvanceDays',days:360}});expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A226 v113 的 199 年 v6 JSON 升至 v116、續玩觸發李術節點並保持可重播',()=>{
    const current=makeSave('phase6-v113-li-shu');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-113'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(199-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:'phase6-v113-li-shu-'+(++index),expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v113 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='sun-quan-defeats-li-shu-200';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v113-li-shu-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v113 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A227 v114 的 205 年 v6 JSON 升至 v116、續玩觸發周瑜節點並保持可重播',()=>{
    const current=makeSave('phase6-v114-deng-long');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-114'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(205-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:'phase6-v114-deng-long-'+(++index),expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v114 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='zhou-yu-captures-deng-long-206';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v114-deng-long-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v114 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A228 v115 的 201 年 v6 JSON 升至 v116、續玩觸發索質節點並保持可重播',()=>{
    const current=makeSave('phase6-v115-hostage-demand');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-115'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(201-oldState.phase4!.year)*360,index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:'phase6-v115-hostage-demand-'+(++index),expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v115 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='sun-quan-refuses-hostage-demand-202';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v115-hostage-demand-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v115 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A231 v116 的 226 年 v6 JSON 升至 v118、續玩觸發孫權政令並保持可重播',()=>{
    const current=makeSave('phase6-v116-sun-quan-decree');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-116'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(226-oldState.phase4!.year)*360,index=0;while(remainingDays>0){const days=Math.min(3650,remainingDays);const advanced=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v116-decree-reach-226-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!advanced.state||!advanced.event)throw new Error('could not prepare v116 fixture');oldState=advanced.state;oldEvents.push(advanced.event);remainingDays-=days;}const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const nodeId='sun-quan-protects-families-of-defectors-227';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v116-decree-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v116 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

  it('A232 v117 的 228 年 v6 JSON 只追加遷移、跨年至 229 觸發新節點且可重播',()=>{
    const current=makeSave('phase6-v117-229-milestones');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const legacyStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-117'}};let oldState=applyEvent(null,legacyStart)!;const oldEvents:GameEvent[]=[legacyStart];let remainingDays=(228-oldState.phase4!.year)*360,index=0;while(remainingDays>0){const days=Math.min(3650,remainingDays);const advanced=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v117-229-reach-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!advanced.state||!advanced.event)throw new Error('could not prepare v117 fixture');oldState=advanced.state;oldEvents.push(advanced.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};const migrated=verifySave(toJson(old));const newIds=['wu-shu-alliance-partition-229','sun-quan-moves-capital-to-jianye-229'];
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});for(const id of newIds)expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v117-229-advance',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated v117 save');const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};for(const id of newIds)expect(result.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');expect(replay(continued.events)).toEqual(continued.state);expect(verifySave(toJson(continued))).toEqual(continued);

    const currentYearStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-117'}};let sameYearState=applyEvent(null,currentYearStart)!;const sameYearEvents:GameEvent[]=[currentYearStart];remainingDays=(229-sameYearState.phase4!.year)*360;index=0;while(remainingDays>0){const days=Math.min(3650,remainingDays);const advanced=dispatch(sameYearState,{version:ENGINE_VERSION,commandId:`phase6-v117-229-late-${++index}`,expectedRevision:sameYearState.revision,worldlineId:sameYearState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!advanced.state||!advanced.event)throw new Error('could not prepare same-year v117 fixture');sameYearState=advanced.state;sameYearEvents.push(advanced.event);remainingDays-=days;}const late=verifySave(toJson({...current,worldlineId:sameYearState.worldlineId,events:sameYearEvents,state:sameYearState}));for(const id of newIds)expect(late.state.phase4?.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:229});expect(late.state.phase4?.eventLedger.some(item=>item.detail.includes('吳蜀盟約分州、共同討魏'))).toBe(false);expect(late.state.phase4?.eventLedger.some(item=>item.detail.includes('孫權遷都建業、命陸遜留武昌輔太子'))).toBe(false);
  },15000);

  it('A233 v118 v6 JSON 直接升至目前 v122 時只追加內容更新事件並保留可重播前綴',()=>{
    const current=makeSave('phase6-v118-date-notes');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-118'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v118 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A234 v119 v6 JSON 升至目前 v122 時保留前綴且可重播',()=>{
    const current=makeSave('phase6-v119-date-notes');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-119'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v119 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A235 v120 v6 JSON 升至 v122 時只追加內容更新事件並保留可重播前綴',()=>{
    const current=makeSave('phase6-v120-submit-context');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-120'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v120 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });
  it('A236 v121 v6 JSON 直接升至 v123 時只追加內容更新事件並保留可重播前綴',()=>{
    const current=makeSave('phase6-v121-wuchang-221');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-121'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v121 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));const nodeId='sun-quan-builds-wuchang-and-warns-generals-221';
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A237 v122 v6 JSON 升至 v123 時只追加內容更新事件並保留可重播前綴',()=>{
    const current=makeSave('phase6-v122-sweet-dew-report');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-122'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v122 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));const nodeId='sun-quan-capital-reports-sweet-dew-221';
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
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

  it('A238 v123 v6 JSON 升至 v124 時只追加內容更新事件並保留可重播前綴',()=>{
    const current=makeSave('phase6-v123-imperial-title-refusal');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-123'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v123 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));const nodeId='sun-quan-declines-imperial-title-221';
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A239 v124 v6 JSON 存檔升至 v125 時保留前綴並只觸發未來節點',()=>{
    const current=makeSave('phase6-v124-dongkou-campaign');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-124'}};
    const oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v124 fixture');
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:[oldStart],state:oldState};
    const migrated=verifySave(toJson(old));const nodeId='wei-three-front-campaign-and-dongkou-storm-222';
    expect(migrated.events[0]).toEqual(oldStart);
    expect(migrated.events[1]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.contentVersion).toBe('phase4-scenario-138');
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('pending');
    expect(replay(migrated.events)).toEqual(migrated.state);
    expect(verifySave(toJson(migrated))).toEqual(migrated);

    const alreadyPassedCurrent=makeSave('phase6-v124-dongkou-passed');const alreadyPassedWorldStart=alreadyPassedCurrent.events[0];if(alreadyPassedWorldStart.type!=='WorldCreated')throw new Error('expected opening event');
    const alreadyPassedStart:GameEvent={...alreadyPassedWorldStart,payload:{...alreadyPassedWorldStart.payload,phase4ContentVersion:'phase4-scenario-124'}};
    let alreadyPassedState=applyEvent(null,alreadyPassedStart);if(!alreadyPassedState)throw new Error('could not build 124 fixture');
    const alreadyPassedEvents:GameEvent[]=[alreadyPassedStart];let remainingDays=(222-alreadyPassedState.phase4!.year)*360;let index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(alreadyPassedState,{version:ENGINE_VERSION,commandId:`phase6-v124-dongkou-passed-${++index}`,expectedRevision:alreadyPassedState.revision,worldlineId:alreadyPassedState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare 222 fixture');alreadyPassedState=result.state;alreadyPassedEvents.push(result.event);remainingDays-=days;}
    const alreadyPassed=verifySave(toJson({...alreadyPassedCurrent,worldlineId:alreadyPassedState.worldlineId,events:alreadyPassedEvents,state:alreadyPassedState}));
    expect(alreadyPassed.state.phase4?.nodes.find(node=>node.contentId===nodeId)).toMatchObject({status:'resolved',resolvedYear:222});
    expect(alreadyPassed.state.phase4?.eventLedger.some(item=>item.detail.includes('洞口風災造成呂範部下溺亡'))).toBe(false);
  });

  it('A247 v131 v6 JSON 升至 v132 後續玩可觸發同一個 219 節點並重播',()=>{
    const current=makeSave('phase6-v131-jingzhou');const start=current.events[0];if(start.type!=='WorldCreated')throw new Error('expected opening event');
    const oldStart:GameEvent={...start,payload:{...start.payload,phase4ContentVersion:'phase4-scenario-131'}};
    let oldState=applyEvent(null,oldStart);if(!oldState)throw new Error('could not build v131 fixture');
    const oldEvents:GameEvent[]=[oldStart];let remainingDays=(218-oldState.phase4!.year)*360;let index=0;
    while(remainingDays>0){const days=Math.min(3650,remainingDays);const result=dispatch(oldState,{version:ENGINE_VERSION,commandId:`phase6-v131-jingzhou-${++index}`,expectedRevision:oldState.revision,worldlineId:oldState.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days}});if(!result.state||!result.event)throw new Error('could not prepare v131 save');oldState=result.state;oldEvents.push(result.event);remainingDays-=days;}
    const old:SaveFile={...current,worldlineId:oldState.worldlineId,events:oldEvents,state:oldState};
    const migrated=verifySave(toJson(old));const nodeId='guan-yu-falls-219';
    expect(migrated.events.slice(0,oldEvents.length)).toEqual(oldEvents);
    expect(migrated.events[oldEvents.length]).toMatchObject({type:'Phase4ContentUpdated',payload:{contentVersion:'phase4-scenario-138'}});
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===nodeId)).toMatchObject({status:'pending',evidence:[expect.stringContaining('史料補充')]});
    expect(migrated.state.phase4?.eventLedger.some(event=>event.type==='史實來源補充')).toBe(true);
    const result=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'phase6-v131-jingzhou-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!result.state||!result.event||result.event.type!=='Phase4Changed')throw new Error('could not trigger migrated 219 save');
    expect(result.state.phase4?.nodes.find(node=>node.contentId===nodeId)?.status).toBe('triggered');
    expect(result.state.phase4?.eventLedger.filter(event=>event.type==='史實事件形成'&&event.detail.includes('孫權取荊州、關羽敗亡'))).toHaveLength(1);
    const continued:SaveFile={...migrated,events:[...migrated.events,result.event],state:result.state};
    expect(replay(continued.events)).toEqual(continued.state);
    expect(verifySave(toJson(continued))).toEqual(continued);
  },15000);

});
