import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='former-grand-commandant-zhang-ting-dies-186';
function world():GameState{
  const facts=createOpeningFacts(506,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a506-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:506,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV192Save():SaveFile{
  const facts=createOpeningFacts(506,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a506-v192-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:506,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v192 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-192'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v192 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A506 186 年前太尉張廷記事',()=>{
  it('依來源記述張廷遭譖下獄而死，不推定人物對應或額外影響',()=>{
    const advanced=advancePhase4(createPhase4Model(185,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('前太尉張廷遭譖'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('前太尉張廷為宦官所譖，下獄死');
    expect(event?.source).toContain('不與其他同音或異寫人物合併');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:186,endYear:186,precision:'year',introducedIn:'phase4-scenario-193',sameYearMigrationIsLate:true});
    expect(answerKnownHistoricalEventQuestion('西元 186 年發生了什麼事？',world())?.answer).toContain('張廷');
    const old=upgradePhase4Content(createPhase4Model(185,1,persons,'phase4-scenario-192'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [186,187]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-192'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:186});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('前太尉張廷遭譖'))).toBe(false);
    }
  });

  it('v192 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV192Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a506-v192-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:720}});
    if(!continued.state||!continued.event)throw new Error('could not continue v192 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
