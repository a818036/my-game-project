import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent, type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='south-palace-fire-185';
function world():GameState{
  const facts=createOpeningFacts(489,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a489-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:489,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV175Save(year:number):SaveFile{
  const facts=createOpeningFacts(489,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:`a489-v175-${year}`,expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:489,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v175 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-175'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v175 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A489 185 年南宮大火與修宮室徵稅',()=>{
  it('新局及年表問答保留原典內容、日期精度與界線',()=>{
    const fresh=advancePhase4(createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION),360);
    const event=fresh.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('南宮大火'));
    expect(fresh.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(event?.source).toContain('二月己酉');
    expect(event?.source).toContain('火半月乃滅');
    expect(event?.source).toContain('稅天下田畝十錢');
    expect(event?.source).toContain('不虛構死傷');
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content?.precision).toBe('year');
    expect(content?.sourceDateNote).toContain('不換算模型月日');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('火半月乃滅');
    const answer=answerKnownHistoricalEventQuestion('西元 185 年發生了什麼事？',world());
    expect(answer?.answer).toContain('南宮大火');
    expect(answer?.answer).toContain('《後漢書》卷八');
    const before=createPhase4Model(184,1,persons,'phase4-scenario-175'),prefix=structuredClone(before.eventLedger),upgraded=upgradePhase4Content(before,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [185,186]){const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-175'),PHASE4_CONTENT_VERSION);expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:185});expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('南宮大火'))).toBe(false);}
  });

  it('v175 v6 JSON 存檔升級、續玩與重播一致，已到年份不回補',()=>{
    const old=oldV175Save(184),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a489-v175-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v175 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(continued.state.phase4?.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('南宮大火'))).toBe(true);
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
