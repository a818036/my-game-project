import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=[
  'han-amnesty-chuping-3-192',
  'sun-jian-campaign-liu-biao-xiang-192',
  'yuan-shao-gongsun-zan-jieqiao-192',
] as const;
const persons:PersonRef[]=[];

describe('A722 補列 192 年初平三年記事',()=>{
  it('分列大赦、孫堅攻劉表及界橋戰事，保留原典日期精度',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===192&&item.endYear===192&&item.precision==='year'&&item.introducedRevision===345)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries[0]?.source).toContain('春正月丁丑');
    expect(entries[1]?.source).toContain('袁術遣將孫堅攻劉表於襄陽，堅戰歿');
    expect(entries[1]?.source).toContain('不同來源的紀年記載');
    expect(entries[2]?.source).toContain('紹及瓚戰於界橋，瓚軍大敗');
    expect(HISTORY_CONTENT.filter(item=>item.id==='dong-zhuo-killed-192')).toHaveLength(1);
    expect(HISTORY_CONTENT.filter(item=>item.id==='sun-jian-death-191')).toHaveLength(1);
  });

  it('v344 舊 v6 存檔升版保留事件帳前綴，跨年至 192 年可觸發新記事',()=>{
    const seed=722;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a722-v6-start',expectedRevision:0,type:'StartGame',name:'A722 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A722 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-344'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A722 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,2880);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('已到 192 年或更晚的舊存檔升版不回補新記事',()=>{
    for(const year of [192,193]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-344'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:192});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
