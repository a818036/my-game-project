import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const id='great-amnesty-guanghe-4-181';
const persons:PersonRef[]=[];

describe('A707 補列 181 年夏四月大赦記事',()=>{
  it('保留原典年月干支及赦令未詳範圍',()=>{
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content).toMatchObject({startYear:181,endYear:181,precision:'year',introducedRevision:330});
    expect(content?.source).toContain('光和四年夏四月庚子，大赦天下');
    expect(content?.description).toContain('不推定赦免對象、例外、執行情況');
    expect(content?.sourceDateNote).toContain('不換算模型日期');
  });

  it('v329 舊存檔保留事件帳，180 年續玩可觸發，181 年與晚年不回補',()=>{
    const old=createPhase4Model(180,1,persons,'phase4-scenario-329');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [181,182]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-329'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:181});
      expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===contentSource())).toBe(false);
    }
  });

  it('舊 v6 JSON 升至 v330 後可重播並保留原事件前綴',()=>{
    const seed=707;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a707-v6-start',expectedRevision:0,type:'StartGame',name:'A707 存檔驗收',seed,facts:createOpeningFacts(seed,180,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A707 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-329'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A707 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    const prefix=legacyState.phase4!.eventLedger;
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(replay(imported.events)).toEqual(imported.state);
    expect(advancePhase4(imported.state.phase4!,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});

function contentSource(){return HISTORY_CONTENT.find(item=>item.id===id)!.source;}
