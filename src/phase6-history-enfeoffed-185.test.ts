import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='zhang-rang-eunuchs-enfeoffed-185';
function world():GameState{
  const facts=createOpeningFacts(495,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a495-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:495,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV181Save():SaveFile{
  const facts=createOpeningFacts(495,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a495-v181-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:495,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v181 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-181'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v181 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A495 185 年張讓等中常侍受封列侯',()=>{
  it('記錄原文所載授爵與漢曆月份，不補完整姓名或政治效果',()=>{
    const advanced=advancePhase4(createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('張讓等十二名中常侍因討張角功受封列侯'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('封中常侍張讓等十二人為列侯');
    expect(event?.source).toContain('不由「等十二人」推列未載姓名');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:185,endYear:185,precision:'year',introducedRevision:182,lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('中平二年六月');
    const answer=answerKnownHistoricalEventQuestion('西元 185 年發生了什麼事？',world());
    expect(answer?.answer).toContain('張讓等十二名中常侍因討張角功受封列侯');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    expect(answer?.answer).toContain('不換算模型日期');
    const older=upgradePhase4Content(createPhase4Model(184,1,persons,'phase4-scenario-181'),PHASE4_CONTENT_VERSION);
    expect(older.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(older,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [185,186]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-181'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:185});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('張讓等十二名中常侍因討張角功受封列侯'))).toBe(false);
    }
  });

  it('v181 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV181Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a495-v181-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v181 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
