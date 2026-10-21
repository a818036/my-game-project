import type { Phase2Model } from './phase2';

export type AbilityId =
  | '軒轅之命'|'照膽'|'山河薪火'|'薪火不滅'|'群星入懷'|'萬民歸心'|'萬象推演'|'萬軍如臂'
  | '軒轅幻術・五感天幕'|'全幻術系強制執行通則'|'萬軍共夢'|'千軍異夢'|'惑感'|'入實'|'五感實相'|'五感盡失'|'神識威壓'
  | '妖術・伏地'|'萬軍伏地'|'全雷霆系強制敘事通則'|'軒轅天罰'|'地走雷'|'雷震'|'萬雷震軍'|'天雷禁域'|'天雷破城'|'軒轅天罰・雷海'
  | '百脈敕令'|'百脈敕令・封將'|'萬疫敕令'|'軒轅觀世'|'天醫敕生'|'歲月回春'|'軒轅傳音'|'軒轅傳音・天下共視'
  | '軒轅閃'|'軒轅藏界'|'軒轅萬語'|'霸者橫攔'|'霸者橫攔・摧關'|'霸者橫攔・撼陣'|'霸者橫攔・霸王擲'|'霸者橫攔・不動'|'霸骨天成'|'軒轅極限收斂'|'萬解';

export const OFFICIAL_ABILITIES: readonly AbilityId[] = [
  '軒轅之命','照膽','山河薪火','薪火不滅','群星入懷','萬民歸心','萬象推演','萬軍如臂','軒轅幻術・五感天幕','全幻術系強制執行通則','萬軍共夢','千軍異夢','惑感','入實','五感實相','五感盡失','神識威壓','妖術・伏地','萬軍伏地','全雷霆系強制敘事通則','軒轅天罰','地走雷','雷震','萬雷震軍','天雷禁域','天雷破城','軒轅天罰・雷海','百脈敕令','百脈敕令・封將','萬疫敕令','軒轅觀世','天醫敕生','歲月回春','軒轅傳音','軒轅傳音・天下共視','軒轅閃','軒轅藏界','軒轅萬語','霸者橫攔','霸者橫攔・摧關','霸者橫攔・撼陣','霸者橫攔・霸王擲','霸者橫攔・不動','霸骨天成','軒轅極限收斂','萬解',
];

export type IllusionDistribution = '單體'|'萬軍共夢'|'千軍異夢';
export type RealityDepth = '惑感'|'入實'|'五感實相';
export type HarmIntent = '非致命'|'致命';
export type BodySystem = '神經'|'肌力'|'肌腱關節'|'循環'|'心肺'|'疼痛'|'平衡'|'反射'|'恢復';
export interface InnateSubject { id: string; fear: number; trauma: string[]; injuries: string[]; disease: string[]; physiologicalAge: number; bodyChanges: string[]; grantedAbilities:string[]; sensesLost: boolean; morale: number; willingness: number; location: string; alive: boolean; /** v1-compatible optional physiology detail */ bodySystems?: Partial<Record<BodySystem, number>>; }
export interface StoredObject { id: string; name: string; quantity: number; ownerId: string; custodianId: string; location: string; kind: '物品'|'人類活體'|'人類屍體'|'其他生命'; intact: boolean; disassembled?:boolean; reachable?:boolean; decay?: string; motionBlocked?: boolean; structural?: string; bearerId?:string; }
export interface InnateConsequence { id: string; turn: number; ability: AbilityId; targets: string[]; excluded: string[]; title: string; direct: string[]; secondary: string[]; intent?: HarmIntent; }
export interface ActiveCurse { id: string; targetId: string; ability: '妖術・伏地'|'萬軍伏地'; intensity: number; startedTurn: number; active: boolean; accruedInjuries: number; }
export interface InnateModel {
  version: 1; subjects: Record<string, InnateSubject>; objects: StoredObject[]; subspace: string[]; consequences: InnateConsequence[]; curses: ActiveCurse[];
  convergence: { active: boolean; allowedContacts: string[]; radiusMeters:2 }; anchored:boolean; visions: Array<{turn:number; targetIds:string[]; location:string; sceneText:string}>;
  messages: Array<{turn:number; recipientId:string; text:string; arrived:boolean}>; truthsKnown: string[]; forecasts: Array<{turn:number; question:string; result:string; markedUncertain:boolean}>; environmentalEvents:string[];
}

