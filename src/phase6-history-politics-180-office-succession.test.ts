import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='taiwei-sikong-succession-180';
function oldV216Save(year=169):SaveFile{
  const facts=createOpeningFacts(532,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a532-v216-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:532,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v216 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-216'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v216 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A532 更正太尉、司空任免為建寧三年（170）',()=>{
  it('合記原典任免，保留月份而不推演任期與官制效果',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:170,endYear:170,precision:'year',introducedIn:'phase4-scenario-217',lateSameYear:true});
    expect(node?.source).toContain('郭禧罷、聞人襲繼任');
    expect(node?.source).toContain('劉囂罷，八月橋玄任司空');
    expect(node?.description).toContain('不推演任免原因、實際任期');
    expect(node?.sourceDateNote).toContain('夏四月');
    expect(node?.sourceDateNote).toContain('秋七月');
    expect(node?.sourceDateNote).toContain('八月');
    expect(advancePhase4(createPhase4Model(169,1,persons,PHASE4_CONTENT_VERSION),360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('v216 v6 JSON 升級保留事件帳，169 年續玩觸發，170 年以上不回補',()=>{
    const old=oldV216Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a532-v216-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v216 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [170,171]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-216'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:170});
      expect(late.eventLedger.some(item=>item.detail.includes('建寧三年太尉、司空任免'))).toBe(false);
    }
  });
});
