import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='solar-eclipse-180-march';
function oldV217Save(year=169):SaveFile{
  const facts=createOpeningFacts(533,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a533-v217-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:533,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v217 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-217'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v217 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A533 更正日食記事為建寧三年（170）',()=>{
  it('保留三月晦日與干支，不推測觀測或政治後果',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:170,endYear:170,precision:'year',introducedIn:'phase4-scenario-218',lateSameYear:true});
    expect(node?.source).toContain('三月丙寅晦，日有食之');
    expect(node?.description).toContain('不推定觀測地');
    expect(node?.sourceDateNote).toContain('三月丙寅晦');
    expect(advancePhase4(createPhase4Model(169,1,persons,PHASE4_CONTENT_VERSION),360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('v217 v6 JSON 升級保留事件帳，169 年續玩觸發，170 年以上不回補',()=>{
    const old=oldV217Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a533-v217-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v217 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [170,171]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-217'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:170});
      expect(late.eventLedger.some(item=>item.detail.includes('建寧三年三月晦日日食'))).toBe(false);
    }
  });
});
