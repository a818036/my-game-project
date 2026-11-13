import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['comet-north-dipper-206','zhang-meng-kills-handan-shang-206','langya-prince-xi-restored-206','eight-principalities-abolished-206'] as const;
const persons:PersonRef[]=[];

describe('A736 補列 206 年建安十一年記事',()=>{
  it('記錄天象、官員遇害、封王與八國除國，保留異文界線',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(681);
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({kind:'event',startYear:206,endYear:206,precision:'year',introducedRevision:359});
      expect(content?.sourceDateNote).toBeTruthy();
    }
    const comet=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(comet?.source).toContain('星孛於北斗');
    expect(comet?.description).toContain('不推測天體辨識');
    const zhangMeng=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(zhangMeng?.source).toContain('雍州刺史邯鄲商');
    expect(zhangMeng?.source).toContain('《漢紀》作「涼州」');
    const abolished=HISTORY_CONTENT.find(item=>item.id===ids[3]);
    for(const state of ['齊','北海','阜陵','下邳','常山','甘陵','濟陰','平原'])expect(abolished?.source).toContain(state);

    const gaoGan=HISTORY_CONTENT.filter(item=>item.id==='gao-gan-defeat-206');
    expect(gaoGan).toHaveLength(1);
    expect(gaoGan[0]?.source).toContain('《後漢書》卷九');
    expect(gaoGan[0]?.source).toContain('春三月亦記曹操破高幹於并州');
  });

  it('舊 v6 存檔升至 v359 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(205,1,persons,'phase4-scenario-358');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 206 年與 207 年的存檔升版不補發新增記事',()=>{
    for(const year of [206,207]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-358'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:206});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
