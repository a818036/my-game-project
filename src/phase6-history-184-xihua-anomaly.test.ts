import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['huangfu-song-defeats-runnan-yellow-turbans-xihua-184','luoyang-infant-two-heads-shared-body-184'] as const;
const persons:PersonRef[]=[];

describe('A712 補列西華戰事與洛陽異象記載',()=>{
  it('分別保留西華戰果與原典異象文字，均不補推原文缺漏',()=>{
    const battle=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    const anomaly=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(battle).toMatchObject({startYear:184,endYear:184,kind:'event',precision:'year',introducedRevision:335});
    expect(battle?.source).toContain('皇甫嵩、朱儁大破汝南黃巾於西華');
    expect(battle?.source).toContain('未於此句明標月份');
    expect(battle?.description).toContain('不推定戰事月份');
    expect(anomaly).toMatchObject({startYear:184,endYear:184,kind:'event',precision:'year',introducedRevision:335});
    expect(anomaly?.source).toContain('洛陽女子生兒，兩頭共身');
    expect(anomaly?.description).toContain('不宣稱現象已驗證');
    expect(ids.every(id=>HISTORY_CONTENT.find(item=>item.id===id)?.sourceDateNote===undefined)).toBe(true);
  });

  it('v334 舊存檔保留事件帳；183 年續玩可觸發，184 年及晚年不回補',()=>{
    const old=createPhase4Model(183,1,persons,'phase4-scenario-334');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [184,185]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-334'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
        const source=HISTORY_CONTENT.find(item=>item.id===id)!.source;
        expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===source)).toBe(false);
      }
    }
  });

  it('v6 匯入升至 v335 後兩項記事可重播且舊事件不變',()=>{
    const seed=712;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a712-v6-start',expectedRevision:0,type:'StartGame',name:'A712 存檔驗收',seed,facts:createOpeningFacts(seed,183,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A712 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-334'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A712 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.events[0]).toEqual(legacyEvent);
    expect(replay(imported.events)).toEqual(imported.state);
    const advanced=advancePhase4(imported.state.phase4!,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
