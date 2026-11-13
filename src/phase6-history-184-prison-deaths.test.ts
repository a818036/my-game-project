import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const id='xiang-xu-zhang-jun-die-in-prison-184';
const persons:PersonRef[]=[];

describe('A710 補列向栩、張鈞下獄死記事',()=>{
  it('只記原典明載內容，不補推案情與日期',()=>{
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content).toMatchObject({startYear:184,endYear:184,kind:'event',precision:'year',introducedRevision:333});
    expect(content?.source).toContain('中平元年條記「侍中向栩、張鈞坐言宦者，下獄死」');
    expect(content?.description).toContain('不補推兩人的言論內容、審訊過程、處刑方式');
    expect(content?.sourceDateNote).toBeUndefined();
  });

  it('v332 舊存檔保留事件帳，183 年續玩跨年觸發，184 年及晚年不回補',()=>{
    const old=createPhase4Model(183,1,persons,'phase4-scenario-332');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [184,185]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-332'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
      expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)!.source)).toBe(false);
    }
  });

  it('舊 v6 JSON 升至 v333 後可重播且保留既有事件帳',()=>{
    const seed=710;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a710-v6-start',expectedRevision:0,type:'StartGame',name:'A710 存檔驗收',seed,facts:createOpeningFacts(seed,183,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A710 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-332'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A710 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    const prefix=legacyState.phase4!.eventLedger;
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(replay(imported.events)).toEqual(imported.state);
    expect(advancePhase4(imported.state.phase4!,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
