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
export type AbilityCombinationId = '壓陣止戰'|'破城而不屠城'|'天下公開示威'|'名將級身體重塑'|'回春'|'跨天下親自處理突發事件'|'行走的無限軍需庫';
export type BodySystem = '神經'|'肌力'|'肌腱關節'|'循環'|'心肺'|'疼痛'|'感官'|'平衡'|'反射'|'動作協調'|'疲勞處理'|'恢復';
export type SenseChannel = '視覺'|'聽覺'|'嗅覺'|'味覺'|'觸覺';
export interface InnateSubject { id: string; birthYear?:number; rejuvenationOffset?:number; fear: number; trauma: string[]; traumaCourse?:Array<{source:string;severity:1|2;elapsedDays:number}>; mindSignals?:MindSignals; injuries: string[]; disease: string[]; physiologicalAge: number; bodyChanges: string[]; grantedAbilities:string[]; sensesLost: boolean; sensoryEffects?:Array<{ability:string;distribution:IllusionDistribution;content:string;channels:SenseChannel[];expiresTurn:number}>; morale: number; willingness: number; location: string; alive: boolean; /** Engineering simplification for transient environmental effects. */ temporaryEffects?: Array<{ label:string; expiresTurn:number }>; /** Functional limits are kept separate from loyalty and personality. */ functionalImpairments?:string[]; /** Accumulating physical impairment; cure/release does not reset it. */ accumulatedHarm?: number; lifeThreatened?: boolean; diseaseCourse?:Array<{name:string;intensity:1|2|3;elapsedDays:number;controlled:boolean;daysAtIntensity?:number}>; sensesRestoredTurn?:number; recoveryElapsedDays?:number; /** v1-compatible optional physiology detail */ bodySystems?: Partial<Record<BodySystem, number>>; }
export interface StoredObject { id: string; name: string; quantity: number; ownerId: string; custodianId: string; location: string; kind: '物品'|'人類活體'|'人類屍體'|'其他生命'; intact: boolean; disassembled?:boolean; reachable?:boolean; decay?: string; motionBlocked?: boolean; structural?: string; bearerId?:string; }
export interface InnateConsequence { id: string; turn: number; ability: AbilityId|AbilityCombinationId; targets: string[]; excluded: string[]; title: string; direct: string[]; secondary: string[]; intent?: HarmIntent; }
export interface ActiveCurse { id: string; targetId: string; ability: '妖術・伏地'|'萬軍伏地'; intensity: number; startedTurn: number; active: boolean; accruedInjuries: number; elapsedDays?:number; recoveryDays?:number; lastAdvancedTurn?:number; }
export interface LightningContext { weather:'晴'|'雨'; ground:'乾'|'濕'; terrain:'開闊地'|'木造聚落'|'石砌工事'|'密集陣地'; nearby:Array<{id:string;distanceMeters:number;cover:'露天'|'室內';metalEquipment:boolean;mounted:boolean}>; structures:Array<{objectId:string;distanceMeters:number;material:'木'|'石'|'金屬';fragility:1|2|3}>; }
export interface ActiveLightningZone { id:string; ability:'天雷禁域'|'軒轅天罰・雷海'; location:string; targets:string[]; excluded:string[]; intensity:1|2|3; intent:HarmIntent; context:LightningContext; startedTurn:number; active:boolean; turnsApplied:number; }
export interface ScenarioUnit { id:string; name:string; members:number; location:string; morale:number; cohesion:number; fatigue:number; order:'待命'|'前進'|'固守'|'撤退'|'護送'; orderDetail:string; }
export interface LoyaltyNetwork { id:string; members:string[]; loyaltyAtFormation:Record<string,number>; active:boolean; reconnections:number; }
export interface LanguageAct { turn:number; mode:'聽'|'說'|'讀'|'寫'; language:string; targetIds:string[]; text:string; renderedText:string; }
export interface MindSignals { statement:string; genuineBelief:string; genuineIntent:string; deceptiveAbout?:string; coercedBy?:string; suppressedEmotion?:string; }
export interface TalentLead { id:string; name:string; craft:string; location:string; discoveredTurn:number; approachWillingness:number; example:true; }
export interface InnateModel {
  version: 1; subjects: Record<string, InnateSubject>; objects: StoredObject[]; subspace: string[]; consequences: InnateConsequence[]; curses: ActiveCurse[];
  convergence: { active: boolean; allowedContacts: string[]; radiusMeters:2 }; anchored:boolean; visions: Array<{turn:number; targetIds:string[]; location:string; sceneText:string}>;
  lightningZones?:ActiveLightningZone[];
  scenarioUnits?:ScenarioUnit[]; loyaltyNetworks?:LoyaltyNetwork[]; communitySupport?:number; talentLeads?:TalentLead[];
  languageActs?:LanguageAct[];
  messages: Array<{turn:number; recipientId:string; text:string; arrived:boolean}>; truthsKnown: string[]; forecasts: Array<{turn:number; question:string; result:string; markedUncertain:boolean}>; environmentalEvents:string[];
}

export interface PredictiveEvidence { assets?:Array<{name:string;balance:number;lastDelta?:number}>; relationships?:Array<{personId:string;trust:number;loyalty:number;fear:number;grievances:number}>; units?:Array<{name:string;location:string;order:string;morale:number;cohesion:number;fatigue:number}>; injuries?:Array<{label:string;elapsedTurns:number;active:boolean}>; }
export type InnateAction =
 | { type:'Illusion'; ability: Extract<AbilityId,'軒轅幻術・五感天幕'|'萬軍共夢'|'千軍異夢'>; targets:string[]; excluded:string[]; distribution:IllusionDistribution; depth:RealityDepth; intent:HarmIntent; severity:1|2|3; content?:'假軍令'|'火海'|'假道路'|'假敵我'|'箭雨'; accident?:string; accidentOutcome?:'無傷'|'受傷'|'致命' }
 | { type:'Lightning'; ability:'軒轅天罰'|'地走雷'|'雷震'|'萬雷震軍'|'天雷禁域'|'天雷破城'|'軒轅天罰・雷海'; targets:string[]; excluded:string[]; intensity:1|2|3; intent:HarmIntent; scene?:LightningContext; /** legacy save compatibility only; new UI does not interpret free text as scene data */ environment?:string; suppressSecondary:boolean }
 | { type:'ReleaseLightningZone'; zoneId:string }
 | { type:'Disease'; targets:string[]; excluded:string[]; disease:string; intensity:1|2|3; mode?:'施疫'|'壓制'|'治療'|'阻止惡化' }
 | { type:'Pressure'; targets:string[]; excluded:string[]; intensity:1|2|3; trauma:'短暫'|'持續'|'深層' }
 | { type:'Curse'; ability:'妖術・伏地'|'萬軍伏地'; targets:string[]; excluded:string[]; intensity:1|2|3; turn:number }
 | { type:'ReleaseCurse'; curseId:string }
 | { type:'Store'; objectId:string; objectIds?:string[] }
 | { type:'Retrieve'; objectId:string; location:string }
 | { type:'Flash'; location:string; bringIds:string[] }
 | { type:'Disassemble'; objectIds:string[]; excluded:string[]; secondary?:string }
 | { type:'SetConvergence'; active:boolean; allowedContacts:string[] }
 | { type:'Contact'; source:string; target:string; harmful:boolean; hazardType?:'有害物質'|'有害能量'|'有害接觸'|'一般友善接觸'; distanceMeters?:number }
 | { type:'Diagnose'; targetId:string }
 | { type:'Heal'; targetId:string; injuryIndex?:number; diseaseIndex?:number }
 | { type:'Rejuvenate'; targetId:string; years:number; consent?:boolean }
 | { type:'Improve'; targetId:string; change:string; system?:BodySystem; amount?:number }
 | { type:'SendThought'; recipientId:string; text:string }
 | { type:'ShareVision'; targetIds:string[] }
 | { type:'Predict'; question:string; evidence:string; structuredEvidence?:PredictiveEvidence }
 | { type:'SenseSeal'; targetId:string; targets?:string[]; excluded:string[] }
 | { type:'RestoreSenses'; targetId:string }
 | { type:'SealGeneral'; targetId:string }
 | { type:'ReleaseSeal'; targetId:string }
 | { type:'DisruptNetwork'; networkId:string }
 | { type:'Force'; ability:'霸者橫攔'|'霸者橫攔・摧關'|'霸者橫攔・撼陣'|'霸者橫攔・霸王擲'|'霸者橫攔・不動'|'霸骨天成'|'山河薪火'|'薪火不滅'|'群星入懷'|'萬民歸心'|'萬軍如臂'; targets:string[]; excluded:string[]; objectId?:string; instruction:string; intensity:1|2|3; unitCommand?:'前進'|'固守'|'撤退'|'護送' }
 | { type:'UsePower'; ability:AbilityId; targetIds:string[]; excluded:string[]; intensity:1|2|3; intent?:HarmIntent; instruction:string; languageMode?:'聽'|'說'|'讀'|'寫'; language?:string }
 | { type:'Combination'; combination:AbilityCombinationId; steps:Exclude<InnateAction,{type:'Combination'}>[] };

