import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='han-campaign-against-xianbei-defeated-177';
function world():GameState{
  const facts=createOpeningFacts(520,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a520-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:520,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}
function oldV206Save():SaveFile{
  const facts=createOpeningFacts(520,176,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a520-v206-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:520,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v206 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-206'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v206 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A520 177 年漢軍征鮮卑記事補列朝議與戰後記載',()=>{
  it('同一史事節點保留兩書詳略、日期精度與傷亡界線',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:177,endYear:177,precision:'year',introducedIn:'phase4-scenario-145',sameYearMigrationIsLate:true});
    expect(node?.source).toContain('《後漢書》卷八');
    expect(node?.source).toContain('《資治通鑑》卷五十七');
    expect(node?.source).toContain('田晏出雲中、臧旻與南單于出雁門、夏育出高柳');
    expect(node?.source).toContain('各路將萬騎、出塞二千餘里');
    expect(node?.source).toContain('死者什七八');
    expect(node?.sourceDateNote).toContain('秋八月');
    const answer=answerKnownHistoricalEventQuestion('西元 177 年發生了什麼事？',world());
    expect(answer?.answer).toContain('三路出塞');
    expect(answer?.answer).toContain('《資治通鑑》卷五十七');
    expect(answer?.answer).toContain('不計算精確人數');
  });

  it('v206 v6 JSON 升級保留事件前綴、跨年觸發及重播結果',()=>{
    const fresh=advancePhase4(createPhase4Model(176,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(fresh.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(fresh.eventLedger.find(item=>item.detail.includes('漢軍三路出塞征鮮卑失利'))?.source).toContain('檀石槐命三部大人迎戰');
    const old=oldV206Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a520-v206-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v206 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  },15_000);
});
