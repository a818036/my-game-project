import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='yang-ci-chen-dan-minister-of-masses-181';
function world():GameState{
  const facts=createOpeningFacts(515,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a515-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:515,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV201Save():SaveFile{
  const facts=createOpeningFacts(515,180,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a515-v201-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:515,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v201 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-201'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v201 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A515 181 年司徒任免記事',()=>{
  it('按來源次序記錄楊賜免職、陳耽繼任，不推測任免原因與任期',()=>{
    const advanced=advancePhase4(createPhase4Model(180,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('楊賜免司徒'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('司徒楊賜罷');
    expect(event?.source).toContain('冬十月太常陳耽為司徒');
    expect(event?.source).toContain('不推測楊賜免職原因');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:181,endYear:181,precision:'year',introducedRevision:202,lateSameYear:true});
    expect(answerKnownHistoricalEventQuestion('西元 181 年司徒有哪些史實變更？',world())?.answer).toContain('楊賜免司徒');
    const old=upgradePhase4Content(createPhase4Model(180,1,persons,'phase4-scenario-201'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [181,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-201'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:181});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('楊賜免司徒'))).toBe(false);
    }
  });

  it('v201 v6 JSON 升級續玩後可觸發，保留舊事件前綴並可重播再匯出',()=>{
    const old=oldV201Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a515-v201-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v201 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