export function createInnateModel(phase2: Phase2Model, birthYear:number, location:string): InnateModel {
  const subjects: InnateModel['subjects'] = {};
  for (const person of phase2.persons) subjects[person.id] = { id:person.id,birthYear:person.birthYear,rejuvenationOffset:0,fear:0,trauma:[],injuries:[],disease:[],physiologicalAge:Math.max(0,birthYear-person.birthYear),bodyChanges:[],grantedAbilities:[],sensesLost:false,morale:50,willingness:50,location:person.alive?location:'亡者紀錄',alive:person.alive,bodySystems:{神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50} };
  const initialObjects: StoredObject[] = phase2.items.map((item) => ({ id:item.id, name:item.item, quantity:item.quantity, ownerId:item.ownerId, custodianId:item.custodianId, location:item.locationId, kind:'物品', intact:true,reachable:true }));
  initialObjects.push({ id:'example-grain-store',name:'家中倉糧（示例）',quantity:20,ownerId:'opening-family-0',custodianId:'opening-family-0',location:'家宅',kind:'物品',intact:true,reachable:true });
  initialObjects.push({ id:'example-damaged-tool',name:'損壞農具（示例）',quantity:1,ownerId:'opening-family-0',custodianId:'opening-family-0',location:'家宅',kind:'物品',intact:false,reachable:true });
  initialObjects.push({ id:'example-remote-cargo',name:'遠方府庫糧貨（示例）',quantity:50,ownerId:'county',custodianId:'county',location:'遠方府庫',kind:'物品',intact:true,reachable:false });
  initialObjects.push({ id:'example-horse',name:'家中馬匹（其他生命示例）',quantity:1,ownerId:'opening-family-0',custodianId:'opening-family-0',location,kind:'其他生命',intact:true,reachable:true });
  initialObjects.push({ id:'example-enemy-shield',name:'敵方木盾（示例）',quantity:1,ownerId:'example-clerk',custodianId:'example-clerk',location,kind:'物品',intact:true,reachable:true,bearerId:'example-clerk' });
  for (const person of phase2.persons) initialObjects.push({id:`person-body-${person.id}`,name:`${person.name}（人類${person.alive?'活體':'屍體'}）`,quantity:1,ownerId:person.id,custodianId:person.id,location:person.alive?location:'亡者紀錄',kind:person.alive?'人類活體':'人類屍體',intact:true,reachable:true});
  for(const object of initialObjects.filter(item=>item.kind==='其他生命'))subjects[object.id]={id:object.id,fear:0,trauma:[],injuries:[],disease:[],physiologicalAge:0,bodyChanges:[],grantedAbilities:[],sensesLost:false,morale:50,willingness:50,location:object.location,alive:true,bodySystems:{神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50}};
  subjects['example-clerk'].mindSignals={statement:'已奉命會配合查糧',genuineBelief:'縣府正在隱匿部分糧冊',genuineIntent:'先拖延盤問，等待上級消息',deceptiveAbout:'聲稱手上沒有第二份糧冊',coercedBy:'家人被地方豪右扣留',suppressedEmotion:'恐懼'};
  return { version:1, subjects, objects:initialObjects, subspace:[], consequences:[],curses:[],convergence:{active:false,allowedContacts:[],radiusMeters:2},anchored:false,visions:[],messages:[],truthsKnown:[],forecasts:[],environmentalEvents:[],scenarioUnits:[{id:'example-squad',name:'鄉亭護糧隊（示例）',members:40,location,morale:50,cohesion:50,fatigue:0,order:'待命',orderDetail:''}],loyaltyNetworks:[],communitySupport:50,talentLeads:[] };
}

const ids = (values:string[], excluded:string[]) => values.filter((id,index)=>values.indexOf(id)===index&&!excluded.includes(id));
function subject(model:InnateModel,id:string):InnateSubject { const result=model.subjects[id]; if(!result) throw new Error(`找不到目標人物：${id}`); return result; }
function result(model:InnateModel,turn:number,ability:AbilityId|AbilityCombinationId,targets:string[],excluded:string[],title:string,direct:string[]=[],secondary:string[]=[],intent?:HarmIntent) {
  const gesture=ability.includes('雷')?'抬手引落雷霆':ability.includes('幻')||ability.includes('夢')?'指尖掠過，牽動目標五感':ability.includes('藏界')||ability.includes('閃')?'掌心一翻，空間倏然轉換':ability.includes('萬解')?'兩指輕點指定器物':ability.includes('威壓')?'垂眸凝視，不必改變身形':ability.includes('醫')||ability.includes('脈')||ability.includes('春')?'掌勢落定，精準干涉生理':ability.includes('霸')?'肩臂微沉，正面截住力量':'抬手作出簡短示意';
  model.consequences.push({id:`innate-${turn}-${model.consequences.length+1}`,turn,ability,targets:[...targets],excluded:[...excluded],title,direct:[...direct,`主角以「${gesture}」的個人手勢施術，雙瞳幽光一閃；手勢不構成發動條件，未在場者不視為目擊。`],secondary,...(intent?{intent}:{})});
}
function injury(subject:InnateSubject,label:string) { if(subject.alive) subject.injuries.push(label); }
// Values absent from the source manual are exposed as tunable engineering parameters, not new lore rules.
export const LIGHTNING_ENGINEERING_PARAMETERS = { closeMeters:10, localMeters:30, audibleMeters:100, indoorExposureFactor:0.5, untreatedCurseRiskDays:3, untreatedCurseHighRiskDays:5, roundDays:90, diseaseSeverityStepDays:30, recoveryHarmPointDays:30, traumaEaseDaysPerLevel:90 } as const;
export const REJUVENATION_ENGINEERING_PARAMETERS = { bodySystemPointsPerRestoredYear:2, maximumRestoredBodySystemPoints:30 } as const;
export const HEALING_ENGINEERING_PARAMETERS = { bodySystemPointsPerTreatedInjury:5, bodySystemPointsPerTreatedDisease:3, accumulatedHarmPerTreatedInjury:1 } as const;
/** A tiny, explicitly illustrative phrasebook for testing all four language acts; it is not a historical language database. */
export const EXAMPLE_LANGUAGE = { name:'示例西域語（示例）', toChinese:{'na':'糧食','sala':'水','mira':'平安'}, fromChinese:{'糧食':'na','水':'sala','平安':'mira'} } as const;
export function sampleLightningContext(preset:'乾燥庭院'|'雨中木舍'|'潮濕金屬陣地'|'石砌關門',presentIds:string[],directTargets:string[],objects:StoredObject[]):LightningContext {
  const wet=preset!=='乾燥庭院';
  const nearby=presentIds.filter(id=>id!=='protagonist'&&!directTargets.includes(id)).map((id,index)=>({id,distanceMeters:index===0?8:index===1?24:60,cover:preset==='雨中木舍'?'室內' as const:'露天' as const,metalEquipment:preset==='潮濕金屬陣地',mounted:id==='example-horse'}));
  if(presentIds.includes('example-horse')&&!directTargets.includes('example-horse')&&!nearby.some(entry=>entry.id==='example-horse'))nearby.push({id:'example-horse',distanceMeters:8,cover:'露天',metalEquipment:false,mounted:true});
  const structures=objects.filter(object=>object.kind==='物品'&&object.intact).slice(0,8).map((object,index)=>({objectId:object.id,distanceMeters:10+index*5,material:preset==='石砌關門'?'石' as const:preset==='潮濕金屬陣地'?'金屬' as const:'木' as const,fragility:object.intact?2 as const:1 as const}));
  return {weather:preset==='雨中木舍'?'雨':'晴',ground:wet?'濕':'乾',terrain:preset==='雨中木舍'?'木造聚落':preset==='潮濕金屬陣地'?'密集陣地':preset==='石砌關門'?'石砌工事':'開闊地',nearby,structures};
}

