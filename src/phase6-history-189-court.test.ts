import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['chen-cang-defeats-wang-guo-189','liu-yu-captures-zhang-chun-189','bao-hong-imprisoned-dies-189','ling-emperor-dies-bian-succeeds-189','he-jin-killed-eunuch-palace-crisis-189'] as const;
const persons:PersonRef[]=[];

describe('A719 補列 189 年戰事與朝廷危機記事',()=>{
  it('保留《後漢書》記載的戰事、人物及年內日期精度',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===189&&item.endYear===189&&item.precision==='year'&&item.introducedRevision===342)).toBe(true);
    expect(entries.map((item,index)=>item?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[ids[index]]).every(Boolean)).toBe(true);
    expect(entries[0]?.source).toContain('中平六年春二月');
    expect(entries[1]?.source).toContain('劉虞購斬漁陽賊張純');
    expect(entries[2]?.source).toContain('下軍校尉鮑鴻下獄死');
    expect(entries[3]?.source).toContain('丙辰');
    expect(entries[4]?.source).toContain('秋八月');
    expect(HISTORY_CONTENT.find(item=>item.id==='palace-succession-189')?.source).toContain('九月甲戌');
  });

  it('v341 舊 v6 存檔升版保留前綴，跨年至 189 年觸發並可重播',()=>{
    const seed=719;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a719-v6-start',expectedRevision:0,type:'StartGame',name:'A719 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A719 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-341'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A719 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,1800);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('189 年及晚年存檔不回補新增記事',()=>{
    for(const year of [189,190]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-341'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:189});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
