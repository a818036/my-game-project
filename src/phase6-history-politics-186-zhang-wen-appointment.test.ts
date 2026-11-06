import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='zhang-wen-appointed-grand-commandant-186';
function world():GameState{
  const facts=createOpeningFacts(508,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a508-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:508,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV194Save():SaveFile{
  const facts=createOpeningFacts(508,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a508-v194-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:508,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v194 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-194'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v194 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A508 186 年張延、張溫太尉更替記事',()=>{
  it('記錄張延免職及張溫在長安受拜，不推演其他官制效果',()=>{
    const advanced=advancePhase4(createPhase4Model(185,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('張延罷太尉'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('太尉張延罷');
    expect(event?.source).toContain('就長安拜張溫為太尉');
    expect(event?.source).toContain('三公在外始於溫');
    expect(event?.source).toContain('不推測張延後續');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:186,endYear:186,precision:'year',introducedIn:'phase4-scenario-195',lateSameYear:true});
    expect(answerKnownHistoricalEventQuestion('西元 186 年發生了什麼事？',world())?.answer).toContain('張溫');
    const old=upgradePhase4Content(createPhase4Model(185,1,persons,'phase4-scenario-194'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [186,187]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-194'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:186});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('張延罷太尉'))).toBe(false);
    }
  });

  it('v194 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV194Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a508-v194-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:720}});
    if(!continued.state||!continued.event)throw new Error('could not continue v194 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
