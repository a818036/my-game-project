import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['epidemic-zong-ju-dies-yang-ci-appointed-187','taiwei-li-xian-dismissed-187','pei-xiang-shi-qian-dies-in-prison-187','northsea-earthquake-coastal-flood-187','sikong-yang-ci-dismissed-tang-zhen-appointed-187','rinan-tribute-duan-jiong-dismissal-xianbei-raids-eclipse-187'] as const;
const persons:PersonRef[]=[];

describe('A717 補列 187 年朝政、疫病與災異記事',()=>{
  it('保留《後漢書》原文月份、人物稱謂與未載結果界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===187&&item.endYear===187&&item.precision==='year'&&item.introducedRevision===340)).toBe(true);
    expect(entries[0]?.source).toContain('春正月');
    expect(entries[1]?.source).toContain('三月');
    expect(entries[2]?.source).toContain('五月');
    expect(entries[3]?.source).toContain('六月');
    expect(entries[4]?.source).toContain('秋七月');
    expect(entries[5]?.source).toContain('冬十二月');
    expect(entries.every((item,index)=>{
      const note=item?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[ids[index]];
      return Boolean(note)&&!/每日|時辰/.test(note??'');
    })).toBe(true);
  });

  it('v339 舊 v6 存檔升版保留前綴，跨年至 187 年觸發並可重播',()=>{
    const seed=717;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a717-v6-start',expectedRevision:0,type:'StartGame',name:'A717 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A717 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-339'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A717 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,1080);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('187 年及晚年存檔不回補新增記事',()=>{
    for(const year of [187,188]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-339'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:187});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
