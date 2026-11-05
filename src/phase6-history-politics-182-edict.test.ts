import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='ling-emperor-inspection-edict-chen-dan-remonstrance-182';
function world():GameState{
  const facts=createOpeningFacts(517,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a517-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:517,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV203Save():SaveFile{
  const facts=createOpeningFacts(517,181,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a517-v203-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:517,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v203 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-203'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v203 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A517 182 年舉劾爭議與陳耽上言',()=>{
  it('按來源記錄詔舉、陳耽上言與後續，不將指控寫成裁定或改革',()=>{
    const advanced=advancePhase4(createPhase4Model(181,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('詔舉刺史'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('朝廷詔公卿舉劾刺史、二千石');
    expect(event?.source).toContain('司徒陳耽上言');
    expect(event?.source).toContain('悉拜議郎');
    expect(event?.source).toContain('不將指控作為獨立裁定');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:182,endYear:182,precision:'year',introducedIn:'phase4-scenario-204',sameYearMigrationIsLate:true});
    expect(answerKnownHistoricalEventQuestion('西元 182 年發生了什麼事？',world())?.answer).toContain('陳耽進諫');
    const old=upgradePhase4Content(createPhase4Model(181,1,persons,'phase4-scenario-203'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [182,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-203'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:182});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('詔舉刺史'))).toBe(false);
    }
  });

  it('v203 v6 JSON 升級續玩後可觸發，保留舊事件前綴並可重播再匯出',()=>{
    const old=oldV203Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a517-v203-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v203 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
