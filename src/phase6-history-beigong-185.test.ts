import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='beigong-boyu-raids-sanfu-185';
function world():GameState{
  const facts=createOpeningFacts(493,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a493-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:493,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV179Save():SaveFile{
  const facts=createOpeningFacts(493,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a493-v179-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:493,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v179 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-179'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v179 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A493 185 年北宮伯玉等寇三輔',()=>{
  it('記錄侵寇與朝廷部署，不虛構部署結果或併入後續戰事',()=>{
    const advanced=advancePhase4(createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION),360);
    const node=advanced.nodes.find(item=>item.contentId===id);
    const event=advanced.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('北宮伯玉等寇三輔'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('詔左車騎將軍皇甫嵩鎮長安以討之');
    expect(event?.source).toContain('未在此處記載此次部署的結果');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:185,endYear:185,precision:'year',introducedRevision:180,lateSameYear:true});
    const answer=answerKnownHistoricalEventQuestion('西元 185 年發生了什麼事？',world());
    expect(answer?.answer).toContain('北宮伯玉等寇三輔');
    expect(answer?.answer).toContain('《資治通鑑》卷五十八');
    const older=upgradePhase4Content(createPhase4Model(184,1,persons,'phase4-scenario-179'),PHASE4_CONTENT_VERSION);
    expect(older.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(older,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    for(const year of [185,186]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-179'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:185});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('北宮伯玉等寇三輔'))).toBe(false);
    }
  });

  it('v179 v6 JSON 升級續玩後可觸發，重播與再匯出一致',()=>{
    const old=oldV179Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a493-v179-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v179 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });
});
