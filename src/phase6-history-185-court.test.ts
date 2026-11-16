import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['langya-prince-ju-dies-185','guangyang-gate-building-collapses-185','situ-yuan-wei-dismissed-cui-lie-appointed-185','taiwei-deng-sheng-replaced-zhang-yan-185','three-fu-locusts-185','huangfu-song-dismissed-left-chariot-general-185','zhang-wen-appointed-chariot-general-against-beigong-185','yang-ci-appointed-sikong-185','yang-ci-dies-xu-xiang-succeeds-sikong-185','chen-dan-liu-tao-die-in-prison-185','wanjin-hall-built-west-garden-185','luoyang-infant-two-heads-four-arms-185'] as const;
const persons:PersonRef[]=[];

describe('A715 補列 185 年朝政、地方與年末記事',()=>{
  it('逐項保留原文、漢曆日期註記及一般事件界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===185&&item.endYear===185&&item.precision==='year'&&item.introducedRevision===338)).toBe(true);
    expect(entries[0]?.source).toContain('琅邪王據薨');
    expect(entries[1]?.source).toContain('二月己亥');
    expect(entries[2]?.source).toContain('司徒袁隗免');
    expect(entries[3]?.source).toContain('太尉鄧盛罷');
    expect(entries[4]?.source).toContain('秋七月');
    expect(entries[5]?.source).toContain('皇甫嵩免');
    expect(entries[6]?.source).toContain('八月');
    expect(entries[7]?.source).toContain('九月');
    expect(entries[8]?.source).toContain('冬十月庚寅');
    expect(entries[9]?.source).toContain('陳耽、諫議大夫劉陶');
    expect(entries[10]?.source).toContain('造萬金堂於西園');
    expect(entries[11]?.source).toContain('洛陽民生兒，兩頭四臂');
    expect(entries.every(item=>item?.sourceDateNote&&!/每日|時辰/.test(item.sourceDateNote))).toBe(true);
  });

  it('v337 舊 v6 存檔升版保留事件帳，跨年至 185 年觸發且可重播',()=>{
    const seed=715;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a715-v6-start',expectedRevision:0,type:'StartGame',name:'A715 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A715 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-337'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A715 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('185 年及晚年存檔不回補；史實人物死訊不形成玩家死亡硬節點',()=>{
    for(const year of [185,186]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-337'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:185});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
    const fresh=createPhase4Model(185,1,persons,PHASE4_CONTENT_VERSION);
    for(const id of ids){
      const source=HISTORY_CONTENT.find(item=>item.id===id)?.source;
      expect(fresh.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(fresh.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===source)).toBe(true);
    }
    expect(fresh.eventLedger.some(event=>event.type==='死亡硬節點觸發'&&ids.some(id=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source))).toBe(false);
  });
});
