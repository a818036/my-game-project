import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent,type GameState} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const ids=['rinan-envoy-tributes-183','changling-county-restored-183','garden-office-established-183'];

function makeWorld(year:number):GameState{
  const facts=createOpeningFacts(262,year,{regions:[],surnames:[]});
  const result=dispatch(null,{version:ENGINE_VERSION,commandId:`a625-world-${year}`,expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:262,facts});
  if(!result.state)throw new Error('could not create test world');
  return result.state;
}

function oldV261Save():SaveFile{
  const facts=createOpeningFacts(262,182,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a625-v261-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:262,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v261 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-261'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v261 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A625–A627 183 年朝貢、復置縣及圃囿署記事',()=>{
  it('保留三項原典、年級觸發與 183 年唯讀年表答案',()=>{
    const advanced=advancePhase4(createPhase4Model(182,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids){
      expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:183,endYear:183,precision:'year',introducedRevision:262,lateSameYear:true});
    }
    const source=advanced.eventLedger.filter(event=>event.type==='史實事件形成'&&ids.some(id=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title))).map(event=>event.source).join('\n');
    expect(source).toContain('日南徼外國重譯貢獻');
    expect(source).toContain('復長陵縣，比豐、沛');
    expect(source).toContain('始置圃囿署，以宦者為令');
    const answer=answerKnownHistoricalEventQuestion('西元 183 年發生了什麼事？',makeWorld(184))?.answer??'';
    for(const title of ['日南徼外國重譯入貢','復置長陵縣','圃囿署'])expect(answer).toContain(title);
  });

  it('v261 舊 v6 存檔升版保留事件前綴、續玩重播並不回補',()=>{
    const old=oldV261Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(migrated.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a625-v261-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v261 save');
    for(const id of ids)expect(continued.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    expect(createPhase4Model(182,1,persons,'phase4-scenario-261').nodes.some(node=>ids.includes(node.contentId))).toBe(false);
    for(const year of [183,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-261'),PHASE4_CONTENT_VERSION);
      for(const id of ids)expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:183});
      expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&ids.some(id=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title)))).toBe(false);
    }
  });
});
