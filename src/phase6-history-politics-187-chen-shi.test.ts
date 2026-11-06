import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='chen-shi-dies-187';
function world():GameState{
  const facts=createOpeningFacts(502,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a502-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:502,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV188Save():SaveFile{
  const facts=createOpeningFacts(502,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a502-v188-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:502,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v188 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-188'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v188 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A502 187 年陳寔去世記事',()=>{
  it('依年級記錄陳寔去世與赴弔者，不代替死亡系統結算',()=>{
    const advanced=advancePhase4(createPhase4Model(186,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('陳寔去世'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('前太丘長陳寔卒');
    expect(event?.source).toContain('三萬餘人');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:187,endYear:187,precision:'year',introducedIn:'phase4-scenario-189',lateSameYear:true});
    const answer=answerKnownHistoricalEventQuestion('西元 187 年發生了什麼事？',world());
    expect(answer?.answer).toContain('陳寔去世');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    const old=upgradePhase4Content(createPhase4Model(185,1,persons,'phase4-scenario-188'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,720).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [187,188]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-188'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:187});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('陳寔去世'))).toBe(false);
    }
  });

  it('v188 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV188Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a502-v188-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:1080}});
    if(!continued.state||!continued.event)throw new Error('could not continue v188 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
