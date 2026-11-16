import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const persons:PersonRef[]=[];
const ids=[
  'lujisi-stable-and-horse-market-181',
  'prefectures-report-zhi-ying-grass-181',
  'phoenix-reported-xincheng-181',
  'solar-eclipse-guanghe-4-181',
  'north-palace-yongxiang-office-fire-181',
] as const;

describe('A706 補列 181 年光和四年本紀記事',()=>{
  it('五項新增記事保留原典所載年月、上報語氣與未載界線',()=>{
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({startYear:181,endYear:181,precision:'year',introducedRevision:329});
      expect(content?.source).toContain('《後漢書》卷八');
      expect(content?.sourceDateNote).toBeTruthy();
    }
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.description).toContain('不推演徵調數量');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.description).toContain('不將其認定為已驗證現象');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[2])?.description).toContain('不驗證現象');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[4])?.description).toContain('不補推相關情節');
  });

  it('v328 舊存檔升至 v329 保留事件帳，180 年可續玩觸發，181 年及晚年不回補',()=>{
    const old=createPhase4Model(180,1,persons,'phase4-scenario-328');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(upgraded,360);
    for(const id of ids){
      expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(continued.eventLedger.find(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)!.source)?.source).toContain('《後漢書》卷八');
    }
    for(const year of [181,182]){
      const legacy=createPhase4Model(year,1,persons,'phase4-scenario-328');
      const legacyPrefix=structuredClone(legacy.eventLedger);
      const late=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
      expect(late.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:181});
        expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)!.source)).toBe(false);
      }
    }
  });

  it('A706 舊 v6 JSON 匯入升至 v329，舊事件重播並續玩一致',()=>{
    const seed=706;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a706-v6-start',expectedRevision:0,type:'StartGame',name:'A706 存檔驗收',seed,facts:createOpeningFacts(seed,180,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A706 v6 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-328'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A706 v6 驗收存檔');
    const legacy={format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState};
    const imported=verifySave(toJson(legacy));
    const prefix=legacyState.phase4!.eventLedger;
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(replay(imported.events)).toEqual(imported.state);
    const continued=advancePhase4(imported.state.phase4!,360);
    for(const id of ids)expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
