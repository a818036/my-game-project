import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=[
  'han-amnesty-chuping-2-191',
  'sun-jian-defeats-hu-zhen-yangren-191',
  'dong-zhuo-excavates-imperial-tombs-191',
  'dong-zhuo-enters-chang-an-191',
  'luoyang-earthquake-191',
  'han-court-appointments-191',
  'chiyou-flag-appears-191',
  'dong-zhuo-kills-zhang-wen-191',
  'ying-shao-defeats-taishan-yellow-turbans-191',
  'gongsun-zan-defeats-yellow-turbans-dongguang-191',
  'changsha-month-dead-revived-191',
] as const;
const persons:PersonRef[]=[];

describe('A721 補列 191 年初平二年本紀記事',()=>{
  it('保留卷九記事、月份次序、來源精度與一般事件界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===191&&item.endYear===191&&item.precision==='year'&&item.introducedRevision===344)).toBe(true);
    expect(entries.every((item,index)=>Boolean(item?.sourceDateNote??HISTORY_SOURCE_DATE_NOTES[ids[index]])).valueOf()).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined&&item?.causes===undefined)).toBe(true);
    expect(entries[0]?.source).toContain('春正月辛丑');
    expect(entries[1]?.source).toContain('二月');
    expect(entries[2]?.source).toContain('發掘洛陽諸帝陵');
    expect(entries[3]?.source).toContain('初平二年夏四月記「董卓入長安」');
    expect(entries[4]?.source).toContain('初平二年六月丙戌記地震');
    expect(entries[5]?.source).toContain('秋七月');
    expect(entries[6]?.source).toContain('九月');
    expect(entries[7]?.source).toContain('冬十月壬戌');
    expect(entries[8]?.source).toContain('應劭擊破之');
    expect(entries[9]?.source).toContain('公孫瓚與之戰於東光');
    expect(entries[10]?.source).toContain('是歲」記「長沙有人死經月復活');
    expect(HISTORY_CONTENT.filter(item=>item.id==='sun-jian-death-191')).toHaveLength(1);
  });

  it('v343 舊 v6 存檔升版保留帳本前綴，跨年至 191 年觸發新增一般記事',()=>{
    const seed=721;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a721-v6-start',expectedRevision:0,type:'StartGame',name:'A721 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A721 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-343'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A721 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,2520);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('191 年及晚年升版不回補，並只保留獨立孫堅死亡節點',()=>{
    for(const year of [191,192]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-343'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:191});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
      expect(late.nodes.filter(node=>node.contentId==='sun-jian-death-191')).toHaveLength(1);
    }
  });
});
