import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const people:PersonRef[]=[];
const id='court-appointments-april-184';

function versionedSave(year:number,contentVersion='phase4-scenario-262'):SaveFile{
  const facts=createOpeningFacts(263,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:`a628-start-${year}`,expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:263,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v262 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:contentVersion}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v262 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A628 184 年夏四月三公任免',()=>{
  it('依原文按年觸發並可由唯讀年表查詢',()=>{
    const advanced=advancePhase4(createPhase4Model(183,1,people,PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(HISTORY_CONTENT.find(node=>node.id===id)).toMatchObject({startYear:184,endYear:184,precision:'year',introducedRevision:263,lateSameYear:true});
    expect(HISTORY_CONTENT.find(node=>node.id===id)?.source).toContain('楊賜免');
    const late=upgradePhase4Content(createPhase4Model(184,1,people,'phase4-scenario-262'),PHASE4_CONTENT_VERSION);
    expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
    expect(late.eventLedger.some(event=>event.source?.includes('楊賜免'))).toBe(false);
  });

  it('v262 舊 v6 存檔續玩保留帳目前綴、重播並不回補',()=>{
    const old=versionedSave(183),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a628-advance-to-184',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!advanced.state||!advanced.event)throw new Error('could not continue v262 save');
    expect(advanced.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,advanced.event],state:advanced.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });

  it('A629 v263 存檔遷移保留前綴並觸發安平、甘陵響應記事',()=>{
    const old=versionedSave(183,'phase4-scenario-263'),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(node=>node.contentId==='anping-ganling-respond-yellow-turbans-184')?.status).toBe('pending');
    const advanced=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a629-advance-to-184',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!advanced.state||!advanced.event)throw new Error('could not continue v263 save');
    expect(advanced.state.phase4?.nodes.find(node=>node.contentId==='anping-ganling-respond-yellow-turbans-184')?.status).toBe('triggered');
    const late=upgradePhase4Content(createPhase4Model(184,1,people,'phase4-scenario-263'),PHASE4_CONTENT_VERSION);
    expect(late.nodes.find(node=>node.contentId==='anping-ganling-respond-yellow-turbans-184')).toMatchObject({status:'resolved',resolvedYear:184});
    expect(late.eventLedger.some(event=>event.source?.includes('安平、甘陵人各執其王'))).toBe(false);
  });
});
