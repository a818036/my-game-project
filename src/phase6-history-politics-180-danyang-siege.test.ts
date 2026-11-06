import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='danyang-shanyue-siege-chen-yin-180';
function oldV212Save(year=179):SaveFile{
  const facts=createOpeningFacts(526,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a526-v212-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:526,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v212 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-212'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v212 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A526 補列 180 年丹陽山越圍太守記事',()=>{
  it('依《後漢書》記錄圍攻與陳夤擊破，不增補戰事細節',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:180,endYear:180,precision:'year',introducedIn:'phase4-scenario-213',sameYearMigrationIsLate:true});
    expect(node?.source).toContain('丹陽山越賊圍太守陳夤');
    expect(node?.source).toContain('夤擊破之');
    expect(node?.description).toContain('不推演兵力、戰術、傷亡');
    expect(node?.sourceDateNote).toBeUndefined();
    expect(advancePhase4(createPhase4Model(179,1,persons,PHASE4_CONTENT_VERSION),360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(answerKnownHistoricalEventQuestion('西元180年丹陽發生什麼事？',oldV212Save().state)?.answer).toContain('陳夤擊破');
  });

  it('v212 v6 JSON 升級保留事件帳，179 年續玩觸發，180 年以上不回補',()=>{
    const old=oldV212Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a526-v212-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v212 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [180,181]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-212'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:180});
      expect(late.eventLedger.some(item=>item.detail.includes('丹陽山越賊圍太守陳夤'))).toBe(false);
    }
  });
});
