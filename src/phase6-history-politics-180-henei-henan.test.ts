import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameEvent} from './engine';
import {toJson,verifySave,type SaveFile} from './storage';

const persons:PersonRef[]=[];
const id='henei-henan-cannibalism-report-180';
function oldV213Save(year=169):SaveFile{
  const facts=createOpeningFacts(529,year,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a529-v213-start',expectedRevision:0,type:'StartGame',name:'驗收玩家',seed:529,facts});
  if(!started.event||started.event.type!=='WorldCreated')throw new Error('could not create v213 start event');
  const event:GameEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-213'}};
  const state=applyEvent(null,event);
  if(!state)throw new Error('could not replay v213 start event');
  return{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[event],state};
}

describe('A529 更正河內、河南記事年序',()=>{
  it('保留史書原文與年級日期，不補記事原因或外推至玩家生活',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:170,endYear:170,precision:'year',introducedIn:'phase4-scenario-214',sameYearMigrationIsLate:true});
    expect(node?.source).toContain('河內人婦食夫，河南人夫食婦');
    expect(node?.source).toContain('不將其推定為饑荒、疫病');
    expect(node?.description).toContain('不套用到玩家人物');
    expect(node?.source).toContain('建寧三年');
    expect(node?.sourceDateNote).toContain('春正月');
    expect(advancePhase4(createPhase4Model(169,1,persons,PHASE4_CONTENT_VERSION),360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(answerKnownHistoricalEventQuestion('西元170年河內與河南有什麼記載？',oldV213Save().state)?.answer).toContain('河內婦食夫');
  });

  it('v213 v6 JSON 升級保留事件帳，169 年續玩觸發，170 年及較晚不回補',()=>{
    const old=oldV213Save(),prefix=structuredClone(old.state.phase4?.eventLedger??[]),migrated=verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=dispatch(migrated.state,{version:ENGINE_VERSION,commandId:'a529-v213-continue',expectedRevision:migrated.state.revision,worldlineId:migrated.worldlineId,type:'Phase4Action',action:{type:'AdvanceDays',days:360}});
    if(!continued.state||!continued.event)throw new Error('could not continue v213 save');
    expect(continued.state.phase4?.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const saved:SaveFile={...migrated,events:[...migrated.events,continued.event],state:continued.state};
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
    for(const year of [170,171]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-213'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:170});
      expect(late.eventLedger.some(item=>item.detail.includes('河內婦食夫'))).toBe(false);
    }
  });

  it('180 年舊存檔已有錯年記事時保留舊帳，不重新結算',()=>{
    const old=createPhase4Model(180,1,persons,'phase4-scenario-219');
    const node=old.nodes.find(item=>item.contentId===id)!;
    node.status='triggered';
    node.resolvedYear=180;
    old.eventLedger.push({id:'legacy-henei-wrong-year',day:12,year:180,month:1,dayOfMonth:13,type:'史實事件形成',detail:'舊版誤列於光和三年的河內、河南記事',source:'《後漢書》卷八舊版錯誤年序'});
    const prefix=structuredClone(old.eventLedger),migrated=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);

    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:170});
    expect(migrated.eventLedger.some(item=>item.id==='legacy-henei-wrong-year')).toBe(true);
    expect(migrated.eventLedger.slice(prefix.length).filter(item=>item.type==='史實事件形成'&&item.detail.includes('河內、河南'))).toHaveLength(0);
    expect(migrated.eventLedger.slice(prefix.length).filter(item=>item.type==='史實資料勘誤')).toHaveLength(1);
  });
});
