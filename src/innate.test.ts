import { describe, expect, it } from 'vitest';
import { createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameCommand } from './engine';
import { advanceInnate, applyInnateAction, HEALING_ENGINEERING_PARAMETERS, LIGHTNING_ENGINEERING_PARAMETERS, OFFICIAL_ABILITIES } from './innate';

function world() {
  const facts=createOpeningFacts(713,184,{regions:[],surnames:[]});
  const started=dispatch(null,{version:ENGINE_VERSION,commandId:'innate-world',expectedRevision:0,type:'StartGame',name:`${facts.surname}測試`,seed:713,facts} satisfies GameCommand);
  if(!started.state||!started.state.innate||!started.state.phase2)throw new Error('fixture failed');
  return started.state;
}
const scene={location:'家宅・庭院',presentIds:['protagonist','example-clerk'],text:'測試場景'};

describe('v1.10 天生技可重播行為',()=>{
  it('幻術分發模式與深度獨立組合；純感知事故與實相直接傷害分開，且致命意圖可成立',()=>{
    const state=world(); const phase2=state.phase2!; let model=state.innate!;
    const distributions=['單體','萬軍共夢','千軍異夢'] as const, depths=['惑感','入實','五感實相'] as const;
    for(const distribution of distributions)for(const depth of depths){
      model=applyInnateAction(model,{type:'Illusion',ability:distribution==='單體'?'軒轅幻術・五感天幕':distribution,targets:['example-clerk'],excluded:[],distribution,depth,intent:'非致命',severity:2,accident:depth==='惑感'?'自行跌落台階':undefined},1,scene,phase2);
      const last=model.consequences.at(-1)!;expect(last.title).toBe(`${distribution} × ${depth}`);expect(last.intent).toBe('非致命');
      expect(last.secondary.length).toBe(depth==='惑感'?1:0);expect(last.direct.some(text=>text.includes('真實非致命直接創傷'))).toBe(depth==='入實'||depth==='五感實相');
    }
    const lethal=applyInnateAction(model,{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'五感實相',intent:'致命',severity:3},1,scene,phase2);
    expect(lethal.subjects['example-clerk'].alive).toBe(false);expect(lethal.consequences.at(-1)?.direct[0]).toContain('致命直接創傷');
    const nonlethal=applyInnateAction(state.innate!,{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'五感實相',intent:'非致命',severity:3},1,scene,phase2);
    expect(nonlethal.subjects['example-clerk'].alive).toBe(true);
    const differentDream=applyInnateAction(state.innate!,{type:'Illusion',ability:'千軍異夢',targets:['example-clerk','opening-family-0'],excluded:[],distribution:'千軍異夢',depth:'惑感',intent:'非致命',severity:1,content:'假軍令'},1,scene,phase2);
    expect(differentDream.consequences.at(-1)?.direct[0]).toContain('假軍令');expect(differentDream.consequences.at(-1)?.direct[1]).toContain('火海');
    expect(differentDream.subjects['example-clerk'].sensoryEffects?.at(-1)).toMatchObject({distribution:'千軍異夢',content:'假軍令',channels:['視覺','聽覺','嗅覺','味覺','觸覺']});
    expect(advanceInnate(differentDream,2,1).subjects['example-clerk'].sensoryEffects).toEqual([]);
  });

  it('幻術次生事故按玩家致命意圖結算，不致命意圖不升級成死亡',()=>{
    const state=world();
    const nonlethal=dispatch(state,{version:ENGINE_VERSION,commandId:'illusion-nonfatal',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'惑感',intent:'非致命',severity:1,accident:'跌落台階',accidentOutcome:'致命'}}).state!;
    expect(nonlethal.phase2?.persons.find(person=>person.id==='example-clerk')?.alive).toBe(true);expect(nonlethal.innate?.subjects['example-clerk'].injuries).toContain('幻術次生事故傷勢：跌落台階');
    const lethal=dispatch(state,{version:ENGINE_VERSION,commandId:'illusion-lethal-accident',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'惑感',intent:'致命',severity:1,accident:'跌落台階',accidentOutcome:'致命'}}).state!;
    expect(lethal.phase2?.persons.find(person=>person.id==='example-clerk')?.alive).toBe(false);expect(lethal.phase2?.persons.find(person=>person.id==='example-clerk')?.deathCause).toContain('次生事故');
  });

  it('威壓保存恐懼與創傷，但忠誠、人格及信任不被改寫',()=>{
    const state=world(),before=state.phase2!.relationships.find(record=>record.personId==='example-clerk')!;before.loyalty=100;
    let model=applyInnateAction(state.innate!,{type:'Pressure',targets:['example-clerk'],excluded:[],intensity:3,trauma:'深層'},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].fear).toBeGreaterThan(0);expect(model.subjects['example-clerk'].trauma).toHaveLength(1);
    expect(model.subjects['example-clerk'].temporaryEffects?.[0].label).toContain('不可承受的大恐怖');
    expect(state.phase2!.relationships.find(record=>record.personId==='example-clerk')).toEqual(before);
    model=advanceInnate(model,1,1);expect(model.subjects['example-clerk'].temporaryEffects).toEqual([]);expect(model.subjects['example-clerk'].traumaCourse?.[0].severity).toBe(2);
    model=advanceInnate(model,2,LIGHTNING_ENGINEERING_PARAMETERS.traumaEaseDaysPerLevel);expect(model.subjects['example-clerk'].traumaCourse?.[0].severity).toBe(1);
    expect(model.subjects['example-clerk'].trauma).toHaveLength(1);expect(state.phase2!.relationships.find(record=>record.personId==='example-clerk')?.loyalty).toBe(100);
  });

  it('伏地詛咒跨回合持續累傷；解除只停止後續傷害，不消除既有傷勢',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Curse',ability:'萬軍伏地',targets:['example-clerk'],excluded:[],intensity:3,turn:1},1,scene,state.phase2!);
    const startInjuries=model.subjects['example-clerk'].injuries.length;model=advanceInnate(model,2);model=advanceInnate(model,3);expect(model.subjects['example-clerk'].injuries.length).toBe(startInjuries+2);
    const curse=model.curses[0];model=applyInnateAction(model,{type:'ReleaseCurse',curseId:curse.id},3,scene,state.phase2!);const existing=[...model.subjects['example-clerk'].injuries];
    model=advanceInnate(model,4,1);expect(model.subjects['example-clerk'].injuries).toEqual(existing);expect(model.curses[0].active).toBe(false);
  });

  it('伏地按經過日數累積生理損害；3–5日標記死亡風險，解除不回復累積損耗',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Curse',ability:'妖術・伏地',targets:['example-clerk'],excluded:[],intensity:2,turn:1},1,scene,state.phase2!);
    model=advanceInnate(model,2,3);expect(model.curses[0].elapsedDays).toBe(3);expect(model.subjects['example-clerk'].lifeThreatened).not.toBe(true);
    model=advanceInnate(model,3,LIGHTNING_ENGINEERING_PARAMETERS.untreatedCurseHighRiskDays-3);expect(model.curses[0].elapsedDays).toBe(5);expect(model.subjects['example-clerk'].lifeThreatened).toBe(true);
    const harm=model.subjects['example-clerk'].accumulatedHarm!;model=applyInnateAction(model,{type:'ReleaseCurse',curseId:model.curses[0].id},3,scene,state.phase2!);
    expect(model.subjects['example-clerk'].lifeThreatened).toBe(true);expect(model.subjects['example-clerk'].accumulatedHarm).toBe(harm);
    while(model.subjects['example-clerk'].injuries.length)model=applyInnateAction(model,{type:'Heal',targetId:'example-clerk'},3,scene,state.phase2!);
    expect(model.subjects['example-clerk'].lifeThreatened).toBe(false);
    const afterTreatment=model.subjects['example-clerk'].accumulatedHarm!;expect(afterTreatment).toBeLessThan(harm);
    model=advanceInnate(model,4,30);expect(model.subjects['example-clerk'].accumulatedHarm).toBe(Math.max(0,afterTreatment-1));expect(model.curses[0].recoveryDays).toBe(30);
  });

  it('既有死亡紀錄同步至醫療名冊，避免對亡者再次治療',()=>{
    const state=world();const death=dispatch(state,{version:ENGINE_VERSION,commandId:'mark-clerk-dead',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'Phase2Action',action:{type:'MarkDeath',personId:'example-clerk',deathYear:state.world.year}}).state!;
    expect(death.innate?.subjects['example-clerk'].alive).toBe(false);expect(death.innate?.objects.find(item=>item.id==='person-body-example-clerk')?.kind).toBe('人類屍體');
    expect(()=>dispatch(death,{version:ENGINE_VERSION,commandId:'heal-dead-clerk',expectedRevision:death.revision,worldlineId:death.worldlineId,type:'InnateAction',action:{type:'Heal',targetId:'example-clerk'}})).toThrow('不能復活');
  });

  it('雷霆按目標直接結算、環境後果獨立記錄，沒有群體稀釋或預設反噬',()=>{
    const state=world();const model=applyInnateAction(state.innate!,{type:'Lightning',ability:'萬雷震軍',targets:['example-clerk'],excluded:[],intensity:3,intent:'非致命',scene:{weather:'雨',ground:'濕',terrain:'密集陣地',nearby:[{id:'opening-family-0',distanceMeters:6,cover:'露天',metalEquipment:true,mounted:false}],structures:[]},suppressSecondary:false},0,scene,state.phase2!);
    const event=model.consequences.at(-1)!;expect(event.targets).toHaveLength(1);expect(event.direct[0]).toContain('直接雷擊');expect(event.secondary.join(' ')).toContain('次生傷勢');expect(event.secondary.join(' ')).toContain('強光');
    expect(model.subjects['example-clerk'].alive).toBe(true);expect(model.subjects['example-clerk'].injuries).toContain('雷擊傷勢');
    const suppressed=applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',scene:{weather:'雨',ground:'濕',terrain:'木造聚落',nearby:[{id:'opening-family-0',distanceMeters:5,cover:'露天',metalEquipment:true,mounted:false}],structures:[]},suppressSecondary:true},0,scene,state.phase2!);
    expect(suppressed.consequences.at(-1)?.secondary).toEqual([]);
    expect(()=>applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:1,intent:'非致命',suppressSecondary:false},0,scene,state.phase2!)).toThrow('結構化場景');
  });

  it('七種雷霆派生逐項套用場景效果：地走導電、雷震爆震、軍陣間接電擊、禁域／雷海持續、破城損壞結構',()=>{
    const state=world();const context={weather:'雨' as const,ground:'濕' as const,terrain:'密集陣地' as const,nearby:[{id:'opening-family-0',distanceMeters:8,cover:'露天' as const,metalEquipment:true,mounted:false}],structures:[{objectId:'example-grain-store',distanceMeters:12,material:'木' as const,fragility:2 as const}]};
    const abilities=['軒轅天罰','地走雷','雷震','萬雷震軍','天雷禁域','天雷破城','軒轅天罰・雷海'] as const;
    const results=abilities.map((ability,index)=>applyInnateAction(state.innate!,{type:'Lightning',ability,targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',scene:context,suppressSecondary:false},index,scene,state.phase2!));
    expect(results.map(result=>result.consequences.at(-1)?.ability)).toEqual(abilities);
    expect(results[1].consequences.at(-1)?.secondary.join(' ')).toContain('地走雷沿潮濕地面擴散');
    expect(results[2].subjects['opening-family-0'].functionalImpairments?.join(' ')).toContain('雷震爆震');
    expect(results[3].subjects['opening-family-0'].injuries.join(' ')).toContain('萬雷震軍覆蓋區間接電擊');
    expect(results[4].lightningZones?.[0]?.active).toBe(true);expect(results[6].lightningZones?.[0]?.ability).toBe('軒轅天罰・雷海');
    expect(results[5].objects.find(object=>object.id==='example-grain-store')?.intact).toBe(false);
    const indoor=applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:1,intent:'非致命',scene:{...context,nearby:[{id:'opening-family-0',distanceMeters:20,cover:'室內',metalEquipment:false,mounted:false}]},suppressSecondary:false},1,scene,state.phase2!);
    expect(indoor.consequences.at(-1)?.secondary.join(' ')).toContain('室內遮蔽');expect(indoor.subjects['opening-family-0'].injuries).toEqual([]);
  });

  it('天雷禁域與雷海建立可持續雷場，逐回合造成後果，明確解除後停止追加',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Lightning',ability:'天雷禁域',targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',scene:{weather:'雨',ground:'濕',terrain:'密集陣地',nearby:[{id:'opening-family-0',distanceMeters:8,cover:'露天',metalEquipment:true,mounted:false}],structures:[]},suppressSecondary:false},0,scene,state.phase2!);
    const initial=model.subjects['example-clerk'].injuries.length;expect(model.lightningZones?.[0]?.active).toBe(true);
    model=advanceInnate(model,1,90);expect(model.subjects['example-clerk'].injuries.length).toBe(initial+1);
    const zone=model.lightningZones![0];model=applyInnateAction(model,{type:'ReleaseLightningZone',zoneId:zone.id},1,scene,state.phase2!);const afterRelease=model.subjects['example-clerk'].injuries.length;
    model=advanceInnate(model,2,90);expect(model.subjects['example-clerk'].injuries.length).toBe(afterRelease);expect(model.lightningZones![0].active).toBe(false);
  });

  it('持續雷域會自動處理同場新到者、排除對象與次生電擊；非致命意圖不造成死亡',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Lightning',ability:'天雷禁域',targets:['example-clerk'],excluded:['opening-family-0'],intensity:3,intent:'非致命',scene:{weather:'雨',ground:'濕',terrain:'密集陣地',nearby:[{id:'opening-family-0',distanceMeters:8,cover:'露天',metalEquipment:true,mounted:false}],structures:[]},suppressSecondary:false},0,scene,state.phase2!);
    const beforeExcluded=model.subjects['opening-family-0'].injuries.length;
    model.subjects['late-arrival']={...structuredClone(model.subjects['example-clerk']),id:'late-arrival',location:'家宅・庭院',alive:true,injuries:[]};
    model=advanceInnate(model,1,90);
    expect(model.subjects['late-arrival'].injuries.join(' ')).toContain('持續雷域範圍電擊');
    expect(model.subjects['late-arrival'].alive).toBe(true);
    expect(model.subjects['opening-family-0'].injuries).toHaveLength(beforeExcluded);
    expect(model.consequences.at(-1)?.secondary.join(' ')).toContain('late-arrival');
  });

  it('天雷破城依結構化構材與旁人距離自動結算飛散傷，並保留直接與次生來源',()=>{
    const state=world();
    const model=applyInnateAction(state.innate!,{type:'Lightning',ability:'天雷破城',targets:['example-clerk'],excluded:[],intensity:3,intent:'非致命',scene:{weather:'晴',ground:'乾',terrain:'石砌工事',nearby:[{id:'opening-family-0',distanceMeters:12,cover:'露天',metalEquipment:false,mounted:false}],structures:[{objectId:'example-grain-store',distanceMeters:10,material:'石',fragility:2}]},suppressSecondary:false},0,scene,state.phase2!);
    expect(model.subjects['opening-family-0'].injuries.join(' ')).toContain('飛散木石次生傷勢');
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('直接雷擊');
    expect(model.consequences.at(-1)?.secondary.join(' ')).toContain('飛散物次生傷勢');
    expect(model.subjects['opening-family-0'].alive).toBe(true);
  });

  it('五感盡失與疫病能力分別修改人物感官和疾病狀態',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SenseSeal',targetId:'example-clerk',excluded:[]},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].sensesLost).toBe(true);
    model=applyInnateAction(model,{type:'Disease',targets:['example-clerk','opening-family-0'],excluded:['opening-family-0'],disease:'指定熱病',intensity:2},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].disease).toContain('指定熱病');expect(model.subjects['opening-family-0'].disease).toEqual([]);
    model=advanceInnate(model,1,30);expect(model.subjects['example-clerk'].diseaseCourse?.[0].elapsedDays).toBe(30);expect(model.subjects['example-clerk'].diseaseCourse?.[0].intensity).toBe(3);
    model=applyInnateAction(model,{type:'Disease',targets:['example-clerk'],excluded:[],disease:'指定熱病',intensity:2,mode:'壓制'},1,scene,state.phase2!);
    expect(model.subjects['example-clerk'].diseaseCourse?.[0].controlled).toBe(true);
    model=applyInnateAction(model,{type:'Disease',targets:['example-clerk'],excluded:[],disease:'指定熱病',intensity:2,mode:'治療'},1,scene,state.phase2!);
    expect(model.subjects['example-clerk'].disease).toEqual([]);expect(model.subjects['example-clerk'].diseaseCourse).toEqual([]);
    model=applyInnateAction(model,{type:'SenseSeal',targetId:'example-clerk',excluded:[]},1,scene,state.phase2!);
    model=applyInnateAction(model,{type:'SenseSeal',targetId:'example-clerk',targets:['example-clerk','opening-family-0'],excluded:['opening-family-0']},1,scene,state.phase2!);
    expect(model.subjects['example-clerk'].sensesLost).toBe(true);expect(model.subjects['opening-family-0'].sensesLost).toBe(false);
    model=applyInnateAction(model,{type:'RestoreSenses',targetId:'example-clerk'},2,scene,state.phase2!);expect(model.subjects['example-clerk'].sensesLost).toBe(false);
  });

  it('封將實際封鎖神經肌群戰鬥功能且可明確解除，不以意志免疫',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SealGeneral',targetId:'example-clerk'},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].functionalImpairments?.some(item=>item.includes('握持、騎乘'))).toBe(true);
    expect(model.subjects['example-clerk'].injuries).toEqual([]);
    model=applyInnateAction(model,{type:'ReleaseSeal',targetId:'example-clerk'},1,scene,state.phase2!);
    expect(model.subjects['example-clerk'].functionalImpairments).toEqual([]);
  });

  it('隨時間控制未治疾病惡化，治療移除病程，未控制狀態保留逐段強度結果',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Disease',targets:['example-clerk'],excluded:[],disease:'示例熱病',intensity:1},0,scene,state.phase2!);
    model=advanceInnate(model,1,60);expect(model.subjects['example-clerk'].diseaseCourse?.[0]).toMatchObject({intensity:3,elapsedDays:60});
    const harm=model.subjects['example-clerk'].accumulatedHarm;
    model=applyInnateAction(model,{type:'Disease',targets:['example-clerk'],excluded:[],disease:'示例熱病',intensity:1,mode:'阻止惡化'},1,scene,state.phase2!);
    expect(model.subjects['example-clerk'].diseaseCourse?.[0]).toMatchObject({intensity:2,controlled:true});
    model=advanceInnate(model,2,90);expect(model.subjects['example-clerk'].diseaseCourse?.[0].elapsedDays).toBe(60);
    expect(model.subjects['example-clerk'].accumulatedHarm).toBe(harm);
  });

  it('照膽讀取已記錄的關係、恐懼與恩怨，不推導未建模的謊言或秘密',()=>{
    const state=world();const relation=state.phase2!.relationships.find(item=>item.personId==='example-clerk')!;relation.trust=31;relation.loyalty=74;relation.grievances.push({id:'g1',turn:0,text:'欠下工錢'});
    const model=applyInnateAction(state.innate!,{type:'UsePower',ability:'照膽',targetIds:['example-clerk'],excluded:[],intensity:1,instruction:''},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('信任 31、忠誠 74');
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('辨出欺瞞：聲稱手上沒有第二份糧冊');
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('存在受迫服從：家人被地方豪右扣留');
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('真實信念：縣府正在隱匿部分糧冊');
  });

  it('軒轅萬語可分別記錄聽、說、讀、寫操作，不擴張成讀心或文化資料下載',()=>{
    const state=world();let model=state.innate!;
    for(const [mode,instruction] of [['聽','na'],['說','水'],['讀','mira'],['寫','糧食']] as const)model=applyInnateAction(model,{type:'UsePower',ability:'軒轅萬語',targetIds:['example-clerk'],excluded:[],intensity:1,instruction,languageMode:mode,language:'示例西域語（示例）'},0,scene,state.phase2!);
    expect(model.languageActs?.map(act=>act.mode)).toEqual(['聽','說','讀','寫']);expect(model.languageActs?.map(act=>act.renderedText)).toEqual(['糧食','sala','平安','na']);expect(model.truthsKnown.some(item=>item.includes('文化'))).toBe(false);
    expect(()=>applyInnateAction(model,{type:'UsePower',ability:'軒轅萬語',targetIds:[],excluded:[],intensity:1,instruction:'缺操作欄'},0,scene,state.phase2!)).toThrow('選聽、說、讀、寫');
    expect(()=>applyInnateAction(model,{type:'UsePower',ability:'軒轅萬語',targetIds:['example-clerk'],excluded:[],intensity:1,instruction:'未知詞',languageMode:'聽',language:'示例西域語（示例）'},0,scene,state.phase2!)).toThrow('未宣稱已翻譯');
  });

  it('霸者橫攔派生能力操作具體物件／人物狀態，而非只增加戰力值',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Force',ability:'霸者橫攔・摧關',targets:[],excluded:[],objectId:'example-grain-store',instruction:'破開關門',intensity:3},0,scene,state.phase2!);
    expect(model.objects.find(item=>item.id==='example-grain-store')?.structural).toBe('已破壞');
    model=applyInnateAction(model,{type:'Force',ability:'萬民歸心',targets:['example-clerk'],excluded:[],instruction:'請願後自願合作',intensity:2},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].willingness).toBe(60);
    expect(state.phase2!.relationships.find(item=>item.personId==='example-clerk')?.loyalty).toBe(50);
    model=applyInnateAction(model,{type:'Force',ability:'霸者橫攔・撼陣',targets:[],excluded:[],objectId:'example-squad',instruction:'盾陣正面受撞',intensity:2},0,scene,state.phase2!);
    expect(model.scenarioUnits?.[0]).toMatchObject({cohesion:20,morale:34,order:'待命'});
    model=applyInnateAction(model,{type:'Force',ability:'霸者橫攔・不動',targets:[],excluded:[],instruction:'站定攔截奔馬',intensity:3},0,scene,state.phase2!);
    model=applyInnateAction(model,{type:'Contact',source:'example-horse',target:'protagonist',harmful:true,distanceMeters:1},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('主角以不動之勢承受衝擊');
  });

  it('山河薪火保存既有忠誠網絡、薪火不滅依存活忠誠者與資源重聚；萬軍如臂發布可觀察軍令',()=>{
    const state=world();const loyalty=state.phase2!.relationships.find(item=>item.personId==='example-clerk')!;loyalty.loyalty=72;
    let model=applyInnateAction(state.innate!,{type:'Force',ability:'山河薪火',targets:['example-clerk'],excluded:[],instruction:'建立跨地聯絡',intensity:3},0,scene,state.phase2!);
    expect(model.loyaltyNetworks?.[0]).toMatchObject({members:['example-clerk'],loyaltyAtFormation:{'example-clerk':72},active:true});
    model=applyInnateAction(model,{type:'DisruptNetwork',networkId:model.loyaltyNetworks![0].id},1,scene,state.phase2!);expect(model.loyaltyNetworks?.[0].active).toBe(false);
    const resourcesBefore=state.phase2!.items.map(item=>item.quantity);
    model=applyInnateAction(model,{type:'Force',ability:'薪火不滅',targets:['example-clerk'],excluded:[],instruction:'聯絡尚存成員',intensity:2},2,scene,state.phase2!);
    expect(model.loyaltyNetworks?.[0]).toMatchObject({active:true,reconnections:1,members:['example-clerk']});expect(state.phase2!.items.map(item=>item.quantity)).toEqual(resourcesBefore);
    model=applyInnateAction(model,{type:'Force',ability:'萬軍如臂',targets:[],excluded:[],objectId:'example-squad',unitCommand:'前進',instruction:'渡口東側',intensity:1},3,scene,state.phase2!);
    expect(model.scenarioUnits?.[0]).toMatchObject({members:40,order:'前進',location:'前進至渡口東側',fatigue:1});
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('統御感知：鄉亭護糧隊（示例）士氣 50/100、隊形 50/100、疲勞 0/100');
    expect(model.consequences.at(-1)?.direct.join(' ')).toContain('不虛構兵員、糧秣');
    model=applyInnateAction(model,{type:'Force',ability:'群星入懷',targets:['example-clerk'],excluded:[],instruction:'前往接觸示例譯者',intensity:2},4,scene,state.phase2!);
    expect(model.talentLeads?.[0]).toMatchObject({name:'鄉里譯者・示例人物',craft:'譯者／商路通譯',example:true});
  });

  it('藏界無容量上限但排除人類活體與屍體，其他生命可收納且不附帶保鮮',()=>{
    const state=world();let m=structuredClone(state.innate!);
    expect(()=>applyInnateAction(m,{type:'Store',objectId:'person-body-example-clerk'},0,scene,state.phase2!)).toThrow('排除人類');
    m.objects.push({id:'example-corpse',name:'亡者示例',quantity:1,ownerId:'example-deceased',custodianId:'example-deceased',location:'示例義塚',kind:'人類屍體',intact:true});
    const corpseId='example-corpse';
    expect(()=>applyInnateAction(m,{type:'Store',objectId:corpseId},0,scene,state.phase2!)).toThrow('排除人類');
    expect(()=>applyInnateAction(m,{type:'Store',objectId:'example-remote-cargo'},0,scene,state.phase2!)).toThrow('不能隔空');
    expect(()=>applyInnateAction(m,{type:'Flash',location:'前線',bringIds:['example-remote-cargo']},0,scene,state.phase2!)).toThrow('不能跨距離隔空搬運');
    const damaged=applyInnateAction(m,{type:'Store',objectId:'example-damaged-tool'},0,scene,state.phase2!);
    expect(damaged.objects.find(o=>o.id==='example-damaged-tool')?.intact).toBe(false);
    const horse=applyInnateAction(m,{type:'Store',objectId:'example-horse'},0,scene,state.phase2!);
    expect(horse.objects.find(o=>o.id==='example-horse')?.location).toBe('軒轅藏界');
    expect(horse.objects.find(o=>o.id==='example-horse')?.kind).toBe('其他生命');
    for(let i=0;i<160;i++)m.objects.push({id:`cargo-${i}`,name:`貨物${i}`,quantity:1000000,ownerId:'family',custodianId:'family',location:'家宅',kind:'物品',intact:true});
    for(let i=0;i<160;i++)m=applyInnateAction(m,{type:'Store',objectId:`cargo-${i}`},0,scene,state.phase2!);
    expect(m.subspace).toHaveLength(160);expect(m.objects.find(o=>o.id==='cargo-0')?.quantity).toBe(1000000);
  });

  it('藏界批次收納先驗證全體；混入人類時整份拒絕，不留下部分搬移',()=>{
    const state=world();const source=structuredClone(state.innate!);
    expect(()=>applyInnateAction(source,{type:'Store',objectId:'example-grain-store',objectIds:['example-grain-store','person-body-example-clerk']},0,scene,state.phase2!)).toThrow('排除人類');
    expect(source.objects.find(object=>object.id==='example-grain-store')?.location).toBe('家宅');expect(source.subspace).toEqual([]);
  });

  it('藏界加閃實際移動物資，數量、所有權與保管紀錄保留',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Store',objectId:'example-grain-store'},1,scene,state.phase2!);
    model=applyInnateAction(model,{type:'Flash',location:'前線糧倉',bringIds:['example-grain-store']},1,scene,state.phase2!);
    const cargo=model.objects.find(item=>item.id==='example-grain-store')!;
    expect(cargo.location).toBe('前線糧倉');expect(cargo.quantity).toBe(20);expect(cargo.ownerId).toBe('opening-family-0');expect(cargo.custodianId).toBe('protagonist');
    expect(model.subjects.protagonist.location).toBe('前線糧倉');expect(model.subspace).not.toContain(cargo.id);
  });

  it('A15：倉庫級貨量經藏界與主角閃現運輸後守恆，沒有負重欄位或所有權轉移',()=>{
    const state=world();const model=structuredClone(state.innate!);model.objects.push({id:'warehouse-cargo',name:'倉庫級糧貨（示例）',quantity:1_000_000,ownerId:'family',custodianId:'family',location:'家宅',kind:'物品',intact:true,reachable:true});
    const stored=applyInnateAction(model,{type:'Store',objectId:'warehouse-cargo'},1,scene,state.phase2!);
    const delivered=applyInnateAction(stored,{type:'Flash',location:'異地前線',bringIds:['warehouse-cargo']},1,scene,state.phase2!);
    expect(delivered.objects.find(item=>item.id==='warehouse-cargo')).toMatchObject({quantity:1_000_000,ownerId:'family',custodianId:'protagonist',location:'異地前線'});
    expect(delivered.subspace).not.toContain('warehouse-cargo');expect(delivered.subjects.protagonist.location).toBe('異地前線');
  });

  it('事件命令更新場景與第二階段物品卡，前線位置可以由介面觀察',()=>{
    const state=world();let current=dispatch(state,{version:ENGINE_VERSION,commandId:'store-ledger',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Store',objectId:'family-ledger'}}).state!;
    current=dispatch(current,{version:ENGINE_VERSION,commandId:'flash-ledger',expectedRevision:current.revision,worldlineId:current.worldlineId,type:'InnateAction',action:{type:'Flash',location:'前線糧倉',bringIds:['family-ledger']}}).state!;
    expect(current.phase2?.scene.location).toBe('前線糧倉');expect(current.phase2?.items[0].locationId).toBe('前線糧倉');
    expect(current.phase2?.items[0].ownerId).not.toBe('protagonist');expect(current.phase2?.items[0].custodianId).toBe('protagonist');
  });

  it('軒轅閃可攜帶明確納入的在場活人，場景名冊隨人物一起移動',()=>{
    const state=world();
    const personId=state.phase2!.scene.presentIds.find(id=>id!=='protagonist')!;
    const result=dispatch(state,{version:ENGINE_VERSION,commandId:'flash-person',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Flash',location:'前線',bringIds:[`person-body-${personId}`]}}).state!;
    expect(result.phase2?.scene.presentIds).toEqual(['protagonist',personId]);
    expect(result.innate?.subjects[personId].location).toBe('前線');
    const absent=state.phase2!.persons.find(person=>person.id!=='protagonist'&&!state.phase2!.scene.presentIds.includes(person.id))!;
    expect(()=>dispatch(state,{version:ENGINE_VERSION,commandId:'flash-absent-person',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Flash',location:'前線',bringIds:[`person-body-${absent.id}`]}})).toThrow('當前在場');
  });

  it('萬解只分解指定物件，不作用於生命，且不再保留完整戰利品',()=>{
    const state=world();const broken=applyInnateAction(state.innate!,{type:'Disassemble',objectIds:['example-grain-store'],excluded:['example-horse'],secondary:'失去支撐後旁側木架倒塌'},1,scene,state.phase2!);
    expect(broken.objects.find(item=>item.id==='example-grain-store')?.intact).toBe(false);expect(broken.consequences.at(-1)?.secondary).toHaveLength(1);
    expect(()=>applyInnateAction(state.innate!,{type:'Disassemble',objectIds:['person-body-example-clerk'],excluded:[]},1,scene,state.phase2!)).toThrow('不能直接分解生命');
    expect(()=>applyInnateAction(broken,{type:'Disassemble',objectIds:['example-grain-store'],excluded:[]},1,scene,state.phase2!)).toThrow('已分解');
  });

  it('A20：萬解只拆敵方盾牌器物，持盾者不受直接傷害；雷電環境效應獨立結算',()=>{
    const state=world();const bearerBefore=state.innate!.subjects['example-clerk'];
    const disassembled=applyInnateAction(state.innate!,{type:'Disassemble',objectIds:['example-enemy-shield'],excluded:[]},1,scene,state.phase2!);
    const shield=disassembled.objects.find(item=>item.id==='example-enemy-shield')!;
    expect(shield.disassembled).toBe(true);expect(shield.bearerId).toBe('example-clerk');
    expect(disassembled.subjects['example-clerk']).toEqual(bearerBefore);
    expect(()=>applyInnateAction(disassembled,{type:'Disassemble',objectIds:['example-enemy-shield'],excluded:[]},2,scene,state.phase2!)).toThrow('已分解');
    const lightning=applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',scene:{weather:'雨',ground:'濕',terrain:'密集陣地',nearby:[{id:'opening-family-0',distanceMeters:8,cover:'露天',metalEquipment:true,mounted:false}],structures:[{objectId:'example-grain-store',distanceMeters:9,material:'金屬',fragility:2}]},suppressSecondary:false},1,scene,state.phase2!);
    expect(lightning.subjects['example-clerk'].alive).toBe(true);
    expect(lightning.consequences.at(-1)?.direct[0]).toContain('直接雷擊');
    expect(lightning.consequences.at(-1)?.secondary.join(' ')).toContain('潮濕地面／降雨連接金屬導體');
    const batch=applyInnateAction(state.innate!,{type:'Disassemble',objectIds:['example-enemy-shield','example-damaged-tool'],excluded:['example-grain-store','example-clerk']},1,scene,state.phase2!);
    expect(batch.objects.find(item=>item.id==='example-enemy-shield')?.disassembled).toBe(true);
    expect(batch.objects.find(item=>item.id==='example-damaged-tool')?.disassembled).toBe(true);
    expect(batch.objects.find(item=>item.id==='example-grain-store')?.intact).toBe(true);
    expect(batch.subjects['example-clerk']).toEqual(bearerBefore);
  });

  it('極限收斂只攔個人有害接觸，沒有可耗盡的護盾值，選擇性接觸成立',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SetConvergence',active:true,allowedContacts:['opening-family-0']},0,scene,state.phase2!);
    for(const hazardType of ['有害物質','有害能量','有害接觸'] as const){model=applyInnateAction(model,{type:'Contact',source:'example-clerk',target:'protagonist',harmful:true,hazardType},0,scene,state.phase2!);expect(model.consequences.at(-1)?.title).toBe(`${hazardType}被阻`);}
    model=applyInnateAction(model,{type:'Contact',source:'example-clerk',target:'protagonist',harmful:false,hazardType:'一般友善接觸'},0,scene,state.phase2!);expect(model.consequences.at(-1)?.title).toBe('接觸依選擇性通行成立');
    model=applyInnateAction(model,{type:'Contact',source:'opening-family-0',target:'protagonist',harmful:true},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('接觸依選擇性通行成立');expect(model.convergence).not.toHaveProperty('shield');
    model.convergence.allowedContacts=[];
    model=applyInnateAction(model,{type:'Contact',source:'example-clerk',target:'protagonist',harmful:true,distanceMeters:3},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('超出個人防護範圍');
  });

  it('診斷、治療、回春、百脈改善各改變對應人物狀態，實歲不變且不復活',()=>{
    const state=world();let model=structuredClone(state.innate!);model.subjects['example-clerk'].injuries=['腿傷'];model.subjects['example-clerk'].disease=['熱病'];
    model=applyInnateAction(model,{type:'Diagnose',targetId:'example-clerk'},0,scene,state.phase2!);expect(model.truthsKnown.at(-1)).toContain('腿傷');
    const recoveryBefore=model.subjects['example-clerk'].bodySystems?.恢復??50;
    model=applyInnateAction(model,{type:'Heal',targetId:'example-clerk'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].injuries).toEqual([]);expect(model.subjects['example-clerk'].bodySystems?.恢復).toBe(recoveryBefore+HEALING_ENGINEERING_PARAMETERS.bodySystemPointsPerTreatedInjury);
    const realAge=state.phase2!.persons.find(person=>person.id==='example-clerk')!.birthYear;
    const bodyAge=model.subjects['example-clerk'].physiologicalAge;
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5,consent:true},0,scene,state.phase2!);expect(model.subjects['example-clerk'].physiologicalAge).toBe(bodyAge-5);
    expect(state.phase2!.persons.find(person=>person.id==='example-clerk')!.birthYear).toBe(realAge);
    model=applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'耐力提升'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].bodyChanges).toContain('耐力提升');
    model=applyInnateAction(model,{type:'SealGeneral',targetId:'example-clerk'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].functionalImpairments?.some(item=>item.startsWith('百脈封將'))).toBe(true);expect(model.subjects.protagonist.functionalImpairments).toBeUndefined();
    model.subjects['example-clerk'].alive=false;expect(()=>applyInnateAction(model,{type:'Heal',targetId:'example-clerk'},0,scene,state.phase2!)).toThrow('不能復活');
  });

  it('軒轅觀世、天醫敕生、萬疫與回春可作用其他生命範例而不要求動物同意',()=>{
    const state=world();let model=structuredClone(state.innate!);model.subjects['example-horse'].physiologicalAge=12;model.subjects['example-horse'].injuries=['蹄部傷勢'];
    model=applyInnateAction(model,{type:'Diagnose',targetId:'example-horse'},0,scene,state.phase2!);expect(model.truthsKnown.at(-1)).toContain('蹄部傷勢');
    model=applyInnateAction(model,{type:'Heal',targetId:'example-horse'},0,scene,state.phase2!);expect(model.subjects['example-horse'].injuries).toEqual([]);
    model=applyInnateAction(model,{type:'Disease',targets:['example-horse'],excluded:[],disease:'示例馬疫',intensity:1},0,scene,state.phase2!);expect(model.subjects['example-horse'].disease).toContain('示例馬疫');
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'example-horse',years:5},0,scene,state.phase2!);expect(model.subjects['example-horse'].physiologicalAge).toBe(7);
  });

  it('A22：回春與百脈更新可診斷的生理系統，效果只歸受術者且有明確邊界',()=>{
    const state=world();let model=structuredClone(state.innate!);const originalAge=model.subjects['example-clerk'].physiologicalAge;
    model=applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'改善長途耐力',system:'心肺',amount:15},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].bodySystems?.心肺).toBe(65);
    expect(model.subjects.protagonist.bodySystems?.心肺).toBe(50);
    model=applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'改善動態視覺',system:'感官',amount:10},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].bodySystems?.感官).toBe(60);
    expect(()=>applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'改善',system:'心肺',amount:26},0,scene,state.phase2!)).toThrow('1 至 25');
    expect(()=>applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5},0,scene,state.phase2!)).toThrow('須先同意');
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5,consent:true},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].physiologicalAge).toBe(Math.max(0,originalAge-5));
    expect(model.subjects['example-clerk'].bodySystems?.心肺).toBe(75);
    expect(model.subjects['example-clerk'].bodySystems?.感官).toBe(70);
    model=applyInnateAction(model,{type:'Diagnose',targetId:'example-clerk'},0,scene,state.phase2!);
    expect(model.truthsKnown.at(-1)).toContain('心肺狀態 75/100');
    const dead=structuredClone(model);dead.subjects['example-clerk'].alive=false;
    expect(()=>applyInnateAction(dead,{type:'Rejuvenate',targetId:'example-clerk',years:5},0,scene,state.phase2!)).toThrow('無效');
  });

  it('普通日曆推進會增加生理年齡；回春保留年齡偏移並在後續重新老化',()=>{
    const state=world();let model=advanceInnate(state.innate!,1,90,185);
    expect(model.subjects.protagonist.physiologicalAge).toBe(1);
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'protagonist',years:1},1,scene,state.phase2!);
    expect(model.subjects.protagonist.physiologicalAge).toBe(0);expect(model.subjects.protagonist.rejuvenationOffset).toBe(1);
    model=advanceInnate(model,2,90,186);expect(model.subjects.protagonist.physiologicalAge).toBe(1);
  });

  it('傳音單向抵達，共視取當下場景，推演明示未知仍未知',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SendThought',recipientId:'example-clerk',text:'請回報市集消息'},1,scene,state.phase2!);
    expect(model.messages[0].arrived).toBe(true);expect(model.consequences.at(-1)?.direct[0]).toContain('不會自動');
    model=applyInnateAction(model,{type:'ShareVision',targetIds:['example-clerk']},1,scene,state.phase2!);expect(model.visions[0].sceneText).toBe('測試場景');
    model=applyInnateAction(model,{type:'Predict',question:'明日的未知政變',evidence:''},1,scene,state.phase2!);expect(model.forecasts[0].markedUncertain).toBe(true);expect(model.forecasts[0].result).toContain('未知真相');
    model=applyInnateAction(model,{type:'Predict',question:'本回合私帳方向',evidence:'耕讀收入錢 4'},1,scene,state.phase2!);expect(model.forecasts.at(-1)?.result).toContain('私帳增加 4');expect(model.forecasts.at(-1)?.result).toContain('不能由此推定市場');
    model=applyInnateAction(model,{type:'Predict',question:'若無新命令會如何',evidence:'',structuredEvidence:{assets:[{name:'糧/family',balance:20,lastDelta:3}],relationships:[{personId:'example-clerk',trust:40,loyalty:70,fear:20,grievances:1}],units:[{name:'鄉亭隊（示例）',location:'家宅',order:'待命',morale:45,cohesion:50,fatigue:15}],injuries:[{label:'示例腿傷',elapsedTurns:2,active:true}]}},1,scene,state.phase2!);
    expect(model.forecasts.at(-1)?.result).toContain('情境餘額為 23');expect(model.forecasts.at(-1)?.result).toContain('信任 40、忠誠 70');expect(model.forecasts.at(-1)?.result).toContain('部隊不會自動移動');expect(model.forecasts.at(-1)?.result).toContain('示例腿傷');expect(model.forecasts.at(-1)?.result).toContain('政局仍未知');
  });

  it('七種原文組合式都執行底層能力；缺少必要條件時整組拒絕',()=>{
    const state=world(),p2=state.phase2!;let base=structuredClone(state.innate!);base.subjects['example-clerk'].injuries.push('示例腿傷');
    const lightning={type:'Lightning' as const,ability:'天雷禁域' as const,targets:['example-clerk'],excluded:[],intensity:1 as const,intent:'非致命' as const,scene:{weather:'晴' as const,ground:'乾' as const,terrain:'開闊地' as const,nearby:[],structures:[]},suppressSecondary:false};
    const siege=applyInnateAction(base,{type:'Combination',combination:'壓陣止戰',steps:[{type:'Curse',ability:'萬軍伏地',targets:['example-clerk'],excluded:[],intensity:1,turn:1},lightning]},1,scene,p2);
    expect(siege.curses.some(c=>c.ability==='萬軍伏地'&&c.active)).toBe(true);expect(siege.lightningZones?.some(zone=>zone.active)).toBe(true);
    const breach=applyInnateAction(base,{type:'Combination',combination:'破城而不屠城',steps:[{type:'SetConvergence',active:true,allowedContacts:[]},{type:'Force',ability:'霸者橫攔・摧關',targets:[],excluded:[],objectId:'example-grain-store',instruction:'城門',intensity:3},{type:'Force',ability:'萬民歸心',targets:['example-clerk'],excluded:[],instruction:'保證',intensity:1}]},1,scene,p2);
    expect(breach.convergence.active).toBe(true);expect(breach.objects.find(o=>o.id==='example-grain-store')?.intact).toBe(false);expect(breach.subjects['example-clerk'].willingness).toBeGreaterThan(50);
    const demo=applyInnateAction(base,{type:'Combination',combination:'天下公開示威',steps:[{type:'ShareVision',targetIds:['example-clerk']},lightning]},1,scene,p2);expect(demo.visions).toHaveLength(1);expect(demo.lightningZones?.[0].active).toBe(true);
    const reshape=applyInnateAction(base,{type:'Combination',combination:'名將級身體重塑',steps:[{type:'Diagnose',targetId:'example-clerk'},{type:'Improve',targetId:'example-clerk',change:'心肺改善',system:'心肺',amount:5},{type:'Heal',targetId:'example-clerk'}]},1,scene,p2);expect(reshape.subjects['example-clerk'].injuries).not.toContain('示例腿傷');expect(reshape.subjects['example-clerk'].bodySystems?.心肺).toBe(55);
    const rejuvenation=applyInnateAction(base,{type:'Combination',combination:'回春',steps:[{type:'Diagnose',targetId:'example-clerk'},{type:'Heal',targetId:'example-clerk'},{type:'Rejuvenate',targetId:'example-clerk',years:2,consent:true}]},1,scene,p2);expect(rejuvenation.subjects['example-clerk'].physiologicalAge).toBe(Math.max(0,base.subjects['example-clerk'].physiologicalAge-2));
    const response=applyInnateAction(base,{type:'Combination',combination:'跨天下親自處理突發事件',steps:[{type:'SendThought',recipientId:'example-clerk',text:'前往現場'},{type:'Flash',location:'遠方事發地',bringIds:[]}]},1,scene,p2);expect(response.subjects.protagonist.location).toBe('遠方事發地');expect(response.messages).toHaveLength(1);
    const supply=applyInnateAction(base,{type:'Combination',combination:'行走的無限軍需庫',steps:[{type:'Store',objectId:'example-grain-store'},{type:'Flash',location:'前線',bringIds:['example-grain-store']}]},1,scene,p2);expect(supply.objects.find(o=>o.id==='example-grain-store')).toMatchObject({location:'前線',quantity:20,ownerId:'opening-family-0',custodianId:'protagonist'});
    expect(()=>applyInnateAction(base,{type:'Combination',combination:'回春',steps:[{type:'Rejuvenate',targetId:'example-clerk',years:2,consent:true}]},1,scene,p2)).toThrow('缺少必需步驟');
  });

  it('正式能力清冊包含手冊全部能力；未支援者明確拒絕，不產生成功事件',()=>{
    const state=world();expect(OFFICIAL_ABILITIES.length).toBe(46);
    expect(()=>applyInnateAction(state.innate!,{type:'UsePower',ability:'天雷破城',targetIds:['example-clerk'],excluded:[],intensity:3,instruction:'破城'},0,scene,state.phase2!)).toThrow('尚未實作');
  });

  it('天生技操作以 v3 事件保存並可完整重播',()=>{
    const facts=createOpeningFacts(713,184,{regions:[],surnames:[]});
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'replay-innate',expectedRevision:0,type:'StartGame',name:`${facts.surname}測試`,seed:713,facts});
    const state=started.state!;const action={type:'Pressure' as const,targets:['example-clerk'],excluded:[],intensity:2 as const,trauma:'持續' as const};
    const result=dispatch(state,{version:ENGINE_VERSION,commandId:'use-pressure',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action});
    expect(result.state?.innate?.subjects['example-clerk'].fear).toBe(30);expect(replay([started.event!,result.event!])).toEqual(result.state);
  });
});
