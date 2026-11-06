import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='han-sui-kills-bian-zhang-sieges-longxi-187';
function world():GameState{
  const facts=createOpeningFacts(498,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a498-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:498,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV184Save():SaveFile{
  const facts=createOpeningFacts(498,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a498-v184-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:498,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v184 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-184'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v184 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A498 187 年韓遂誅殺邊章等並圍隴西',()=>{
  it('記錄殺伐、圍城與連和，不推演圍城結果',()=>{
    const advanced=advancePhase4(createPhase4Model(186,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('韓遂殺邊章等、進圍隴西並與李相如連和'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('《資治通鑑》卷五十八');
    expect(event?.source).toContain('北宮伯玉、李文侯');
    expect(event?.source).toContain('十餘萬');
    expect(event?.source).toContain('未載圍城結果');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:187,endYear:187,precision:'year',introducedIn:'phase4-scenario-185',lateSameYear:true});
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未標明月份');
    const answer=answerKnownHistoricalEventQuestion('西元 187 年發生了什麼事？',world());
    expect(answer?.answer).toContain('韓遂殺邊章等、進圍隴西並與李相如連和');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    const old=upgradePhase4Content(createPhase4Model(184,1,persons,'phase4-scenario-184'),PHASE4_CONTENT_VERSION);
    expect(old.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(old,1080).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [187,188]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-184'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:187});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('韓遂殺邊章等、進圍隴西並與李相如連和'))).toBe(false);
    }
  });

  it('v184 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV184Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a498-v184-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:1080}});
    if(!continued.state||!continued.event)throw new Error('could not continue v184 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
