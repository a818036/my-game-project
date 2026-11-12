import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['hongnong-prince-killed-190','dong-zhuo-kills-wu-qiong-zhou-bi-190','yuan-wei-yuan-ji-executed-clan-190','white-wave-raids-hedong-190','dong-zhuo-appointed-chancellor-190'] as const;
const persons:PersonRef[]=[];

describe('A720 補列 190 年朝廷危機與地方記事',()=>{
  it('保留《後漢書》卷九初平元年本紀記事及來源日期精度',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===190&&item.endYear===190&&item.precision==='year'&&item.introducedRevision===343)).toBe(true);
    expect(entries.map((item,index)=>item?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[ids[index]]).every(Boolean)).toBe(true);
    expect(entries[0]?.source).toContain('癸酉，董卓殺弘農王');
    expect(entries[1]?.source).toContain('二月庚辰');
    expect(entries[2]?.source).toContain('三月戊午');
    expect(entries[3]?.source).toContain('冬十月');
    expect(entries[4]?.source).toContain('十一月癸酉');
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
  });

  it('v342 舊 v6 存檔升版保留事件帳前綴，跨年至 190 年觸發並可重播',()=>{
    const seed=720;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a720-v6-start',expectedRevision:0,type:'StartGame',name:'A720 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A720 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-342'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A720 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,2160);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('190 年及晚年存檔不回補新增記事',()=>{
    for(const year of [190,191]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-342'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:190});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
