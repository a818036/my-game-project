import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='zhao-zhong-appointed-chariot-general-186';
function world():GameState{
  const facts=createOpeningFacts(495,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a496-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:495,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV182Save():SaveFile{
  const facts=createOpeningFacts(495,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a496-v182-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:495,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v182 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-182'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v182 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A496 186 年趙忠任車騎將軍與傅爕拒絕私賞',()=>{
  it('記錄任命及拒賞，不把談及的萬戶侯寫成已授爵',()=>{
    const advanced=advancePhase4(createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION),720);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('趙忠任車騎將軍，傅爕拒絕私下封賞'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('以中常侍趙忠為車騎將軍');
    expect(event?.source).toContain('有功不論命也');
    expect(event?.source).toContain('不推演賞爵實際授予');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:186,endYear:186,precision:'year',introducedRevision:183,lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('中平三年春二月');
    const answer=answerKnownHistoricalEventQuestion('西元 186 年發生了什麼事？',world());
    expect(answer?.answer).toContain('趙忠任車騎將軍，傅爕拒絕私下封賞');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    expect(answer?.answer).toContain('日期僅記到年');
    const older=upgradePhase4Content(createPhase4Model(184,1,persons,'phase4-scenario-182'),PHASE4_CONTENT_VERSION);
    expect(older.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(older,720).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [186,187]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-182'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:186});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('趙忠任車騎將軍，傅爕拒絕私下封賞'))).toBe(false);
    }
  });

  it('v182 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV182Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a496-v182-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:720}});
    if(!continued.state||!continued.event)throw new Error('could not continue v182 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