export function applyInnateAction(source:InnateModel,action:InnateAction,turn:number,scene:{location:string;presentIds:string[];text:string},phase2:Phase2Model):InnateModel {
  // Keep the Phase 2 roster as the authority for which simulated people exist.
  const knownPeople = new Set(phase2.persons.map(person=>person.id));
  const m=structuredClone(source);
  m.scenarioUnits??=[{id:'example-squad',name:'鄉亭護糧隊（示例）',members:40,location:scene.location,morale:50,cohesion:50,fatigue:0,order:'待命',orderDetail:''}];
  m.loyaltyNetworks??=[];m.communitySupport??=50;m.languageActs??=[];
  switch(action.type) {
    case 'Combination': {
      const steps=action.steps;
      const has=(predicate:(step:Exclude<InnateAction,{type:'Combination'}>)=>boolean)=>steps.some(predicate);
      const valid=action.combination==='壓陣止戰'?has(step=>step.type==='Curse'&&step.ability==='萬軍伏地')&&has(step=>step.type==='Lightning'&&step.ability==='天雷禁域')
        :action.combination==='破城而不屠城'?has(step=>step.type==='SetConvergence'&&step.active)&&has(step=>(step.type==='Force'&&step.ability==='霸者橫攔・摧關')||(step.type==='Lightning'&&step.ability==='天雷破城'))&&has(step=>step.type==='Force'&&step.ability==='萬民歸心')
        :action.combination==='天下公開示威'?has(step=>step.type==='ShareVision')&&has(step=>(step.type==='Lightning'&&(step.ability==='天雷禁域'||step.ability==='軒轅天罰・雷海'))||(step.type==='Curse'&&step.ability==='萬軍伏地')||step.type==='Force')
        :action.combination==='名將級身體重塑'?has(step=>step.type==='Diagnose')&&has(step=>step.type==='Improve')&&has(step=>step.type==='Heal')
        :action.combination==='回春'?has(step=>step.type==='Diagnose')&&has(step=>step.type==='Heal')&&has(step=>step.type==='Rejuvenate')
        :action.combination==='跨天下親自處理突發事件'?has(step=>step.type==='Flash')&&has(step=>step.type==='SendThought')
        :has(step=>step.type==='Store')&&has(step=>step.type==='Flash'&&steps.some(prior=>prior.type==='Store'&&prior.objectId===step.bringIds[0]));
      if(!valid||!steps.length)throw new Error(`組合式「${action.combination}」缺少必需步驟；沒有提交任何效果`);
      let working=m;for(const step of steps)working=applyInnateAction(working,step,turn,scene,phase2);
      const targets=[...new Set(steps.flatMap(step=>step.type==='Flash'?['protagonist',...step.bringIds]:step.type==='SendThought'?[step.recipientId]:step.type==='ShareVision'?step.targetIds:step.type==='Diagnose'||step.type==='Heal'||step.type==='Improve'||step.type==='Rejuvenate'?[step.targetId]:step.type==='Curse'||step.type==='Lightning'||step.type==='Pressure'||step.type==='Force'?step.targets:[]))];
      result(working,turn,action.combination,targets,[],'組合流程完成',steps.map(step=>`已實際結算步驟：${step.type}${'ability' in step?`／${step.ability}`:''}`));return working;
    }
    case 'Illusion': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇至少一名目標');
      const direct:string[]=[],secondary:string[]=[];
      const content=action.content??'假軍令';const contentVariants=['假軍令','火海','假道路','假敵我','箭雨'] as const;const contentStart=contentVariants.indexOf(content);
      for(const [index,id] of targets.entries()){
        const s=subject(m,id);s.temporaryEffects??=[];s.functionalImpairments??=[];
        const targetContent=action.distribution==='千軍異夢'?contentVariants[(contentStart+index)%contentVariants.length]:content;
        const presented=action.distribution==='萬軍共夢'?`共享內容「${targetContent}」`:action.distribution==='千軍異夢'?`個別內容「${targetContent}」・序列 ${index+1}`:`內容「${targetContent}」`;
        s.sensoryEffects??=[];s.sensoryEffects.push({ability:action.ability,distribution:action.distribution,content:targetContent,channels:['視覺','聽覺','嗅覺','味覺','觸覺'],expiresTurn:turn+1});
        s.temporaryEffects.push({label:`幻術感官干涉：${presented}`,expiresTurn:turn+1});
        if(action.distribution==='千軍異夢')s.functionalImpairments.push('千軍異夢：共同方向／命令感知受擾');
        if(action.depth==='惑感') { direct.push(`${id}：${presented}；只改變五感資訊，不直接傷身`); continue; }
        if(action.severity===1){
          s.functionalImpairments.push(action.depth==='入實'?'入實：疼痛／短暫動作遲滯':'五感實相：可控疼痛，無持續創傷');
          direct.push(`${id}：${presented}；真實疼痛與短暫失能，無直接組織傷勢`);
        } else {
          const fatal=action.severity===3&&action.intent==='致命';
          injury(s,`${action.depth==='入實'?'入實':'五感實相'}・${targetContent}造成的直接身體創傷${fatal?'（致命）':''}`);
          s.accumulatedHarm=(s.accumulatedHarm??0)+action.severity;
          s.functionalImpairments.push(action.severity===2?'幻術直接創傷：行動受限':'幻術直接重創：喪失有效行動');
          if(fatal)s.alive=false;
          direct.push(`${id}：${presented}；真實${fatal?'致命':'非致命'}直接創傷（強度 ${action.severity}）`);
        }
      }
      if(action.accident){
        const outcome=action.accidentOutcome;
        if(outcome==='致命'&&action.intent==='致命')for(const id of targets){const s=subject(m,id);if(s.alive){s.alive=false;s.injuries.push(`次生事故致命：${action.accident}`);}}
        else if(outcome==='受傷'||outcome==='致命')for(const id of targets){const s=subject(m,id);injury(s,`幻術次生事故傷勢：${action.accident}`);s.accumulatedHarm=(s.accumulatedHarm??0)+1;}
        secondary.push(`次生事故：${action.accident}${outcome?`（${action.intent==='非致命'&&outcome==='致命'?'非致命意圖，結果限於受傷':outcome}）`:''}`);
      }
      const ability=action.ability; result(m,turn,ability,targets,action.excluded,`${action.distribution} × ${action.depth}`,direct,secondary,action.intent);
      return m;
    }
    case 'Lightning': {
      if(!action.scene&&!action.suppressSecondary)throw new Error('雷霆須提供結構化場景資料；若要壓制附帶效應，必須明確選擇壓制');
      const targets=ids(action.targets,action.excluded);if(!targets.length)throw new Error('雷霆須選擇至少一名直接目標');
      const direct:string[]=[];for(const id of targets){const s=subject(m,id);if(!s.alive)continue;s.injuries.push(action.intent==='致命'&&action.intensity===3?'雷擊致命傷':'雷擊傷勢');s.accumulatedHarm=(s.accumulatedHarm??0)+action.intensity;if(action.intent==='致命'&&action.intensity===3)s.alive=false;direct.push(`${id}：直接雷擊${action.intent==='致命'&&action.intensity===3?'致命傷':'傷勢'}`);}
      const secondary:string[]=[]; const context=action.scene;
      if(context&&!action.suppressSecondary){
        for(const person of context.nearby){if(targets.includes(person.id)||action.excluded.includes(person.id))continue;const s=m.subjects[person.id];const object=m.objects.find(item=>item.id===person.id);if(!s?.alive&&!object)continue;
          const exposure=person.distanceMeters*(person.cover==='室內'?1/LIGHTNING_ENGINEERING_PARAMETERS.indoorExposureFactor:1);
          if(exposure<=LIGHTNING_ENGINEERING_PARAMETERS.audibleMeters){const effects:string[]=[];if(exposure<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters)effects.push('雷聲震耳、強光使人閉目、爆震造成短暫失衡');else effects.push('巨響與強光造成驚跳、閉目或短暫停頓');
            if(context.terrain==='密集陣地'||context.terrain==='木造聚落')effects.push('受震後隊列／姿態散亂');
            if(effects.length&&s){s.temporaryEffects??=[];s.temporaryEffects.push({label:effects.join('、'),expiresTurn:turn+1});s.fear=Math.min(100,s.fear+5);s.functionalImpairments??=[];if(exposure<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters)s.functionalImpairments.push('雷霆環境干擾：短暫視聽／平衡受阻');secondary.push(`${person.id} 距離 ${person.distanceMeters}m${person.cover==='室內'?'、室內遮蔽':''}：${effects.join('、')}（短暫，不作直接雷傷）`);}
            const conductiveGround=context.ground==='濕'||context.weather==='雨';
            const groundPath=(conductiveGround||person.metalEquipment)&&exposure<=LIGHTNING_ENGINEERING_PARAMETERS.closeMeters;
            const groundSpread=action.ability==='地走雷'&&conductiveGround&&exposure<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters;
            const massStrike=action.ability==='萬雷震軍'&&exposure<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters&&(conductiveGround||person.metalEquipment);
            if((groundPath||groundSpread||massStrike)&&s){injury(s,groundSpread?'地走雷次生電流／失衡傷勢':massStrike?'萬雷震軍覆蓋區間接電擊傷勢':'雷電次生電流／失衡傷勢');s.accumulatedHarm=(s.accumulatedHarm??0)+1;secondary.push(`${person.id}：${groundSpread?'地走雷沿潮濕地面擴散':massStrike?'萬雷震軍覆蓋區間接電擊':'潮濕導電或金屬路徑'}造成次生傷勢`);}
            if(action.ability==='雷震'&&exposure<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters&&s){s.functionalImpairments??=[];s.functionalImpairments.push('雷震爆震：失衡、耳鳴與動作中斷');secondary.push(`${person.id}：雷震集中爆震造成近距離功能受阻`);}
            if(person.mounted&&object){object.motionBlocked=true;secondary.push(`${object.name} 受驚，騎乘／移動短暫失控`);}
          }
        }
        if(action.ability==='地走雷'&&context.ground==='濕')secondary.push('雷電沿濕地表面與連續導電路徑擴散');
        if(action.ability==='天雷破城')for(const structure of context.structures){const object=m.objects.find(item=>item.id===structure.objectId);if(object&&structure.distanceMeters<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters&&structure.fragility<=action.intensity){object.intact=false;object.structural='雷擊破壞';secondary.push(`${object.name}（${structure.material}構造）受雷擊震裂；鄰近者仍按距離結算爆震／飛散風險`);}}
        const shattered=context.structures.filter(item=>action.ability==='天雷破城'&&item.distanceMeters<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters&&item.fragility<=action.intensity);
        for(const person of context.nearby){
          if(targets.includes(person.id)||action.excluded.includes(person.id)||person.distanceMeters>LIGHTNING_ENGINEERING_PARAMETERS.localMeters||!shattered.length)continue;
          const s=m.subjects[person.id];if(!s?.alive)continue;
          injury(s,'天雷破城飛散木石次生傷勢');s.accumulatedHarm=(s.accumulatedHarm??0)+1;
          secondary.push(`${person.id}：近旁破城構材崩裂，依距離造成飛散物次生傷勢（非直接雷傷）`);
        }
        if(context.structures.some(item=>item.material==='金屬'&&item.distanceMeters<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters&&(context.ground==='濕'||context.weather==='雨')))secondary.push('潮濕地面／降雨連接金屬導體，形成擴大的危險路徑');
        if(secondary.length)m.environmentalEvents.push(...secondary);
      } else if(action.environment?.trim()&&!action.scene&&!action.suppressSecondary){secondary.push(`舊存檔場景備註：${action.environment.trim()}（未轉成結算條件）`);m.environmentalEvents.push(secondary[0]);}
      result(m,turn,action.ability,targets,action.excluded,`雷霆作用・強度 ${action.intensity}`,direct,secondary,action.intent);
      if((action.ability==='天雷禁域'||action.ability==='軒轅天罰・雷海')&&context&&!action.suppressSecondary){m.lightningZones??=[];m.lightningZones.push({id:`lightning-zone-${turn}-${m.lightningZones.length+1}`,ability:action.ability,location:scene.location,targets:[...targets],excluded:[...action.excluded],intensity:action.intensity,intent:action.intent,context:structuredClone(context),startedTurn:turn,active:true,turnsApplied:1});result(m,turn,action.ability,targets,action.excluded,'持續雷域已建立',[`作用於「${scene.location}」；其雷擊持續至主角明確解除，不會因停止本次操作自動消失`],[],action.intent);}
      return m;
    }
    case 'ReleaseLightningZone': {const zone=m.lightningZones?.find(entry=>entry.id===action.zoneId&&entry.active);if(!zone)throw new Error('找不到仍啟用的雷域');zone.active=false;result(m,turn,zone.ability,zone.targets,zone.excluded,'持續雷域已解除',['後續雷擊停止；先前直接與次生傷害保留']);return m;}
    case 'Disease': {
      const targets=ids(action.targets,action.excluded);if(!targets.length||!action.disease.trim())throw new Error('請指定疾病內容、目標與排除對象');
      const mode=action.mode??'施疫';
      for(const id of targets){const s=subject(m,id);if(!s.alive)continue;s.diseaseCourse??=[];const course=s.diseaseCourse.find(item=>item.name===action.disease.trim());
        if(mode==='治療'){s.disease=s.disease.filter(item=>item!==action.disease.trim());s.diseaseCourse=s.diseaseCourse.filter(item=>item.name!==action.disease.trim());}
        else if(mode==='壓制'){if(!course)throw new Error(`${id} 沒有「${action.disease.trim()}」可供壓制`);course.controlled=true;}
        else if(mode==='阻止惡化'){if(!course)throw new Error(`${id} 沒有「${action.disease.trim()}」可供控制`);course.intensity=Math.max(1,course.intensity-1) as 1|2|3;course.controlled=true;}
        else if(!course){s.disease.push(action.disease.trim());s.diseaseCourse.push({name:action.disease.trim(),intensity:action.intensity,elapsedDays:0,daysAtIntensity:0,controlled:false});}
      }
      const direct=targets.map(id=>`${id}：${mode}${mode==='施疫'?`「${action.disease.trim()}」（強度 ${action.intensity}）`: `「${action.disease.trim()}」的疾病狀態${mode==='治療'?'移除':'已調整'}`}`);
      result(m,turn,'萬疫敕令',targets,action.excluded,`萬疫敕令・${mode}`,direct);return m;
    }
    case 'Pressure': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇威壓目標');
      for(const id of targets){if(!knownPeople.has(id))throw new Error('威壓目標不在人物名冊');const s=subject(m,id);s.fear=Math.min(100,s.fear+action.intensity*15);s.temporaryEffects??=[];s.traumaCourse??=[];const manifestations=['存在性危險警訊、頸背發寒與動作遲滯','主觀存在尺度錯位如臨山岳；言語與攻擊意圖受阻','不可承受的大恐怖：凍結、崩潰或失去有效戰鬥行動'][action.intensity-1];s.temporaryEffects.push({label:`神識威壓：${manifestations}`,expiresTurn:turn+1});if(action.trauma!=='短暫'){const severity=action.trauma==='深層'?2:1;s.trauma.push(action.trauma==='深層'?'神識威壓留下深層持續創傷':'神識威壓留下持續創傷');s.traumaCourse.push({source:'神識威壓',severity,elapsedDays:0});}}
      result(m,turn,'神識威壓',targets,action.excluded,`神識壓制・強度 ${action.intensity}`,targets.map(id=>`${id}：存在恐怖成立；恐懼增加 ${action.intensity*15}；${action.trauma}創傷`),['只影響恐懼／功能與創傷；忠誠、信任、人格與政治立場維持原值']); return m;
    }
    case 'Curse': {
      const targets=ids(action.targets,action.excluded); if(!targets.length) throw new Error('請選擇詛咒目標');
      for(const id of targets){const s=subject(m,id);if(!s.alive)throw new Error('持續詛咒不能施於已故人物');m.curses.push({id:`curse-${turn}-${m.curses.length+1}`,targetId:id,ability:action.ability,intensity:action.intensity,startedTurn:turn,active:true,accruedInjuries:0,elapsedDays:0,lastAdvancedTurn:turn});s.functionalImpairments??=[];s.functionalImpairments.push('詛咒即時症候：眩暈、噁心、失衡、嘔吐／衰弱與戰鬥功能受阻');injury(s,'詛咒即時生理症候：眩暈、噁心、失衡與虛弱');s.accumulatedHarm=(s.accumulatedHarm??0)+action.intensity;}
      result(m,turn,action.ability,targets,action.excluded,'持續性妖術已附著生命狀態',targets.map(id=>`${id}：詛咒立即造成真實生理症候，後續會隨時間累積；解除不會消除已累積損害`)); return m;
    }
    case 'ReleaseCurse': { const c=m.curses.find(entry=>entry.id===action.curseId&&entry.active); if(!c) throw new Error('找不到仍有效的詛咒'); c.active=false;c.recoveryDays=0;const s=subject(m,c.targetId);result(m,turn,c.ability,[c.targetId],[],'詛咒已解除，既有傷勢進入恢復期',[`後續超自然侵蝕停止；已累積傷勢 ${s.accumulatedHarm??0} 點、失水與心肺負擔不會倒帶；須由時間及實際治療恢復`]); return m; }
    case 'Store': {
      const targetIds=ids(action.objectIds??[action.objectId],[]);if(!targetIds.length)throw new Error('請選擇至少一項收納對象');
      const objects=targetIds.map(id=>m.objects.find(item=>item.id===id));if(objects.some(object=>!object||object.disassembled))throw new Error('找不到可收納的物件或物件已被萬解分解');
      if(objects.some(object=>object!.kind==='人類活體'||object!.kind==='人類屍體')) throw new Error('藏界明確排除人類活體與屍體');
      if(objects.some(object=>object!.reachable===false)) throw new Error('藏界不能隔空取物；目標須在可直接接觸範圍');
      for(const object of objects){object!.location='軒轅藏界';object!.custodianId='protagonist';if(!m.subspace.includes(object!.id))m.subspace.push(object!.id);}
      result(m,turn,'軒轅藏界',targetIds,[],'指定物件進入無容量上限的藏界',objects.map(object=>`${object!.name} ×${object!.quantity}：位置更新；所有權仍屬 ${object!.ownerId}；保管轉為主角`));return m;
    }
    case 'Retrieve': {
      const object=m.objects.find(item=>item.id===action.objectId); if(!object||!m.subspace.includes(object.id))throw new Error('物件不在藏界');
      object.location=action.location;object.custodianId='protagonist';m.subspace=m.subspace.filter(id=>id!==object.id);
      result(m,turn,'軒轅藏界',[object.id],[],'物品由藏界取出',[`${object.name} ×${object.quantity}：取至 ${action.location}；所有權 ${object.ownerId}、保管人主角`]);return m;
    }
    case 'Flash': {
      const carried=action.bringIds.map(id=>m.objects.find(item=>item.id===id)).filter((item):item is StoredObject=>!!item);
      for(const object of carried){if(object.kind==='人類屍體')throw new Error('屍體不能作為隨身攜帶對象；請只指定可搬運物品');if(!m.subspace.includes(object.id)&&object.reachable===false)throw new Error('軒轅閃不能跨距離隔空搬運；須由主角親自到場或從藏界取出');if(object.kind==='人類活體'){const personId=object.id.replace(/^person-body-/,'');if(!scene.presentIds.includes(personId)||!m.subjects[personId]?.alive)throw new Error('只能攜帶當前在場且明確納入本次行動的活人');if(m.subjects[personId])m.subjects[personId].location=action.location;}object.location=action.location;m.subspace=m.subspace.filter(id=>id!==object.id);}
      const p=subject(m,'protagonist');p.location=action.location;
      result(m,turn,'軒轅閃',['protagonist',...carried.map(item=>item.id)],[],'主角親自完成跨地移動',[`主角與明確攜帶對象到達 ${action.location}`,...carried.map(item=>`${item.name} ×${item.quantity}：所有權 ${item.ownerId}；保管人 ${item.custodianId}`)]);return m;
    }
    case 'Disassemble': {
      const targets=ids(action.objectIds,action.excluded);if(!targets.length)throw new Error('請指定萬解目標及排除對象');
      const direct:string[]=[];for(const id of targets){const object=m.objects.find(item=>item.id===id);if(!object)throw new Error(`找不到物件：${id}`);if(object.kind==='人類活體'||object.kind==='人類屍體')throw new Error('萬解不能直接分解生命或人類屍體');if(object.disassembled)throw new Error(`${object.name} 已分解，不可再次作為完整目標`);object.intact=false;object.disassembled=true;object.location='已分解';direct.push(`${object.name} ×${object.quantity}：已不可逆分解，不能作為完整戰利品`);}
      result(m,turn,'萬解',targets,action.excluded,'指定物品已選擇性分解',direct,action.secondary?[`次生後果另行計算：${action.secondary}`]:[]);return m;
    }
    case 'SetConvergence': m.convergence={active:action.active,allowedContacts:[...new Set(action.allowedContacts)],radiusMeters:2};result(m,turn,'軒轅極限收斂',[],[] ,action.active?'個人防禦已開啟':'個人防禦已關閉',[`只保護主角個人約 ${m.convergence.radiusMeters}m 範圍；沒有護盾值`,action.active?'有害物質／能量在範圍內無法傷及主角；僅指定接觸可通行':'防護停止']);return m;
    case 'Contact': {const distance=action.distanceMeters??1;if(!Number.isFinite(distance)||distance<0)throw new Error('接觸距離無效');const hazardType=action.hazardType??(action.harmful?'有害接觸':'一般友善接觸');const allowed=m.convergence.allowedContacts.includes(action.source)||m.convergence.allowedContacts.includes(action.target);const inRange=distance<=m.convergence.radiusMeters;const blocked=m.convergence.active&&action.harmful&&inRange&&!allowed;const braced=m.anchored&&action.harmful;result(m,turn,braced?'霸者橫攔・不動':'軒轅極限收斂',[action.source,action.target],[] ,blocked?`${hazardType}被阻`:braced?'主角以不動之勢承受衝擊':!inRange?'超出個人防護範圍':'接觸依選擇性通行成立',[blocked?`${hazardType}距離 ${distance}m，在個人防護範圍內且未造成傷害`:braced?`${hazardType}：主角保持原位，衝擊未使其移動；此效果不擴及周遭人物`:`${hazardType}・距離 ${distance}m：${action.source} → ${action.target}`]);return m;}
    case 'Diagnose': {const s=subject(m,action.targetId);const findings=[...s.injuries,...s.diseaseCourse?.map(course=>`${course.name}・強度 ${course.intensity}・未控制 ${course.elapsedDays} 日`)??s.disease];const systems=Object.entries(s.bodySystems??{}).map(([system,value])=>`${system}狀態 ${value}/100`);const text=[findings.length?findings.join('；'):'目前沒有可診出的傷勢或疾病',...systems].join('；');m.truthsKnown.push(`${action.targetId}診斷：${text}`);result(m,turn,'軒轅觀世',[action.targetId],[],'診斷完成',[text]);return m;}
    case 'Heal': {const s=subject(m,action.targetId);if(!s.alive)throw new Error('天醫敕生不能復活亡者');let healed:string|undefined;let injuryTreated=false;if(action.injuryIndex!==undefined){healed=s.injuries.splice(action.injuryIndex,1)[0];injuryTreated=!!healed;}else if(action.diseaseIndex!==undefined){healed=s.disease.splice(action.diseaseIndex,1)[0];if(healed)s.diseaseCourse=s.diseaseCourse?.filter(course=>course.name!==healed);}else if(s.injuries.length){healed=s.injuries.shift();injuryTreated=true;}else if(s.disease.length){healed=s.disease.shift();s.diseaseCourse=s.diseaseCourse?.filter(course=>course.name!==healed);}if(!healed)throw new Error('沒有指定可治療的傷勢或疾病');s.bodySystems??={神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50};const recovered=injuryTreated?HEALING_ENGINEERING_PARAMETERS.bodySystemPointsPerTreatedInjury:HEALING_ENGINEERING_PARAMETERS.bodySystemPointsPerTreatedDisease;for(const system of injuryTreated?(['恢復','肌腱關節','疼痛'] as const):(['恢復','心肺','循環'] as const))s.bodySystems[system]=Math.min(100,(s.bodySystems[system]??50)+recovered);if(injuryTreated)s.accumulatedHarm=Math.max(0,(s.accumulatedHarm??0)-HEALING_ENGINEERING_PARAMETERS.accumulatedHarmPerTreatedInjury);if(!m.curses.some(curse=>curse.active&&curse.targetId===action.targetId)&&!s.injuries.some(item=>item.includes('持續侵蝕')))s.lifeThreatened=false;result(m,turn,'天醫敕生',[action.targetId],[],'治療完成',[`${healed} 已修復；已建模生理恢復指標提升 ${recovered} 點（可調工程參數）${s.lifeThreatened?'；仍有生命危險':''}；其他傷病保留`]);return m;}
    case 'Rejuvenate': {const s=subject(m,action.targetId);if(!s.alive||!Number.isInteger(action.years)||action.years<1)throw new Error('回春目標或幅度無效');if(knownPeople.has(action.targetId)&&action.targetId!=='protagonist'&&!action.consent)throw new Error('具有自主意志的受術者須先同意回春');const before=s.physiologicalAge;s.physiologicalAge=Math.max(0,before-action.years);const applied=before-s.physiologicalAge;s.rejuvenationOffset=(s.rejuvenationOffset??0)+applied;s.bodySystems??={神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50};const restored=Math.min(REJUVENATION_ENGINEERING_PARAMETERS.maximumRestoredBodySystemPoints,applied*REJUVENATION_ENGINEERING_PARAMETERS.bodySystemPointsPerRestoredYear);for(const [key,value] of Object.entries(s.bodySystems))s.bodySystems[key as BodySystem]=Math.min(100,(value??50)+restored);result(m,turn,'歲月回春',[action.targetId],[],'生理狀態回春',[`生理年齡減少 ${applied} 年；已建模生理系統依可調整工程參數恢復 ${restored} 點；實際出生年、實歲、記憶與人格不變`]);return m;}
    case 'Improve': {const s=subject(m,action.targetId);if(!s.alive||!action.change.trim())throw new Error('能力改善目標或內容無效');const system=action.system,amount=action.amount;const applied=!!system&&amount!==undefined;if(applied){if(!Number.isInteger(amount)||amount<1||amount>25)throw new Error('百脈改善幅度須為 1 至 25');const systems=s.bodySystems??(s.bodySystems={});const before=systems[system]??50;systems[system]=Math.min(100,before+amount);s.bodyChanges.push(`${system} ${before}→${systems[system]}`);}else s.bodyChanges.push(action.change.trim());result(m,turn,'百脈敕令',[action.targetId],[],'受術者身體能力改善',[`${applied?`${system}狀態提升 ${amount} 點；`:''}${action.change.trim()}；改善屬於受術者，不會複製為主角天生技`]);return m;}
    case 'SendThought': {subject(m,action.recipientId);if(!action.text.trim())throw new Error('傳音內容不可空白');m.messages.push({turn,recipientId:action.recipientId,text:action.text.trim(),arrived:true});result(m,turn,'軒轅傳音',[action.recipientId],[],'單向傳音抵達',[`訊息已抵達；不會自動產生對方回話`]);return m;}
    case 'ShareVision': {const targets=ids(action.targetIds,[]);if(!targets.length)throw new Error('請選擇共視對象');for(const id of targets)subject(m,id);m.visions.push({turn,targetIds:targets,location:scene.location,sceneText:scene.text});result(m,turn,'軒轅傳音・天下共視',targets,[],'共視直播成立',[`分享當下 ${scene.location} 的實際場景`]);return m;}
    case 'Predict': {if(!action.question.trim())throw new Error('請描述推演問題');const supported=action.evidence.trim();const amount=Number(supported.match(/(?:收入|支出|旅費|折損)錢\s*(\d+)/)?.[1]);let forecast='缺少可核對的結構化資料，不能推演出未知真相。';const evidence=action.structuredEvidence;if(evidence){const branches:string[]=[];for(const asset of evidence.assets??[]){const repeat=asset.lastDelta??0;branches.push(`${asset.name}：現有 ${asset.balance}；若下一步重複最近已記錄的淨變動，情境餘額為 ${asset.balance+repeat}；若無同類收支，維持 ${asset.balance}。`);}for(const person of evidence.relationships??[])branches.push(`${person.personId}：目前信任 ${person.trust}、忠誠 ${person.loyalty}、恐懼 ${person.fear}、恩怨 ${person.grievances} 項；若沒有新互動，下一節點維持既有記錄，不能由此斷言其未來選擇。`);for(const unit of evidence.units??[])branches.push(`${unit.name}：目前在${unit.location}、軍令「${unit.order}」、士氣 ${unit.morale}、隊形 ${unit.cohesion}、疲勞 ${unit.fatigue}；若無新軍令，部隊不會自動移動。`);for(const injury of evidence.injuries??[])if(injury.active)branches.push(`${injury.label}：目前已持續 ${injury.elapsedTurns} 回合；若不處置，時間仍會增加，若處置才結束活動傷勢。`);forecast=branches.length?`以已知狀態建立條件分支：${branches.join(' ')} 未提供的收入、人物決策、敵情或政局仍未知。`:'結構化紀錄中沒有可供推演的已知條件；不能補造未記錄的資料。';}else if(supported&&Number.isFinite(amount)&&amount>0){if(supported.includes('收入'))forecast=`已知帳目收入錢 ${amount}；若支出與其他收入不變，下一步可用私帳增加 ${amount}，但不能由此推定市場、人物或政局變化。`;else forecast=`已知帳目支出／折損錢 ${amount}；若收入不變，下一步可用私帳減少 ${amount}，但不能由此推定市場、人物或政局變化。`;}m.forecasts.push({turn,question:action.question,result:forecast,markedUncertain:true});result(m,turn,'萬象推演',[],[],'條件式小型情境推演',[forecast]);return m;}
    case 'SenseSeal': {const targets=ids(action.targets??[action.targetId],action.excluded);if(!targets.length)throw new Error('請選擇未排除的五感封鎖目標');for(const id of targets){const s=subject(m,id);s.sensesLost=true;s.sensesRestoredTurn=undefined;s.functionalImpairments??=[];s.functionalImpairments.push('視覺、聽覺、嗅覺、味覺、觸覺資訊全部封閉');}result(m,turn,'五感盡失',targets,action.excluded,'目標五感失去作用',targets.map(id=>`${id} 的視覺、聽覺、嗅覺、味覺、觸覺均失去作用；狀態持續至明確解除`));return m;}
    case 'RestoreSenses': {const s=subject(m,action.targetId);if(!s.sensesLost)throw new Error('目標沒有仍在作用的五感封鎖');s.sensesLost=false;s.sensesRestoredTurn=turn;result(m,turn,'五感盡失',[action.targetId],[],'五感封鎖已解除',['後續感官輸入恢復；先前封鎖期間的經歷不會自動補回']);return m;}
    case 'SealGeneral': {const s=subject(m,action.targetId);if(!s.alive)throw new Error('封將不能作用於亡者');s.functionalImpairments??=[];if(s.functionalImpairments.some(item=>item.startsWith('百脈封將')))throw new Error('目標已處於封將狀態');s.functionalImpairments.push('百脈封將：神經／肌群協調、發力、握持、騎乘與戰鬥姿勢被封鎖；無明顯外傷');result(m,turn,'百脈敕令・封將',[action.targetId],[],'目標戰鬥生理功能被封鎖',['肌群失去協調，無法正常發力、握持兵器、騎乘或維持戰鬥姿勢；不靠意志抵消，也不直接造成外傷']);return m;}
    case 'ReleaseSeal': {const s=subject(m,action.targetId);const before=s.functionalImpairments?.length??0;s.functionalImpairments=(s.functionalImpairments??[]).filter(item=>!item.startsWith('百脈封將'));if(s.functionalImpairments.length===before)throw new Error('目標沒有仍在作用的封將狀態');result(m,turn,'百脈敕令・封將',[action.targetId],[],'封將解除',['後續神經與肌群功能恢復；封鎖期間的局勢與行動不倒帶']);return m;}
    case 'DisruptNetwork': {const network=m.loyaltyNetworks?.find(entry=>entry.id===action.networkId&&entry.active);if(!network)throw new Error('找不到活躍忠誠網絡');network.active=false;result(m,turn,'山河薪火',network.members,[],'小型情境：忠誠網絡受重創',['此情境只標記組織／聯絡中斷，不殺死或改寫成員；可另用薪火不滅驗證重聚條件']);return m;}
    case 'Force': {
      if(!action.instruction.trim())throw new Error('請描述施力方向／實際目標');const targets=ids(action.targets,action.excluded);const a=action.ability;const direct:string[]=[];
      if(a==='霸者橫攔'){if(!action.objectId)throw new Error('橫攔須指定正在移動的物件');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到阻攔物件');object.motionBlocked=true;direct.push(`${object.name} 的移動被攔停`);}
      else if(a==='霸者橫攔・摧關'){if(!action.objectId)throw new Error('摧關須指定關門／障礙物');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到指定結構');object.structural='已破壞';object.intact=false;direct.push(`${object.name} 結構已破壞，不能再作完整障礙或戰利品`);}
      else if(a==='霸者橫攔・霸王擲'){if(!action.objectId)throw new Error('霸王擲須指定可投擲物件');const object=m.objects.find(item=>item.id===action.objectId);if(!object)throw new Error('找不到指定物件');object.location=action.instruction;direct.push(`${object.name} 被投至「${action.instruction}」；其所有權未變`);}
      else if(a==='霸者橫攔・撼陣'){const unit=m.scenarioUnits?.find(entry=>entry.id===action.objectId)??m.scenarioUnits?.[0];if(!unit)throw new Error('撼陣須有可觀察的部隊情境');unit.cohesion=Math.max(0,unit.cohesion-action.intensity*15);unit.morale=Math.max(0,unit.morale-action.intensity*8);unit.order='待命';unit.orderDetail=`隊形受撼：${action.instruction}`;const effect=`撼陣效果：${unit.name}隊形完整度降至 ${unit.cohesion}、士氣 ${unit.morale}，原軍令中斷；未虛構傷亡`;m.environmentalEvents.push(effect);direct.push(effect);}
      else if(a==='霸者橫攔・不動'){m.anchored=true;direct.push('主角位置固定，不受此場景中的推移');}
      else if(a==='霸骨天成'){const p=subject(m,'protagonist');p.bodyChanges.push(action.instruction);p.bodySystems??={神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50};for(const system of ['肌力','肌腱關節','動作協調'] as const)p.bodySystems[system]=Math.min(100,(p.bodySystems[system]??50)+action.intensity*5);direct.push(`主角承載結構已調整；肌力／肌腱關節／動作協調提升，身體狀態可診斷查看：${action.instruction}`);}
      else if(a==='萬民歸心'){for(const id of targets)subject(m,id);m.communitySupport=Math.min(100,(m.communitySupport??50)+action.intensity*5);for(const id of targets){const s=subject(m,id);s.willingness=Math.min(100,s.willingness+action.intensity*5);}direct.push(`小型場景公共支持度 ${m.communitySupport}；目標的傾聽／合作意願提升，反對與拒絕權保留`);}
      else if(a==='群星入懷'){for(const id of targets){const s=subject(m,id);s.willingness=Math.min(100,s.willingness+action.intensity*5);}m.talentLeads??=[];if(!m.talentLeads.some(lead=>lead.id==='example-talent-translator'))m.talentLeads.push({id:'example-talent-translator',name:'鄉里譯者・示例人物',craft:'譯者／商路通譯',location:scene.location,discoveredTurn:turn,approachWillingness:Math.min(100,45+action.intensity*10),example:true});direct.push(...targets.map(id=>`${id} 對接觸／合作的意願提升，仍保有拒絕權；不直接改變其現任主從關係`),`新浮現一條人才線索：鄉里譯者・示例人物（${scene.location}）；可前往接觸，仍保有拒絕權。`);}
      else if(a==='山河薪火'){const loyal=targets.filter(id=>(phase2.relationships.find(relation=>relation.personId===id)?.loyalty??0)>0);if(!loyal.length)throw new Error('沒有已形成的忠誠關係可供連結；不會把仇敵變成忠臣');m.loyaltyNetworks??=[];const existing=m.loyaltyNetworks.find(network=>network.active&&loyal.some(id=>network.members.includes(id)));const members=[...new Set([...(existing?.members??[]),...loyal])];const loyaltyAtFormation=Object.fromEntries(members.map(id=>[id,phase2.relationships.find(relation=>relation.personId===id)?.loyalty??0]));if(existing){existing.members=members;existing.loyaltyAtFormation=loyaltyAtFormation;}else m.loyaltyNetworks.push({id:`loyalty-network-${turn}-${m.loyaltyNetworks.length+1}`,members,loyaltyAtFormation,active:true,reconnections:0});direct.push(`建立／延續跨地忠誠聯絡網：${members.join('、')}；保留原忠誠值，不會精神控制或強迫無忠誠者`);}
      else if(a==='薪火不滅'){const network=m.loyaltyNetworks?.find(entry=>!entry.active||targets.some(id=>entry.members.includes(id)));if(!network)throw new Error('沒有遭受破壞、仍有忠誠成員可重聚的既存網絡');const living=network.members.filter(id=>m.subjects[id]?.alive&&(phase2.relationships.find(relation=>relation.personId===id)?.loyalty??0)>0);const resources=phase2.items.some(item=>item.quantity>0);if(!living.length||!resources)throw new Error('重建須仍有忠誠者及可用資源；不會憑空復活人物或生成糧物');network.members=living;network.active=true;network.reconnections++;direct.push(`忠誠網絡重新聚合第 ${network.reconnections} 次：${living.join('、')}；既有資源可用，沒有創造人物／資產`);}
      else if(a==='萬軍如臂'){if(!action.objectId||!action.unitCommand)throw new Error('萬軍如臂須選擇示例部隊與明確軍令');const unit=m.scenarioUnits?.find(entry=>entry.id===action.objectId);if(!unit)throw new Error('找不到可感知與統御的部隊');const sensed=`統御感知：${unit.name}士氣 ${unit.morale}/100、隊形 ${unit.cohesion}/100、疲勞 ${unit.fatigue}/100、原軍令「${unit.order}」；`;unit.order=action.unitCommand;unit.orderDetail=action.instruction.trim();if(action.unitCommand!=='固守')unit.location=`${action.unitCommand}至${action.instruction.trim()}`;if(action.unitCommand==='前進'||action.unitCommand==='撤退')unit.fatigue=Math.min(100,unit.fatigue+1);direct.push(`${sensed}${unit.name}（${unit.members} 人）已接收「${unit.order}」令並改列 ${unit.location}；疲勞 ${unit.fatigue}；本情境不虛構兵員、糧秣或其他部隊的瞬時移動`);}
      else throw new Error(`能力「${a}」尚未實作；沒有套用效果`);
      result(m,turn,a,targets,action.excluded,`${a}・強度 ${action.intensity}`,direct);return m;
    }
    case 'UsePower': {
      const targets=ids(action.targetIds,action.excluded);const a=action.ability;
      if(['軒轅幻術・五感天幕','萬軍共夢','千軍異夢','神識威壓','妖術・伏地','萬軍伏地','軒轅藏界','軒轅閃','萬解','軒轅極限收斂','軒轅觀世','天醫敕生','歲月回春','軒轅傳音','軒轅傳音・天下共視','萬象推演','百脈敕令'].includes(a)) throw new Error('此能力須使用其專屬操作欄位，不能以通用發動替代');
      if(a!=='軒轅萬語'&&a!=='照膽')throw new Error(`能力「${a}」尚未實作；沒有消耗回合或套用效果`);
      if((a==='照膽'&&!targets.length)||(!targets.length&&!['軒轅之命','山河薪火','薪火不滅','群星入懷','萬軍如臂','軒轅萬語','霸骨天成','軒轅天罰'].includes(a)))throw new Error('此能力須指定目標');
      for(const id of targets)subject(m,id);
      const instruction=action.instruction.trim();if(a==='軒轅萬語'&&(!instruction||!action.languageMode))throw new Error('請選聽、說、讀、寫操作並提供語句內容');
      const relation=phase2.relationships.find(entry=>entry.personId===targets[0]);
      let prose:string;
      if(a==='軒轅萬語'){
        const mode=action.languageMode!,language=action.language?.trim()||EXAMPLE_LANGUAGE.name;
        if(language!==EXAMPLE_LANGUAGE.name)throw new Error(`「${language}」沒有可驗證的示例詞庫；本次未宣稱已翻譯`);
        const source=instruction.trim();let translated:string|undefined;
        if(mode==='聽'||mode==='讀')translated=EXAMPLE_LANGUAGE.toChinese[source as keyof typeof EXAMPLE_LANGUAGE.toChinese];
        else translated=EXAMPLE_LANGUAGE.fromChinese[source as keyof typeof EXAMPLE_LANGUAGE.fromChinese];
        if(!translated)throw new Error(`「${source}」不在${EXAMPLE_LANGUAGE.name}詞庫；本次未宣稱已翻譯`);
        m.languageActs.push({turn,mode,language,targetIds:[...targets],text:source,renderedText:translated});
        if(mode==='聽'||mode==='讀')m.truthsKnown.push(`${mode}懂${language}「${source}」：${translated}`);
        prose=mode==='聽'||mode==='讀'?`已將${language}「${source}」理解為「${translated}」。`:`已將「${source}」以${language}${mode==='說'?'說出':'寫成'}「${translated}」。`;
        prose+=`此為小型詞庫案例；不下載文化背景、不讀心，也不讓旁人自動習得。`;
      }
      else {const signals=m.subjects[targets[0]]?.mindSignals;prose=`照膽讀取心理狀態：信任 ${relation?.trust??'未建檔'}、忠誠 ${relation?.loyalty??'未建檔'}、恐懼 ${m.subjects[targets[0]]?.fear??'未建檔'}、已記恩怨 ${relation?.grievances.length??0} 項。${signals?`當前陳述「${signals.statement}」；真實信念：${signals.genuineBelief}；當下意圖：${signals.genuineIntent}${signals.deceptiveAbout?`；辨出欺瞞：${signals.deceptiveAbout}`:''}${signals.coercedBy?`；存在受迫服從：${signals.coercedBy}`:''}${signals.suppressedEmotion?`；壓抑情緒：${signals.suppressedEmotion}`:''}。`: '沒有可辨識的陳述／意圖資料；不推演未建模心理。'}`;}
      result(m,turn,a,targets,action.excluded,`${a}・強度 ${action.intensity}`,[prose],[] ,action.intent);return m;
    }
  }
}

