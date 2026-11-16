import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['amnesty-rain-prayer-judicial-review-188','yizhou-commandery-yi-revolt-pacified-188','songgao-mountain-name-restored-188','taiwei-chen-dan-removed-xu-xun-appointed-188','cao-luan-executed-partisan-prohibition-188','sikong-liu-yi-appointed-188','taiwei-xu-xun-removed-liu-kuan-appointed-188','palace-locust-tree-uprooted-188','situ-yuan-wei-dismissed-188','yang-ci-appointed-situ-188','ganling-prince-ding-dies-188','senior-taixue-students-appointed-offices-188','xianbei-raids-youzhou-188','peiguo-reports-yellow-dragon-188'] as const;
const persons:PersonRef[]=[];

describe('A718 補列 188 年朝廷、地方與年末記事',()=>{
  it('保留《後漢書》記載的任免、地方事件與原文日期精度',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===188&&item.endYear===188&&item.precision==='year'&&item.introducedRevision===341)).toBe(true);
    expect(entries[0]?.source).toContain('夏四月癸亥');
    expect(entries[1]?.source).toContain('益州郡夷叛');
    expect(entries[2]?.source).toContain('復崇高山名為嵩高山');
    expect(entries[4]?.source).toContain('閏月');
    expect(entries[5]?.source).toContain('六月壬戌');
    expect(entries[6]?.source).toContain('秋七月');
    expect(entries[10]?.source).toContain('十二月');
    expect(entries[11]?.source).toContain('年六十以上百餘人');
    expect(entries.slice(0,11).every((item,index)=>Boolean(item?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[ids[index]]))).toBe(true);
  });

  it('v340 舊 v6 存檔升版保留前綴，跨年至 188 年觸發並可重播',()=>{
    const seed=718;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a718-v6-start',expectedRevision:0,type:'StartGame',name:'A718 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A718 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-340'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A718 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,1440);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('188 年及晚年存檔不回補新增記事',()=>{
    for(const year of [188,189]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-340'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:188});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