export type InnateAction =
 | { type:'Illusion'; ability: Extract<AbilityId,'軒轅幻術・五感天幕'|'萬軍共夢'|'千軍異夢'>; targets:string[]; excluded:string[]; distribution:IllusionDistribution; depth:RealityDepth; intent:HarmIntent; severity:1|2|3; accident?:string; accidentOutcome?:'無傷'|'受傷'|'致命' }
 | { type:'Lightning'; ability:'軒轅天罰'|'地走雷'|'雷震'|'萬雷震軍'|'天雷禁域'|'天雷破城'|'軒轅天罰・雷海'; targets:string[]; excluded:string[]; intensity:1|2|3; intent:HarmIntent; environment:string; suppressSecondary:boolean }
 | { type:'Disease'; targets:string[]; excluded:string[]; disease:string; intensity:1|2|3 }
 | { type:'Pressure'; targets:string[]; excluded:string[]; intensity:1|2|3; trauma:'短暫'|'持續'|'深層' }
 | { type:'Curse'; ability:'妖術・伏地'|'萬軍伏地'; targets:string[]; excluded:string[]; intensity:1|2|3; turn:number }
 | { type:'ReleaseCurse'; curseId:string }
 | { type:'Store'; objectId:string }
 | { type:'Retrieve'; objectId:string; location:string }
 | { type:'Flash'; location:string; bringIds:string[] }
 | { type:'Disassemble'; objectIds:string[]; excluded:string[]; secondary?:string }
 | { type:'SetConvergence'; active:boolean; allowedContacts:string[] }
 | { type:'Contact'; source:string; target:string; harmful:boolean; distanceMeters?:number }
 | { type:'Diagnose'; targetId:string }
 | { type:'Heal'; targetId:string; injuryIndex?:number; diseaseIndex?:number }
 | { type:'Rejuvenate'; targetId:string; years:number; consent?:boolean }
 | { type:'Improve'; targetId:string; change:string; system?:BodySystem; amount?:number }
 | { type:'GrantGift'; targetId:string; abilityName:string }
 | { type:'SendThought'; recipientId:string; text:string }
 | { type:'ShareVision'; targetIds:string[] }
 | { type:'Predict'; question:string; evidence:string }
 | { type:'SenseSeal'; targetId:string; excluded:string[] }
 | { type:'Force'; ability:'霸者橫攔'|'霸者橫攔・摧關'|'霸者橫攔・撼陣'|'霸者橫攔・霸王擲'|'霸者橫攔・不動'|'霸骨天成'|'山河薪火'|'薪火不滅'|'群星入懷'|'萬民歸心'|'萬軍如臂'; targets:string[]; excluded:string[]; objectId?:string; instruction:string; intensity:1|2|3 }
 | { type:'UsePower'; ability:AbilityId; targetIds:string[]; excluded:string[]; intensity:1|2|3; intent?:HarmIntent; instruction:string };

