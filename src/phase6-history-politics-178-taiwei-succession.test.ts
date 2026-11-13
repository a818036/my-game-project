import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='taiwei-succession-guanghe-1-178';
function oldV208Save():SaveFile{
  const facts=createOpeningFacts(522,177,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a522-v208-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:522,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v208 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-208'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v208 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A522 178 年太尉任免記事',()=>{
  it('按年記錄三次任免並保留漢曆日期精度',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:178,endYear:178,precision:'year',introducedRevision:209,lateSameYear:true});
    expect(node?.source).toContain('三月太常常山張顥為太尉');
    expect(node?.source).toContain('九月張顥罷');
    expect(node?.source).toContain('十二月丁巳');
    expect(node?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[id]).toContain('不換算模型日期');
    const advanced=advancePhase4(createPhase4Model(177,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const answer=answerKnownHistoricalEventQuestion('西元 178 年太尉有什麼變動？',oldV208Save().state);
    expect(answer?.answer).toContain('張顥任太尉，陳球、橋玄先後繼任');
  });

  it('v208 v6 JSON 升級保留舊事件帳且不回補 178 年',()=>{
    const old=oldV208Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a522-v208-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v208 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    const sameYear=upgradePhase4Content(createPhase4Model(178,1,persons,'phase4-scenario-208'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:178});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('橋玄繼任太尉'))).toBe(false);
    const late=upgradePhase4Content(createPhase4Model(179,1,persons,'phase4-scenario-208'),PHASE4_CONTENT_VERSION);
    expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:178});
  });
});
