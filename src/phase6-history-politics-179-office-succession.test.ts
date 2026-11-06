import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='taiwei-and-minister-succession-guanghe-2-179';
function oldV210Save():SaveFile{
  const facts=createOpeningFacts(523,178,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a524-v210-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:524,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v210 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-210'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v209 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A524 補全 179 年三公任免記事',()=>{
  it('一併記錄司徒、太尉與司空交接，並保留原史日期精度',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:179,endYear:179,precision:'year',introducedIn:'phase4-scenario-211',lateSameYear:true});
    expect(node?.source).toContain('司徒袁滂免');
    expect(node?.source).toContain('乙丑');
    expect(node?.source).toContain('段熲為太尉');
    expect(node?.source).toContain('司空袁逢罷、太常張濟為司空');
    expect(node?.sourceDateNote).toContain('但未另標該項日月');
    expect(node?.sourceDateNote).toContain('不換算模型日期');
    const advanced=advancePhase4(createPhase4Model(178,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const answer=answerKnownHistoricalEventQuestion('西元 179 年有哪些三公任免？',oldV210Save().state);
    expect(answer?.answer).toContain('張濟相繼任職');
  });

  it('v210 v6 JSON 升級保留事件帳，未到年份觸發且同年不回補',()=>{
    const old=oldV210Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a524-v210-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v209 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [179,180]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-210'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:179});
      expect(late.eventLedger.some(item=>item.detail.includes('張濟相繼任職'))).toBe(false);
    }
  });
});