export function advanceInnate(source:InnateModel,turn:number,daysElapsed:number=LIGHTNING_ENGINEERING_PARAMETERS.roundDays,worldYear?:number):InnateModel {
  const m=structuredClone(source);
  if(worldYear!==undefined)for(const s of Object.values(m.subjects))if(s.birthYear!==undefined&&s.alive)s.physiologicalAge=Math.max(0,worldYear-s.birthYear-(s.rejuvenationOffset??0));
  for(const subject of Object.values(m.subjects))subject.temporaryEffects=(subject.temporaryEffects??[]).filter(effect=>effect.expiresTurn>turn);
  for(const subject of Object.values(m.subjects))subject.sensoryEffects=(subject.sensoryEffects??[]).filter(effect=>effect.expiresTurn>turn);
  for(const subject of Object.values(m.subjects))for(const course of subject.traumaCourse??[]){course.elapsedDays+=daysElapsed;while(course.elapsedDays>=LIGHTNING_ENGINEERING_PARAMETERS.traumaEaseDaysPerLevel&&course.severity>1){course.elapsedDays-=LIGHTNING_ENGINEERING_PARAMETERS.traumaEaseDaysPerLevel;course.severity=(course.severity-1) as 1|2;} }
  for(const subject of Object.values(m.subjects))for(const course of subject.diseaseCourse??[])if(!course.controlled){
    course.elapsedDays+=daysElapsed;course.daysAtIntensity=(course.daysAtIntensity??0)+daysElapsed;
    // The manual defines treatment and worsening, not a numeric disease clock; this threshold is a visible engineering parameter.
    while(course.daysAtIntensity>=LIGHTNING_ENGINEERING_PARAMETERS.diseaseSeverityStepDays&&course.intensity<3){course.daysAtIntensity-=LIGHTNING_ENGINEERING_PARAMETERS.diseaseSeverityStepDays;course.intensity=(course.intensity+1) as 1|2|3;subject.accumulatedHarm=(subject.accumulatedHarm??0)+1;subject.injuries.push(`${course.name}未控制病程惡化至強度 ${course.intensity}`);}
  }
  const subjectsWithActiveCurse=new Set(m.curses.filter(curse=>curse.active).map(curse=>curse.targetId));const recoveryProcessed=new Set<string>();
  for(const curse of m.curses){const s=m.subjects[curse.targetId];if(!s?.alive||curse.lastAdvancedTurn===turn)continue;
    if(curse.active){const elapsed=Math.max(0,turn-(curse.lastAdvancedTurn??curse.startedTurn))*daysElapsed;curse.elapsedDays=(curse.elapsedDays??0)+elapsed;curse.lastAdvancedTurn=turn;curse.accruedInjuries++;
      const harm=Math.max(1,Math.ceil(curse.intensity*elapsed/30));s.accumulatedHarm=(s.accumulatedHarm??0)+harm;
      s.bodySystems??={神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50};
      s.bodySystems.恢復=Math.max(0,(s.bodySystems.恢復??50)-Math.min(20,curse.intensity*3));s.bodySystems.心肺=Math.max(0,(s.bodySystems.心肺??50)-Math.min(15,curse.intensity*2));
      const threshold=curse.intensity>=3?LIGHTNING_ENGINEERING_PARAMETERS.untreatedCurseRiskDays:LIGHTNING_ENGINEERING_PARAMETERS.untreatedCurseHighRiskDays;
      if((curse.elapsedDays??0)>=threshold){s.lifeThreatened=true;s.injuries.push(`${curse.ability}持續侵蝕：失水、衰弱與心肺負擔（已 ${curse.elapsedDays} 日；存在死亡風險）`);}
      else s.injuries.push(`${curse.ability}持續症候（已 ${curse.elapsedDays} 日；眩暈、噁心、失衡與虛弱）`);
    } else {const elapsed=Math.max(0,turn-(curse.lastAdvancedTurn??curse.startedTurn))*daysElapsed;curse.recoveryDays=(curse.recoveryDays??0)+elapsed;curse.lastAdvancedTurn=turn;if(subjectsWithActiveCurse.has(s.id)||recoveryProcessed.has(s.id))continue;recoveryProcessed.add(s.id);const before=s.recoveryElapsedDays??0;s.recoveryElapsedDays=before+elapsed;s.bodySystems??={神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50};const recovered=Math.floor((before+elapsed)/LIGHTNING_ENGINEERING_PARAMETERS.recoveryHarmPointDays)-Math.floor(before/LIGHTNING_ENGINEERING_PARAMETERS.recoveryHarmPointDays);s.bodySystems.恢復=Math.min(50,(s.bodySystems.恢復??50)+recovered);s.bodySystems.心肺=Math.min(50,(s.bodySystems.心肺??50)+recovered);if(recovered){s.accumulatedHarm=Math.max(0,(s.accumulatedHarm??0)-recovered);for(let n=0;n<recovered;n++){const idx=s.injuries.findIndex(item=>item.includes('持續侵蝕')||item.includes('持續症候')||item.includes('詛咒即時生理症候'));if(idx>=0)s.injuries.splice(idx,1);}}if(!subjectsWithActiveCurse.has(s.id)&&!(s.accumulatedHarm??0)){s.lifeThreatened=false;s.functionalImpairments=(s.functionalImpairments??[]).filter(item=>!item.startsWith('詛咒'));}}
  }
  for(const zone of m.lightningZones??[]){if(!zone.active||zone.startedTurn>=turn)continue;zone.turnsApplied++;
    const affected:string[]=[];
    for(const id of zone.targets){const s=m.subjects[id];if(!s?.alive)continue;injury(s,zone.intent==='致命'&&zone.intensity===3?'持續雷域直接致命傷':'持續雷域電擊傷勢');s.accumulatedHarm=(s.accumulatedHarm??0)+zone.intensity;affected.push(`${id}：雷域第 ${zone.turnsApplied} 次直接電擊`);if(zone.intent==='致命'&&zone.intensity===3)s.alive=false;}
    const secondary:string[]=[];
    // The source defines an area, not a closed list of people present at casting time.
    // Scene records provide exact range for known bystanders; later arrivals at the named
    // scene location enter the simplified local danger zone at the tunable local distance.
    const knownNearby=new Map(zone.context.nearby.map(person=>[person.id,person]));
    for(const subject of Object.values(m.subjects))if(subject.location===zone.location&&!knownNearby.has(subject.id))knownNearby.set(subject.id,{id:subject.id,distanceMeters:LIGHTNING_ENGINEERING_PARAMETERS.localMeters,cover:'露天',metalEquipment:false,mounted:false});
    for(const nearby of knownNearby.values()){
      if(zone.targets.includes(nearby.id)||zone.excluded.includes(nearby.id)||nearby.distanceMeters>LIGHTNING_ENGINEERING_PARAMETERS.audibleMeters)continue;
      const s=m.subjects[nearby.id];const effects:string[]=[];if(nearby.distanceMeters<=LIGHTNING_ENGINEERING_PARAMETERS.localMeters)effects.push('雷鳴、強光、爆震造成短暫失衡／動作中斷');
      const insideZone=s?.location===zone.location;
      const connected=(zone.context.ground==='濕'||zone.context.weather==='雨'||nearby.metalEquipment)&&nearby.distanceMeters<=LIGHTNING_ENGINEERING_PARAMETERS.closeMeters;
      if(s?.alive&&(insideZone||connected)){
        injury(s,insideZone?'持續雷域範圍電擊／失衡傷勢':'持續雷域次生電擊傷勢');s.accumulatedHarm=(s.accumulatedHarm??0)+1;
        secondary.push(`${nearby.id}：${insideZone?'進入持續雷域，承受反覆非致命電擊／失衡':'潮濕地面／降雨／金屬形成持續次生電流傷勢'}`);
      }
      if(effects.length&&s?.alive){s.temporaryEffects??=[];s.temporaryEffects.push({label:`持續雷域：${effects.join('、')}`,expiresTurn:turn+1});secondary.push(`${nearby.id}：${effects.join('、')}`);}
      const horse=m.objects.find(object=>object.id===nearby.id&&object.kind==='其他生命');if(nearby.mounted&&horse){horse.motionBlocked=true;secondary.push(`${horse.name} 持續受驚，騎乘／移動失控`);}
    }
    if(zone.ability==='軒轅天罰・雷海')secondary.push('雷海內落雷、聲光與爆震反覆發生；未直擊者仍持續承受環境干擾');
    if(affected.length||secondary.length)m.consequences.push({id:`zone-${turn}-${m.consequences.length+1}`,turn,ability:zone.ability,targets:[...zone.targets],excluded:[...zone.excluded],title:`${zone.ability}持續效果（${zone.location}）`,direct:affected,secondary});
  }
  return m;
}
