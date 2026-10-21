import { describe, expect, it } from 'vitest';
import { createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameCommand } from './engine';
import { advanceInnate, applyInnateAction, OFFICIAL_ABILITIES } from './innate';

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
      expect(last.secondary.length).toBe(depth==='惑感'?1:0);expect(last.direct.some(text=>text.includes('直接傷勢'))).toBe(depth==='入實'||depth==='五感實相');
    }
    const lethal=applyInnateAction(model,{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'五感實相',intent:'致命',severity:3},1,scene,phase2);
    expect(lethal.subjects['example-clerk'].alive).toBe(false);expect(lethal.consequences.at(-1)?.direct[0]).toContain('致命直接傷害');
    const nonlethal=applyInnateAction(state.innate!,{type:'Illusion',ability:'軒轅幻術・五感天幕',targets:['example-clerk'],excluded:[],distribution:'單體',depth:'五感實相',intent:'非致命',severity:3},1,scene,phase2);
    expect(nonlethal.subjects['example-clerk'].alive).toBe(true);
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
    const model=applyInnateAction(state.innate!,{type:'Pressure',targets:['example-clerk'],excluded:[],intensity:3,trauma:'深層'},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].fear).toBeGreaterThan(0);expect(model.subjects['example-clerk'].trauma).toHaveLength(1);
    expect(state.phase2!.relationships.find(record=>record.personId==='example-clerk')).toEqual(before);
  });

  it('伏地詛咒跨回合持續累傷；解除只停止後續傷害，不消除既有傷勢',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Curse',ability:'萬軍伏地',targets:['example-clerk'],excluded:[],intensity:3,turn:1},1,scene,state.phase2!);
    model=advanceInnate(model,2);model=advanceInnate(model,3);expect(model.subjects['example-clerk'].injuries).toHaveLength(2);
    const curse=model.curses[0];model=applyInnateAction(model,{type:'ReleaseCurse',curseId:curse.id},3,scene,state.phase2!);const existing=[...model.subjects['example-clerk'].injuries];
    model=advanceInnate(model,4);expect(model.subjects['example-clerk'].injuries).toEqual(existing);expect(model.curses[0].active).toBe(false);
  });

  it('既有死亡紀錄同步至醫療名冊，避免對亡者再次治療',()=>{
    const state=world();const death=dispatch(state,{version:ENGINE_VERSION,commandId:'mark-clerk-dead',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'Phase2Action',action:{type:'MarkDeath',personId:'example-clerk',deathYear:state.world.year}}).state!;
    expect(death.innate?.subjects['example-clerk'].alive).toBe(false);expect(death.innate?.objects.find(item=>item.id==='person-body-example-clerk')?.kind).toBe('人類屍體');
    expect(()=>dispatch(death,{version:ENGINE_VERSION,commandId:'heal-dead-clerk',expectedRevision:death.revision,worldlineId:death.worldlineId,type:'InnateAction',action:{type:'Heal',targetId:'example-clerk'}})).toThrow('不能復活');
  });

  it('雷霆按目標直接結算、環境後果獨立記錄，沒有群體稀釋或預設反噬',()=>{
    const state=world();const model=applyInnateAction(state.innate!,{type:'Lightning',ability:'萬雷震軍',targets:['example-clerk','opening-family-0'],excluded:[],intensity:3,intent:'非致命',environment:'潮濕地面將電流傳至金屬器具',suppressSecondary:false},0,scene,state.phase2!);
    const event=model.consequences.at(-1)!;expect(event.targets).toHaveLength(2);expect(event.direct).toHaveLength(2);expect(event.secondary).toEqual(['雷電次生環境後果：潮濕地面將電流傳至金屬器具']);
    expect(model.subjects['example-clerk'].alive).toBe(true);expect(model.subjects['example-clerk'].injuries).toContain('雷擊傷勢');
    const suppressed=applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',environment:'旁側水槽帶電',suppressSecondary:true},0,scene,state.phase2!);
    expect(suppressed.consequences.at(-1)?.secondary).toEqual([]);
  });

  it('五感盡失與疫病能力分別修改人物感官和疾病狀態',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SenseSeal',targetId:'example-clerk',excluded:[]},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].sensesLost).toBe(true);
    model=applyInnateAction(model,{type:'Disease',targets:['example-clerk','opening-family-0'],excluded:['opening-family-0'],disease:'指定熱病',intensity:2},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].disease).toContain('指定熱病');expect(model.subjects['opening-family-0'].disease).toEqual([]);
  });

  it('霸者橫攔派生能力操作具體物件／人物狀態，而非只增加戰力值',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Force',ability:'霸者橫攔・摧關',targets:[],excluded:[],objectId:'example-grain-store',instruction:'破開關門',intensity:3},0,scene,state.phase2!);
    expect(model.objects.find(item=>item.id==='example-grain-store')?.structural).toBe('已破壞');
    model=applyInnateAction(model,{type:'Force',ability:'萬民歸心',targets:['example-clerk'],excluded:[],instruction:'請願後自願合作',intensity:2},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].willingness).toBe(60);
    expect(state.phase2!.relationships.find(item=>item.personId==='example-clerk')?.loyalty).toBe(50);
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

  it('藏界加閃實際移動物資，數量、所有權與保管紀錄保留',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'Store',objectId:'example-grain-store'},1,scene,state.phase2!);
    model=applyInnateAction(model,{type:'Flash',location:'前線糧倉',bringIds:['example-grain-store']},1,scene,state.phase2!);
    const cargo=model.objects.find(item=>item.id==='example-grain-store')!;
    expect(cargo.location).toBe('前線糧倉');expect(cargo.quantity).toBe(20);expect(cargo.ownerId).toBe('opening-family-0');expect(cargo.custodianId).toBe('protagonist');
    expect(model.subjects.protagonist.location).toBe('前線糧倉');expect(model.subspace).not.toContain(cargo.id);
  });

  it('事件命令更新場景與第二階段物品卡，前線位置可以由介面觀察',()=>{
    const state=world();let current=dispatch(state,{version:ENGINE_VERSION,commandId:'store-ledger',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'InnateAction',action:{type:'Store',objectId:'family-ledger'}}).state!;
    current=dispatch(current,{version:ENGINE_VERSION,commandId:'flash-ledger',expectedRevision:current.revision,worldlineId:current.worldlineId,type:'InnateAction',action:{type:'Flash',location:'前線糧倉',bringIds:['family-ledger']}}).state!;
    expect(current.phase2?.scene.location).toBe('前線糧倉');expect(current.phase2?.items[0].locationId).toBe('前線糧倉');
    expect(current.phase2?.items[0].ownerId).not.toBe('protagonist');expect(current.phase2?.items[0].custodianId).toBe('protagonist');
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
    const lightning=applyInnateAction(state.innate!,{type:'Lightning',ability:'軒轅天罰',targets:['example-clerk'],excluded:[],intensity:2,intent:'非致命',environment:'落點旁的潮濕鐵欄導電；未直擊者受強光與雷聲驚嚇',suppressSecondary:false},1,scene,state.phase2!);
    expect(lightning.subjects['example-clerk'].alive).toBe(true);
    expect(lightning.consequences.at(-1)?.direct[0]).toContain('直接雷擊');
    expect(lightning.consequences.at(-1)?.secondary[0]).toContain('潮濕鐵欄導電');
  });

  it('極限收斂只攔個人有害接觸，沒有可耗盡的護盾值，選擇性接觸成立',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SetConvergence',active:true,allowedContacts:['opening-family-0']},0,scene,state.phase2!);
    model=applyInnateAction(model,{type:'Contact',source:'example-clerk',target:'protagonist',harmful:true},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('有害接觸被阻');
    model=applyInnateAction(model,{type:'Contact',source:'opening-family-0',target:'protagonist',harmful:true},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('接觸依選擇性通行成立');expect(model.convergence).not.toHaveProperty('shield');
    model.convergence.allowedContacts=[];
    model=applyInnateAction(model,{type:'Contact',source:'example-clerk',target:'protagonist',harmful:true,distanceMeters:3},0,scene,state.phase2!);
    expect(model.consequences.at(-1)?.title).toBe('超出個人防護範圍');
  });

  it('診斷、治療、回春、百脈改善各改變對應人物狀態，實歲不變且不復活',()=>{
    const state=world();let model=structuredClone(state.innate!);model.subjects['example-clerk'].injuries=['腿傷'];model.subjects['example-clerk'].disease=['熱病'];
    model=applyInnateAction(model,{type:'Diagnose',targetId:'example-clerk'},0,scene,state.phase2!);expect(model.truthsKnown.at(-1)).toContain('腿傷');
    model=applyInnateAction(model,{type:'Heal',targetId:'example-clerk'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].injuries).toEqual([]);
    const realAge=state.phase2!.persons.find(person=>person.id==='example-clerk')!.birthYear;
    const bodyAge=model.subjects['example-clerk'].physiologicalAge;
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5,consent:true},0,scene,state.phase2!);expect(model.subjects['example-clerk'].physiologicalAge).toBe(bodyAge-5);
    expect(state.phase2!.persons.find(person=>person.id==='example-clerk')!.birthYear).toBe(realAge);
    model=applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'耐力提升'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].bodyChanges).toContain('耐力提升');
    model=applyInnateAction(model,{type:'GrantGift',targetId:'example-clerk',abilityName:'識字能力'},0,scene,state.phase2!);expect(model.subjects['example-clerk'].grantedAbilities).toContain('識字能力');expect(model.subjects.protagonist.grantedAbilities).toEqual([]);
    model.subjects['example-clerk'].alive=false;expect(()=>applyInnateAction(model,{type:'Heal',targetId:'example-clerk'},0,scene,state.phase2!)).toThrow('不能復活');
  });

  it('A22：回春與百脈更新可診斷的生理系統，效果只歸受術者且有明確邊界',()=>{
    const state=world();let model=structuredClone(state.innate!);const originalAge=model.subjects['example-clerk'].physiologicalAge;
    model=applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'改善長途耐力',system:'心肺',amount:15},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].bodySystems?.心肺).toBe(65);
    expect(model.subjects.protagonist.bodySystems?.心肺).toBe(50);
    expect(()=>applyInnateAction(model,{type:'Improve',targetId:'example-clerk',change:'改善',system:'心肺',amount:26},0,scene,state.phase2!)).toThrow('1 至 25');
    expect(()=>applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5},0,scene,state.phase2!)).toThrow('須先同意');
    model=applyInnateAction(model,{type:'Rejuvenate',targetId:'example-clerk',years:5,consent:true},0,scene,state.phase2!);
    expect(model.subjects['example-clerk'].physiologicalAge).toBe(Math.max(0,originalAge-5));
    expect(model.subjects['example-clerk'].bodySystems?.心肺).toBe(65);
    model=applyInnateAction(model,{type:'Diagnose',targetId:'example-clerk'},0,scene,state.phase2!);
    expect(model.truthsKnown.at(-1)).toContain('心肺狀態 65/100');
    const dead=structuredClone(model);dead.subjects['example-clerk'].alive=false;
    expect(()=>applyInnateAction(dead,{type:'Rejuvenate',targetId:'example-clerk',years:5},0,scene,state.phase2!)).toThrow('無效');
  });

  it('傳音單向抵達，共視取當下場景，推演明示未知仍未知',()=>{
    const state=world();let model=applyInnateAction(state.innate!,{type:'SendThought',recipientId:'example-clerk',text:'請回報市集消息'},1,scene,state.phase2!);
    expect(model.messages[0].arrived).toBe(true);expect(model.consequences.at(-1)?.direct[0]).toContain('不會自動');
    model=applyInnateAction(model,{type:'ShareVision',targetIds:['example-clerk']},1,scene,state.phase2!);expect(model.visions[0].sceneText).toBe('測試場景');
    model=applyInnateAction(model,{type:'Predict',question:'明日的未知政變',evidence:''},1,scene,state.phase2!);expect(model.forecasts[0].markedUncertain).toBe(true);expect(model.forecasts[0].result).toContain('未知真相');
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
