import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='jiaozhi-wuhuh-man-uprising-178';
function world():GameState{
  const facts=createOpeningFacts(521,177,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a521-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:521,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV207Save():SaveFile{
  const facts=createOpeningFacts(521,177,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a521-v207-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:521,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v207 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-207'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v207 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A521 178 年烏滸起事補列漢曆日期與來源概數',()=>{
  it('同一節點記錄春正月與「合數萬人」，不推成精確人口或兵力',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:178,endYear:178,precision:'year',introducedIn:'phase4-scenario-145',lateSameYear:true});
    expect(node?.source).toContain('卷八十六〈南蠻西南夷列傳〉');
    expect(node?.source).toContain('合數萬人');
    expect(node?.description).toContain('不推定精確參與人數');
    expect(node?.sourceDateNote).toContain('春正月');
    expect(node?.sourceDateNote).toContain('不換算為模型日期或精確兵力');
    const fresh=advancePhase4(createPhase4Model(177,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(fresh.nodes.filter(item=>item.contentId===id)).toHaveLength(1);
    expect(fresh.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const answer=answerKnownHistoricalEventQuestion('西元 178 年發生了什麼事？',world());
    expect(answer?.answer).toContain('合浦、交阯烏滸民起事並攻沒郡縣');
    expect(answer?.answer).toContain('卷八十六');
    expect(answer?.answer).toContain('概數');
  });

  it('v207 v6 JSON 升級保留事件帳、續玩觸發且可重播與再匯出',()=>{
    const old=oldV207Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const node=migrated.state.phase4?.nodes.find(item=>item.contentId===id);
    expect(node?.status).toBe('pending');
    expect(node?.evidence.some(item=>item.includes('光和元年烏滸起事來源補充'))).toBe(true);
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a521-v207-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v207 save');
    expect(continued.state.phase4?.nodes.filter(item=>item.contentId===id)).toHaveLength(1);
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
