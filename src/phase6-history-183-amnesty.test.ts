import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const id='great-amnesty-guanghe-6-183';
const persons:PersonRef[]=[];

describe('A709 補列 183 年三月大赦記事',()=>{
  it('保留原典干支與年級精度，不推定赦免個案',()=>{
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content).toMatchObject({startYear:183,endYear:183,precision:'year',introducedRevision:332});
    expect(content?.source).toContain('光和六年三月辛未，大赦天下');
    expect(content?.description).toContain('不推定赦免對象、例外、執行情況');
    expect(content?.sourceDateNote).toContain('不換算模型日期');
  });

  it('v331 舊存檔保留事件帳，182 年續玩跨年觸發，同年及晚年不回補',()=>{
    const old=createPhase4Model(182,1,persons,'phase4-scenario-331');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [183,184]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-331'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:183});
      expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)!.source)).toBe(false);
    }
  });

  it('舊 v6 JSON 升至 v332 後可重播且保留既有事件帳',()=>{
    const seed=709;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a709-v6-start',expectedRevision:0,type:'StartGame',name:'A709 存檔驗收',seed,facts:createOpeningFacts(seed,182,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A709 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-331'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A709 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    const prefix=legacyState.phase4!.eventLedger;
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(replay(imported.events)).toEqual(imported.state);
    expect(advancePhase4(imported.state.phase4!,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
