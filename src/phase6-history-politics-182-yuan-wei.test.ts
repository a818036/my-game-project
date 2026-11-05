import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='chen-dan-yuan-wei-minister-of-masses-182';
function world():GameState{
  const facts=createOpeningFacts(518,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a518-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:518,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV204Save():SaveFile{
  const facts=createOpeningFacts(518,181,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a518-v204-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:518,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v204 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-204'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v204 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A518 182 年司徒任免記事',()=>{
  it('記錄陳耽免職與袁隗繼任，保留月份來源且不推測原因',()=>{
    const advanced=advancePhase4(createPhase4Model(181,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('陳耽免司徒'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('三月司徒陳耽免');
    expect(event?.source).toContain('夏四月以太常袁隗為司徒');
    expect(event?.source).toContain('不推測陳耽免職原因');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:182,endYear:182,precision:'year',introducedIn:'phase4-scenario-205',sameYearMigrationIsLate:true});
    expect(answerKnownHistoricalEventQuestion('西元 182 年發生了什麼事？',world())?.answer).toContain('陳耽免司徒');
    const old=upgradePhase4Content(createPhase4Model(181,1,persons,'phase4-scenario-204'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [182,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-204'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:182});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('陳耽免司徒'))).toBe(false);
    }
  });

  it('v204 v6 JSON 升級續玩後可觸發，保留舊事件前綴並可重播再匯出',()=>{
    const old=oldV204Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a518-v204-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v204 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
