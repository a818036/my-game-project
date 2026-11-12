import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const persons:PersonRef[]=[];
const ids=[
  'general-amnesty-guanghe-3-180',
  'public-office-pavilion-collapse-180',
  'liang-prince-yuan-dies-180',
  'biaoshi-earthquake-spring-water-180',
  'prisoners-silk-ransom-order-180',
  'comet-wolf-arc-180',
  'xianbei-raids-you-bing-180',
  'emperor-builds-bigui-lingkun-gardens-180',
] as const;

describe('A705 補列 180 年光和三年本紀記事',()=>{
  it('八項新增記事保留原典日期、篇章次序與未載界線',()=>{
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({startYear:180,endYear:180,precision:'year',introducedRevision:328});
      expect(content?.source).toContain('《後漢書》卷八');
      expect(content?.sourceDateNote).toBeTruthy();
    }
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.source).toContain('駐駕廡自壞');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[2])?.description).toContain('不推演人物關係');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[3])?.description).toContain('不推測地震規模');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[4])?.description).toContain('不等同赦免');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[5])?.description).toContain('不推定現代天文辨識');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[7])?.source).toContain('是歲');
  });

  it('v327 舊存檔升至 v328 保留事件帳；179 年續玩可觸發，180 年及晚年不回補',()=>{
    const old=createPhase4Model(179,1,persons,'phase4-scenario-327');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(upgraded,360);
    for(const id of ids){
      expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(continued.eventLedger.find(event=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title))?.source).toContain('《後漢書》卷八');
    }
    const sameYear=upgradePhase4Content(createPhase4Model(180,1,persons,'phase4-scenario-327'),PHASE4_CONTENT_VERSION);
    const late=upgradePhase4Content(createPhase4Model(181,1,persons,'phase4-scenario-327'),PHASE4_CONTENT_VERSION);
    for(const model of [sameYear,late])for(const id of ids){
      expect(model.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:180});
      expect(model.eventLedger.filter(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)!.source),id).toEqual([]);
    }
  });

  it('A705 舊 v6 JSON 匯入升至 v328，事件重播一致且可續玩',()=>{
    const seed=705;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a705-v6-start',expectedRevision:0,type:'StartGame',name:'A705 存檔驗收',seed,facts:createOpeningFacts(seed,179,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A705 v6 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-327'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A705 v6 驗收存檔');
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
