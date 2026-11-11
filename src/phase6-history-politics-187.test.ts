import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='xingyang-revolt-suppressed-187';
function world():GameState{
  const facts=createOpeningFacts(497,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a497-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:497,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV183Save():SaveFile{
  const facts=createOpeningFacts(497,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a497-v183-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:497,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v183 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-183'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v183 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A497 187 年滎陽賊起事與何苗討平',()=>{
  it('記錄何苗討平、受封記事，問答附來源且維持年級精度',()=>{
    const advanced=advancePhase4(createPhase4Model(186,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('滎陽賊起事、何苗討平並受封'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('《後漢書》卷八');
    expect(event?.source).toContain('卷六十九〈何進列傳〉');
    expect(event?.source).toContain('封濟陽侯');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:187,endYear:187,precision:'year',introducedRevision:184,lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('來源未標記事月日');
    const answer=answerKnownHistoricalEventQuestion('西元 187 年發生了什麼事？',world());
    expect(answer?.answer).toContain('滎陽賊起事、何苗討平並受封');
    expect(answer?.answer).toContain('卷六十九〈何進列傳〉');
    expect(answer?.answer).toContain('日期僅記到年');
    const old=upgradePhase4Content(createPhase4Model(186,1,persons,'phase4-scenario-183'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [187,188]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-183'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:187});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('滎陽賊起事、何苗討平並受封'))).toBe(false);
    }
  });

  it('v183 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV183Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a497-v183-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:1080}});
    if(!continued.state||!continued.event)throw new Error('could not continue v183 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
