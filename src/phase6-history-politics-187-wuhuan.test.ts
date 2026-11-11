import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='zhang-chun-wuhuan-revolt-187';
function world():GameState{
  const facts=createOpeningFacts(500,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a500-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:500,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV186Save():SaveFile{
  const facts=createOpeningFacts(500,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a500-v186-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:500,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v186 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-186'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v186 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A500 187 年張純聯合張舉與烏桓起兵',()=>{
  it('記錄連盟、攻殺官員與自立名號，不推演後續戰局',()=>{
    const advanced=advancePhase4(createPhase4Model(186,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('張純聯合張舉與烏桓起兵'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('《資治通鑑》卷五十八');
    expect(event?.source).toContain('烏桓大人丘力居');
    expect(event?.source).toContain('公綦稠、右北平太守劉政及遼東太守陽終');
    expect(event?.source).toContain('張舉稱天子，張純稱彌天將軍');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:187,endYear:187,precision:'year',introducedRevision:187,lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未標記事月日');
    const answer=answerKnownHistoricalEventQuestion('西元 187 年發生了什麼事？',world());
    expect(answer?.answer).toContain('張純聯合張舉與烏桓起兵');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    const old=upgradePhase4Content(createPhase4Model(185,1,persons,'phase4-scenario-186'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,720).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [187,188]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-186'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:187});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('張純聯合張舉與烏桓起兵'))).toBe(false);
    }
  });

  it('v186 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV186Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a500-v186-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:1080}});
    if(!continued.state||!continued.event)throw new Error('could not continue v186 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
