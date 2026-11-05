import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='yongle-palace-office-disaster-182';
function world():GameState{
  const facts=createOpeningFacts(519,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a519-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:519,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV205Save():SaveFile{
  const facts=createOpeningFacts(519,181,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a519-v205-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:519,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v205 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-205'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v205 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A519 182 年永樂宮署記事',()=>{
  it('保留原史日期註記，不補災因、損失或後續影響',()=>{
    const advanced=advancePhase4(createPhase4Model(181,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('永樂宮署受災'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('五月庚申，永樂宮署災');
    expect(event?.source).toContain('不推定災害成因');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:182,endYear:182,precision:'year',introducedIn:'phase4-scenario-206',sameYearMigrationIsLate:true});
    expect(answerKnownHistoricalEventQuestion('西元 182 年發生了什麼事？',world())?.answer).toContain('永樂宮署受災');
    const old=upgradePhase4Content(createPhase4Model(181,1,persons,'phase4-scenario-205'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [182,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-205'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:182});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('永樂宮署受災'))).toBe(false);
    }
  });

  it('v205 v6 JSON 升級續玩後可觸發，保留舊事件前綴並可重播再匯出',()=>{
    const old=oldV205Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a519-v205-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v205 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