export function createInnateModel(phase2: Phase2Model, birthYear:number, location:string): InnateModel {
  const subjects: InnateModel['subjects'] = {};
  for (const person of phase2.persons) subjects[person.id] = { id:person.id, fear:0, trauma:[], injuries:[], disease:[], physiologicalAge:Math.max(0,birthYear-person.birthYear), bodyChanges:[],grantedAbilities:[],sensesLost:false,morale:50,willingness:50,location:person.alive?location:'亡者紀錄', alive:person.alive, bodySystems:{神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,平衡:50,反射:50,恢復:50} };
  const initialObjects: StoredObject[] = phase2.items.map((item) => ({ id:item.id, name:item.item, quantity:item.quantity, ownerId:item.ownerId, custodianId:item.custodianId, location:item.locationId, kind:'物品', intact:true,reachable:true }));
  initialObjects.push({ id:'example-grain-store',name:'家中倉糧（示例）',quantity:20,ownerId:'opening-family-0',custodianId:'opening-family-0',location:'家宅',kind:'物品',intact:true,reachable:true });
  initialObjects.push({ id:'example-damaged-tool',name:'損壞農具（示例）',quantity:1,ownerId:'opening-family-0',custodianId:'opening-family-0',location:'家宅',kind:'物品',intact:false,reachable:true });
  initialObjects.push({ id:'example-remote-cargo',name:'遠方府庫糧貨（示例）',quantity:50,ownerId:'county',custodianId:'county',location:'遠方府庫',kind:'物品',intact:true,reachable:false });
  initialObjects.push({ id:'example-horse',name:'家中馬匹（其他生命示例）',quantity:1,ownerId:'opening-family-0',custodianId:'opening-family-0',location,kind:'其他生命',intact:true,reachable:true });
  initialObjects.push({ id:'example-enemy-shield',name:'敵方木盾（示例）',quantity:1,ownerId:'example-clerk',custodianId:'example-clerk',location,kind:'物品',intact:true,reachable:true,bearerId:'example-clerk' });
  for (const person of phase2.persons) initialObjects.push({id:`person-body-${person.id}`,name:`${person.name}（人類${person.alive?'活體':'屍體'}）`,quantity:1,ownerId:person.id,custodianId:person.id,location:person.alive?location:'亡者紀錄',kind:person.alive?'人類活體':'人類屍體',intact:true,reachable:true});
  return { version:1, subjects, objects:initialObjects, subspace:[], consequences:[],curses:[],convergence:{active:false,allowedContacts:[],radiusMeters:2},anchored:false,visions:[],messages:[],truthsKnown:[],forecasts:[],environmentalEvents:[] };
}

const ids = (values:string[], excluded:string[]) => values.filter((id,index)=>values.indexOf(id)===index&&!excluded.includes(id));
function subject(model:InnateModel,id:string):InnateSubject { const result=model.subjects[id]; if(!result) throw new Error(`找不到目標人物：${id}`); return result; }
function result(model:InnateModel,turn:number,ability:AbilityId,targets:string[],excluded:string[],title:string,direct:string[]=[],secondary:string[]=[],intent?:HarmIntent) {
  model.consequences.push({id:`innate-${turn}-${model.consequences.length+1}`,turn,ability,targets:[...targets],excluded:[...excluded],title,direct,secondary,...(intent?{intent}:{})});
}
function injury(subject:InnateSubject,label:string) { if(subject.alive) subject.injuries.push(label); }

