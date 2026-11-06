import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='yulin-wuhuh-submit-180';
function oldV218Save(year=169):SaveFile{
  const facts=createOpeningFacts(534,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a534-v218-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:534,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v218 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-218'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v218 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A534 更正鬱林烏滸記事為建寧三年（170）',()=>{
  it('只按來源的年級精度記錄，不推演人口或行政後果',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:170,endYear:170,precision:'year',introducedIn:'phase4-scenario-219',lateSameYear:true});
    expect(node?.source).toContain('鬱林烏滸民相率內屬');
    expect(node?.source).toContain('未提供月份');
    expect(node?.description).toContain('不推演參與者人數、過程、地方控制');
    expect(advancePhase4(createPhase4Model(169,1,persons,PHASE4_CONTENT_VERSION),360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('v218 v6 JSON 升級保留事件帳，169 年續玩觸發，170 年以上不回補',()=>{
    const old=oldV218Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a534-v218-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v218 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [170,171]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-218'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:170});
      expect(late.eventLedger.some(item=>item.detail.includes('鬱林烏滸民相率內屬'))).toBe(false);
    }
  });
});
