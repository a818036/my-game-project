import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='epidemic-185';
function world():GameState{
  const facts=createOpeningFacts(491,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a491-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:491,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV177Save():SaveFile{
  const facts=createOpeningFacts(491,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a491-v177-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:491,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v177 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-177'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v177 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A491 185 年大疫記事',()=>{
  it('保留正月原史註記但只按年觸發，問答不虛構疫病細節',()=>{
    const advanced=advancePhase4(createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('中平二年春正月大疫'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('春正月大疫');
    expect(event?.source).toContain('不推演疫病模型');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:185,endYear:185,precision:'year',introducedIn:'phase4-scenario-178',lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不換算為模型日期');
    const answer=answerKnownHistoricalEventQuestion('西元 185 年發生了什麼事？',world());
    expect(answer?.answer).toContain('春正月大疫');
    expect(answer?.answer).toContain('《後漢書》卷八');
    const older=upgradePhase4Content(createPhase4Model(184,1,persons,'phase4-scenario-177'),PHASE4_CONTENT_VERSION);
    expect(older.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(older,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [185,186]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-177'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:185});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('中平二年春正月大疫'))).toBe(false);
    }
  });

  it('v177 v6 JSON 升級後續玩、重播與再匯出結果一致',()=>{
    const old=oldV177Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a491-v177-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v177 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