export function applyInnateAction(source:InnateModel,action:InnateAction,turn:number,scene:{location:string;presentIds:string[];text:string},phase2:Phase2Model):InnateModel {
  // Keep the Phase 2 roster as the authority for which simulated people exist.
  const knownPeople = new Set(phase2.persons.map(person=>person.id));
  const m=structuredClone(source);
  switch(action.type) {
    case 'Illusion': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇至少一名目標');
      const direct:string[]=[],secondary:string[]=[];
      if(action.depth==='入實'||action.depth==='五感實相') for(const id of targets){const s=subject(m,id);injury(s,action.severity===3&&action.intent==='致命'?'幻術實相致命傷':'幻術實相傷勢');if(action.severity===3&&action.intent==='致命')s.alive=false;direct.push(`${id}：${action.severity===3&&action.intent==='致命'?'致命直接傷害':'實相直接傷勢'}（強度 ${action.severity}）`);}
      else direct.push('僅造成感知內容，沒有直接身體傷害');
      if(action.accident){
        const outcome=action.accidentOutcome;
        if(outcome==='致命'&&action.intent==='致命')for(const id of targets){const s=subject(m,id);if(s.alive){s.alive=false;s.injuries.push(`次生事故致命：${action.accident}`);}}
        else if(outcome==='受傷'||outcome==='致命')for(const id of targets)injury(subject(m,id),`幻術次生事故傷勢：${action.accident}`);
        secondary.push(`次生事故：${action.accident}${outcome?`（${action.intent==='非致命'&&outcome==='致命'?'非致命意圖，結果限於受傷':outcome}）`:''}`);
      }
      const ability=action.ability; result(m,turn,ability,targets,action.excluded,`${action.distribution} × ${action.depth}`,direct,secondary,action.intent);
      return m;
    }
    case 'Lightning': {
      const targets=ids(action.targets,action.excluded);if(!targets.length&&!action.environment.trim())throw new Error('雷霆須選擇目標或明確場景');
      const direct:string[]=[];for(const id of targets){const s=subject(m,id);if(!s.alive)continue;s.injuries.push(action.intent==='致命'&&action.intensity===3?'雷擊致命傷':'雷擊傷勢');if(action.intent==='致命'&&action.intensity===3)s.alive=false;direct.push(`${id}：直接雷擊${action.intent==='致命'&&action.intensity===3?'致命傷':'傷勢'}`);}
      const secondary=action.environment.trim()&&!action.suppressSecondary?[`雷電次生環境後果：${action.environment.trim()}`]:[];
      if(secondary.length)m.environmentalEvents.push(secondary[0]);
      result(m,turn,action.ability,targets,action.excluded,`雷霆作用・強度 ${action.intensity}`,direct,secondary,action.intent);return m;
    }
    case 'Disease': {
      const targets=ids(action.targets,action.excluded);if(!targets.length||!action.disease.trim())throw new Error('請指定疾病內容、目標與排除對象');
      for(const id of targets){const s=subject(m,id);if(!s.alive)continue;s.disease.push(action.disease.trim());}
      result(m,turn,'萬疫敕令',targets,action.excluded,'指定疾病狀態成立',targets.map(id=>`${id}：新增疾病「${action.disease.trim()}」（強度 ${action.intensity}）`));return m;
    }
    case 'Pressure': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇威壓目標');
      for(const id of targets){if(!knownPeople.has(id))throw new Error('威壓目標不在人物名冊');const s=subject(m,id);s.fear=Math.min(100,s.fear+action.intensity*15); if(action.trauma!=='短暫') s.trauma.push(action.trauma==='深層'?'神識威壓留下深層創傷':'神識威壓持續創傷');}
      result(m,turn,'神識威壓',targets,action.excluded,`神識壓制・強度 ${action.intensity}`,targets.map(id=>`${id}：恐懼 ${action.intensity*15}；${action.trauma}創傷`),['忠誠與人格維持原值']); return m;
    }
    case 'Curse': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇詛咒目標');
      for(const id of targets){if(!subject(m,id).alive)throw new Error('持續詛咒不能施於已故人物');m.curses.push({id:`curse-${turn}-${m.curses.length+1}`,targetId:id,ability:action.ability,intensity:action.intensity,startedTurn:turn,active:true,accruedInjuries:0});}
      result(m,turn,action.ability,targets,action.excluded,'持續性妖術已成立',targets.map(id=>`${id}：持續性詛咒開始；已累積傷勢不因解除消失`)); return m;
    }
    case 'ReleaseCurse': { const c=m.curses.find(entry=>entry.id===action.curseId&&entry.active); if(!c) throw new Error('找不到仍有效的詛咒'); c.active=false; result(m,turn,c.ability,[c.targetId],[],'詛咒已解除，既有傷勢保留'); return m; }
    case 'Store': {
      const object=m.objects.find(item=>item.id===action.objectId); if(!object||object.disassembled) throw new Error('找不到可收納的物件或物件已被萬解分解');
      if(object.kind==='人類活體'||object.kind==='人類屍體') throw new Error('藏界明確排除人類活體與屍體');
      if(object.reachable===false) throw new Error('藏界不能隔空取物；目標須在可直接接觸範圍');
      object.location='軒轅藏界';object.custodianId='protagonist';if(!m.subspace.includes(object.id))m.subspace.push(object.id);
      result(m,turn,'軒轅藏界',[object.id],[],'物品進入無容量上限的藏界',[`${object.name} ×${object.quantity}：位置更新；所有權仍屬 ${object.ownerId}；保管轉為主角`]);return m;
    }
    case 'Retrieve': {
      const object=m.objects.find(item=>item.id===action.objectId); if(!object||!m.subspace.includes(object.id))throw new Error('物件不在藏界');
      object.location=action.location;object.custodianId='protagonist';m.subspace=m.subspace.filter(id=>id!==object.id);
      result(m,turn,'軒轅藏界',[object.id],[],'物品由藏界取出',[`${object.name} ×${object.quantity}：取至 ${action.location}；所有權 ${object.ownerId}、保管人主角`]);return m;
    }
    case 'Flash': {
      const carried=action.bringIds.map(id=>m.objects.find(item=>item.id===id)).filter((item):item is StoredObject=>!!item);
      for(const object of carried){if(!m.subspace.includes(object.id)&&object.reachable===false)throw new Error('軒轅閃不能跨距離隔空搬運；須由主角親自到場或從藏界取出');if(object.kind==='人類活體'&&object.custodianId!=='protagonist')throw new Error('只能攜帶已納入本次行動的對象');object.location=action.location;m.subspace=m.subspace.filter(id=>id!==object.id);}
      const p=subject(m,'protagonist');p.location=action.location;
      result(m,turn,'軒轅閃',['protagonist',...carried.map(item=>item.id)],[],'主角親自完成跨地移動',[`主角與明確攜帶對象到達 ${action.location}`,...carried.map(item=>`${item.name} ×${item.quantity}：所有權 ${item.ownerId}；保管人 ${item.custodianId}`)]);return m;
    }
    case 'Disassemble': {
      const targets=ids(action.objectIds,action.excluded);if(!targets.length)throw new Error('請指定萬解目標及排除對象');
      const direct:string[]=[];for(const id of targets){const object=m.objects.find(item=>item.id===id);if(!object)throw new Error(`找不到物件：${id}`);if(object.kind==='人類活體'||object.kind==='人類屍體')throw new Error('萬解不能直接分解生命或人類屍體');if(object.disassembled)throw new Error(`${object.name} 已分解，不可再次作為完整目標`);object.intact=false;object.disassembled=true;object.location='已分解';direct.push(`${object.name} ×${object.quantity}：已不可逆分解，不能作為完整戰利品`);}
      result(m,turn,'萬解',targets,action.excluded,'指定物品已選擇性分解',direct,action.secondary?[`次生後果另行計算：${action.secondary}`]:[]);return m;
    }
    case 'SetConvergence': m.convergence={active:action.active,allowedContacts:[...new Set(action.allowedContacts)],radiusMeters:2};result(m,turn,'軒轅極限收斂',[],[] ,action.active?'個人防禦已開啟':'個人防禦已關閉',[`只保護主角個人約 ${m.convergence.radiusMeters}m 範圍；沒有護盾值`,action.active?'有害物質／能量在範圍內無法傷及主角；僅指定接觸可通行':'防護停止']);return m;
    case 'Contact': {const distance=action.distanceMeters??1;if(!Number.isFinite(distance)||distance<0)throw new Error('接觸距離無效');const allowed=m.convergence.allowedContacts.includes(action.source)||m.convergence.allowedContacts.includes(action.target);const inRange=distance<=m.convergence.radiusMeters;const blocked=m.convergence.active&&action.harmful&&inRange&&!allowed;result(m,turn,'軒轅極限收斂',[action.source,action.target],[] ,blocked?'有害接觸被阻':!inRange?'超出個人防護範圍':'接觸依選擇性通行成立',[blocked?`距離 ${distance}m，在個人防護範圍內且未造成傷害`:`距離 ${distance}m：${action.source} → ${action.target}`]);return m;}
    case 'Diagnose': {const s=subject(m,action.targetId);const findings=[...s.injuries,...s.disease];const systems=Object.entries(s.bodySystems??{}).map(([system,value])=>`${system}狀態 ${value}/100`);const text=[findings.length?findings.join('；'):'目前沒有可診出的傷勢或疾病',...systems].join('；');m.truthsKnown.push(`${action.targetId}診斷：${text}`);result(m,turn,'軒轅觀世',[action.targetId],[],'診斷完成',[text]);return m;}
    case 'Heal': {const s=subject(m,action.targetId);if(!s.alive)throw new Error('天醫敕生不能復活亡者');let healed:string|undefined;if(action.injuryIndex!==undefined)healed=s.injuries.splice(action.injuryIndex,1)[0];else if(action.diseaseIndex!==undefined)healed=s.disease.splice(action.diseaseIndex,1)[0];else if(s.injuries.length)healed=s.injuries.shift();else if(s.disease.length)healed=s.disease.shift();if(!healed)throw new Error('沒有指定可治療的傷勢或疾病');result(m,turn,'天醫敕生',[action.targetId],[],'治療完成',[`${healed} 已修復`]);return m;}
    case 'Rejuvenate': {const s=subject(m,action.targetId);if(!s.alive||!Number.isInteger(action.years)||action.years<1)throw new Error('回春目標或幅度無效');if(action.targetId!=='protagonist'&&!action.consent)throw new Error('具有自主意志的受術者須先同意回春');const before=s.physiologicalAge;s.physiologicalAge=Math.max(0,before-action.years);const applied=before-s.physiologicalAge;result(m,turn,'歲月回春',[action.targetId],[],'生理狀態回春',[`生理年齡減少 ${applied} 年；實際出生年、實歲、記憶與人格不變`]);return m;}
    case 'Improve': {const s=subject(m,action.targetId);if(!s.alive||!action.change.trim())throw new Error('能力改善目標或內容無效');const system=action.system,amount=action.amount;const applied=!!system&&amount!==undefined;if(applied){if(!Number.isInteger(amount)||amount<1||amount>25)throw new Error('百脈改善幅度須為 1 至 25');const systems=s.bodySystems??(s.bodySystems={});const before=systems[system]??50;systems[system]=Math.min(100,before+amount);s.bodyChanges.push(`${system} ${before}→${systems[system]}`);}else s.bodyChanges.push(action.change.trim());result(m,turn,'百脈敕令',[action.targetId],[],'受術者身體能力改善',[`${applied?`${system}狀態提升 ${amount} 點；`:''}${action.change.trim()}；改善屬於受術者，不會複製為主角天生技`]);return m;}
    case 'GrantGift': {const s=subject(m,action.targetId);if(!s.alive||!action.abilityName.trim())throw new Error('封授目標或能力名稱無效');s.grantedAbilities.push(action.abilityName.trim());result(m,turn,'百脈敕令・封將',[action.targetId],[],'能力成果授予受術者',[`${action.abilityName.trim()} 登記於受術者本人；主角沒有因此取得新天生技`]);return m;}
    case 'SendThought': {subject(m,action.recipientId);if(!action.text.trim())throw new Error('傳音內容不可空白');m.messages.push({turn,recipientId:action.recipientId,text:action.text.trim(),arrived:true});result(m,turn,'軒轅傳音',[action.recipientId],[],'單向傳音抵達',[`訊息已抵達；不會自動產生對方回話`]);return m;}
    case 'ShareVision': {const targets=ids(action.targetIds,[]);if(!targets.length)throw new Error('請選擇共視對象');for(const id of targets)subject(m,id);m.visions.push({turn,targetIds:targets,location:scene.location,sceneText:scene.text});result(m,turn,'軒轅傳音・天下共視',targets,[],'共視直播成立',[`分享當下 ${scene.location} 的實際場景`]);return m;}
    case 'Predict': {if(!action.question.trim())throw new Error('請描述推演問題');const supported=action.evidence.trim();const forecast=supported?`依已知資料「${supported}」只能推得可能方向；未知事實仍未知。`:'缺少可核對的已知資料，不能推演出未知真相。';m.forecasts.push({turn,question:action.question,result:forecast,markedUncertain:true});result(m,turn,'萬象推演',[],[],'推演完成',[forecast]);return m;}
    case 'SenseSeal': {const s=subject(m,action.targetId);if(action.excluded.includes(action.targetId))throw new Error('目標已列入排除對象');s.sensesLost=true;result(m,turn,'五感盡失',[action.targetId],action.excluded,'目標五感失去作用',[`${action.targetId} 的視覺、聽覺、嗅覺、味覺、觸覺均失去作用`]);return m;}
    case 'Force': {
      if(!action.instruction.trim())throw new Error('請描述施力方向／實際目標');const targets=ids(action.targets,action.excluded);const a=action.ability;const direct:string[]=[];
      if(a==='霸者橫攔'){if(!action.objectId)throw new Error('橫攔須指定正在移動的物件');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到阻攔物件');object.motionBlocked=true;direct.push(`${object.name} 的移動被攔停`);}
      else if(a==='霸者橫攔・摧關'){if(!action.objectId)throw new Error('摧關須指定關門／障礙物');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到指定結構');object.structural='已破壞';object.intact=false;direct.push(`${object.name} 結構已破壞，不能再作完整障礙或戰利品`);}
      else if(a==='霸者橫攔・霸王擲'){if(!action.objectId)throw new Error('霸王擲須指定可投擲物件');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到指定物件');object.location=action.instruction;direct.push(`${object.name} 被投至「${action.instruction}」；其所有權未變`);}
      else if(a==='霸者橫攔・撼陣'){const effect=`撼陣效果：${action.instruction}`;m.environmentalEvents.push(effect);direct.push(effect);}
      else if(a==='霸者橫攔・不動'){m.anchored=true;direct.push('主角位置固定，不受此場景中的推移');}
      else if(a==='霸骨天成'){subject(m,'protagonist').bodyChanges.push(action.instruction);direct.push(`主角身體承載能力改變：${action.instruction}`);}
      else if(a==='萬民歸心'){for(const id of targets){const s=subject(m,id);s.willingness=Math.min(100,s.willingness+action.intensity*5);}direct.push(...targets.map(id=>`${id} 願意合作傾向提高；忠誠與人格不被強制改寫`));}
      else if(a==='群星入懷'){for(const id of targets){const s=subject(m,id);s.willingness=Math.min(100,s.willingness+action.intensity*5);}direct.push(...targets.map(id=>`${id} 對接觸／合作的意願提升，仍保有拒絕權`));}
      else if(a==='山河薪火'||a==='薪火不滅'){for(const id of targets){const s=subject(m,id);s.morale=Math.min(100,s.morale+action.intensity*10);}direct.push(...targets.map(id=>`${id} 士氣提升 ${action.intensity*10}`));}
      else if(a==='萬軍如臂'){const order=`萬軍如臂示例命令：${action.instruction}`;m.environmentalEvents.push(order);direct.push(order);}
      else throw new Error(`能力「${a}」尚未實作；沒有套用效果`);
      result(m,turn,a,targets,action.excluded,`${a}・強度 ${action.intensity}`,direct);return m;
    }
    case 'UsePower': {
      const targets=ids(action.targetIds,action.excluded);const a=action.ability;
      if(['軒轅幻術・五感天幕','萬軍共夢','千軍異夢','神識威壓','妖術・伏地','萬軍伏地','軒轅藏界','軒轅閃','萬解','軒轅極限收斂','軒轅觀世','天醫敕生','歲月回春','軒轅傳音','軒轅傳音・天下共視','萬象推演','百脈敕令'].includes(a)) throw new Error('此能力須使用其專屬操作欄位，不能以通用發動替代');
      if(a!=='軒轅萬語'&&a!=='照膽')throw new Error(`能力「${a}」尚未實作；沒有消耗回合或套用效果`);
      if(!targets.length&&!['軒轅之命','照膽','山河薪火','薪火不滅','群星入懷','萬軍如臂','軒轅萬語','霸骨天成','軒轅天罰'].includes(a))throw new Error('此能力須指定目標');
      for(const id of targets)subject(m,id);
      const instruction=action.instruction.trim();if(!instruction)throw new Error('請明確描述此能力的目標結果');
      const prose = a==='軒轅萬語'?`已理解／表達所選語言內容：${instruction}`:`照膽辨識目標當下可觀察的情緒／意圖線索：「${instruction}」；不讀取未掌握的秘密`;
      result(m,turn,a,targets,action.excluded,`${a}・強度 ${action.intensity}`,[prose],[] ,action.intent);return m;
    }
  }
}

export function advanceInnate(source:InnateModel,turn:number):InnateModel { const m=structuredClone(source); for(const curse of m.curses.filter(entry=>entry.active&&entry.startedTurn<turn)){const s=m.subjects[curse.targetId];if(s?.alive){s.injuries.push(`${curse.ability}持續傷害（第 ${turn} 回合）`);curse.accruedInjuries++;}} return m; }
