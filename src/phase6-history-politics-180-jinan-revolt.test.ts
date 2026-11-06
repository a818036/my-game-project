import {describe,expect,it} from 'vitest';
import {createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const retiredId='jinan-revolt-dongpingling-180';
const canonicalId='jinan-revolt-dongpingling-170';
function oldV219Save(year=168):SaveFile{
  const facts=createOpeningFacts(535,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a530-v219-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:535,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v219 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-219'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v219 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A530 更正濟南起事重複記事',()=>{
  it('保留既有 170 年正確節點，將舊版錯誤的 180 年重複節點退役',()=>{
    const duplicate=HISTORY_CONTENT.find(item=>item.id===retiredId);
    const canonical=HISTORY_CONTENT.find(item=>item.id===canonicalId);
    expect(duplicate).toMatchObject({retired:true,retiredIn:'phase4-scenario-220'});
    expect(duplicate?.source).toContain('建寧三年（170）');
    expect(canonical?.source).toContain('濟南賊起');
    expect(duplicate?.sourceDateNote).toBeUndefined();
    expect(createPhase4Model(170,1,persons,PHASE4_CONTENT_VERSION).nodes.some(item=>item.contentId===retiredId)).toBe(false);
  });

  it('v219 舊 v6 存檔升版保留事件前綴，移除重複節點並可續玩至 170 年',()=>{
    const old=oldV219Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.some(item=>item.contentId===retiredId)).toBe(false);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===canonicalId)?.status).toBe('pending');
    const first=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a530-v219-year169',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!first.state||!first.event)throw new Error('could not continue v219 save to 169');
    const second=dispatch(first.state,{version:ENGINE_VERSION,commandId:'a530-v219-year170',expectedRevision:first.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!second.state||!second.event)throw new Error('could not continue v219 save to 170');
    expect(second.state.phase4?.nodes.find(item=>item.contentId===canonicalId)?.status).toBe('triggered');
    expect(second.state.phase4?.nodes.some(item=>item.contentId===retiredId)).toBe(false);
    const saved:SaveFile={...migrated,events:[...migrated.events,first.event,second.event],state:second.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });

  it('舊存檔已有誤年事件時保留舊帳目並追加勘誤，不回溯重算 170 年',()=>{
    const old=createPhase4Model(180,1,persons,'phase4-scenario-219');
    const wrong=old.nodes.find(item=>item.contentId===retiredId)!;
    const canonical=old.nodes.find(item=>item.contentId===canonicalId)!;
    wrong.status='triggered'; wrong.resolvedYear=180;
    canonical.status='triggered'; canonical.resolvedYear=170;
    old.eventLedger.push({id:'legacy-jinan-wrong-year',day:0,year:180,month:1,dayOfMonth:1,type:'史實事件形成',detail:'舊版誤繫年的濟南賊起攻東平陵事件',source:'《後漢書》卷八舊版錯誤註記'});
    const prefix=structuredClone(old.eventLedger),migrated=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.nodes.some(item=>item.contentId===retiredId)).toBe(false);
    expect(migrated.nodes.find(item=>item.contentId===canonicalId)).toMatchObject({status:'triggered',resolvedYear:170});
    expect(migrated.eventLedger.filter(item=>item.type==='史實資料勘誤'&&item.detail.includes('建寧三年（170）'))).toHaveLength(1);
    expect(migrated.eventLedger.some(item=>item.id==='legacy-jinan-wrong-year')).toBe(true);
  });
});
