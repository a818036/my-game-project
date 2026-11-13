import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='solar-eclipse-186';
function world():GameState{
  const facts=createOpeningFacts(505,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a505-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:505,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV191Save():SaveFile{
  const facts=createOpeningFacts(505,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a505-v191-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:505,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v191 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-191'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v191 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A505 186 年日食記事',()=>{
  it('保留漢曆日食日期註記，但只按年觸發且不推測影響',()=>{
    const advanced=advancePhase4(createPhase4Model(185,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('中平三年五月晦日發生日食'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('五月，壬辰晦，日有食之');
    expect(HISTORY_CONTENT.find(item=>item.id===id)?.source).toContain('不推測可見地域');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:186,endYear:186,precision:'year',introducedRevision:192,lateSameYear:true});
    expect(answerKnownHistoricalEventQuestion('西元 186 年發生了什麼事？',world())?.answer).toContain('日食');
    const old=upgradePhase4Content(createPhase4Model(185,1,persons,'phase4-scenario-191'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [186,187]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-191'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:186});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('中平三年五月晦日發生日食'))).toBe(false);
    }
  });

  it('v191 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV191Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a505-v191-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:720}});
    if(!continued.state||!continued.event)throw new Error('could not continue v191 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
