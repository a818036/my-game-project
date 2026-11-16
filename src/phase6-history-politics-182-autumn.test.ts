import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const ids=['comet-at-taiwei-182','unresolved-prisoners-textile-ransom-182','atingdao-four-hundred-chi-tower-182','ling-emperor-tour-guangcheng-taixue-182'];

function questionWorld():GameState{
  const facts=createOpeningFacts(621,184,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:'a621-question-world',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:621,facts});
  if(!result.state)throw new Error('could not create question world');
  return result.state;
}

function oldV260Save():SaveFile{
  const facts=createOpeningFacts(621,181,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a621-v260-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:621,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v260 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-260'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v260 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A621 182 年秋冬天象、詔令、工程與巡幸記事',()=>{
  it('依《後漢書》保留四項原文、來源日期與年級觸發界線',()=>{
    const advanced=advancePhase4(createPhase4Model(181,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids){
      expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(advanced.eventLedger.some(event=>event.type==='史實事件形成'&&ids.includes(id)&&event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title))).toBe(true);
      expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:182,endYear:182,precision:'year',introducedRevision:261,lateSameYear:true});
    }
    const events=advanced.eventLedger.filter(event=>event.type==='史實事件形成'&&ids.some(id=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title)));
    expect(events.map(event=>event.source).join('\n')).toContain('秋七月記「有星孛於太微」');
    expect(events.map(event=>event.source).join('\n')).toContain('癸酉，令繫囚罪未決，入縑贖');
    expect(events.map(event=>event.source).join('\n')).toContain('八月記「起四百尺觀於阿亭道」');
    expect(events.map(event=>event.source).join('\n')).toContain('十二月還而幸太學');
    const answer=answerKnownHistoricalEventQuestion('西元 182 年發生了什麼事？',questionWorld())?.answer??'';
    for(const title of ['太微有星孛','繫囚未決者入縑贖令','阿亭道四百尺觀','巡幸廣成苑'])expect(answer).toContain(title);
  });

  it('v260 舊 v6 存檔遷移可續玩、重播再匯出，且同年與晚年不回補',()=>{
    const old=oldV260Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a621-v260-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v260 save');
    for(const id of ids)expect(continued.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    const oldModel=createPhase4Model(181,1,persons,'phase4-scenario-260');
    for(const id of ids)expect(oldModel.nodes.some(node=>node.contentId===id)).toBe(false);
    for(const year of [182,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-260'),PHASE4_CONTENT_VERSION);
      for(const id of ids)expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:182});
      expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&ids.some(id=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title)))).toBe(false);
    }
  });
});
