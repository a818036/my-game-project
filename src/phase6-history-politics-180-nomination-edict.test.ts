import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='scholar-nomination-edict-180';
function oldV211Save(year=179):SaveFile{
  const facts=createOpeningFacts(525,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a525-v211-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:525,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v211 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-211'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v211 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A525 補列 180 年舉薦通經者詔令',()=>{
  it('依原文記錄經典與議郎任用，問答附來源且只採年級日期',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:180,endYear:180,precision:'year',introducedIn:'phase4-scenario-212',lateSameYear:true});
    for(const phrase of ['公卿','《尚書》','《毛詩》','《左氏》','《穀梁春秋》','各一人','悉除議郎'])expect(node?.source).toContain(phrase);
    expect(node?.sourceDateNote).toContain('六月');
    expect(node?.sourceDateNote).toContain('不換算模型日期');
    const advanced=advancePhase4(createPhase4Model(179,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const answer=answerKnownHistoricalEventQuestion('西元 180 年朝廷有哪些舉薦通經者的詔令？',oldV211Save().state);
    expect(answer?.answer).toContain('悉除議郎');
  });

  it('v211 v6 JSON 升級保留事件帳，179 年續玩觸發，180 年以上不回補',()=>{
    const old=oldV211Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a525-v211-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v211 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [180,181]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-211'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:180});
      expect(late.eventLedger.some(item=>item.detail.includes('悉除議郎'))).toBe(false);
    }
  });
});
