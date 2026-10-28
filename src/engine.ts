import { applyAccountEntry, openingEntry, rebuildAccountBook, type AccountBook, type AccountEntry } from './ledger';
import { developTalent, historicalNodeAt, resolvePersonnel, runPersonnelEngine, runTalentEngine, trendForTurn } from './systems';
import { advancePhase2, applyPhase2Action, createPhase2Model, type Phase2Action, type Phase2Model } from './phase2';
import { advanceInnate, applyInnateAction, createInnateModel, type InnateAction, type InnateModel } from './innate';
import { applyEvent as applyLegacyEvent, type GameEvent as LegacyGameEvent, type GameState as LegacyGameState } from './engine.v3';
import { advancePhase4, applyPhase4Action, createPhase4Model, ENGINEERING, PHASE4_CONTENT_VERSION, PHASE4_LEGACY_CONTENT_VERSION, recordInnateDeathRescue, upgradePhase4Content, type Phase4Action, type Phase4Model } from './phase4';

import {inspectLifePlan} from './life';
import {resolveYoungLife} from './lifeReducer';

export const ENGINE_VERSION = 5;
export const LEGACY_ENGINE_VERSION = 1;
export const PHASE2_ENGINE_VERSION = 2;
export const RULES_VERSION = '3.16';
export const SKILLS_VERSION = '1.10';
export const LEGACY_RULES_VERSION = '3.15';
export const LEGACY_SOURCE_HASHES = {
  rules: 'c30b9b1e64bfff24f2827f0a0f791f667edc5a4686cd520c8529af746d4f48a4',
  skills: 'd1d9ee7687b5bcb6ab1e4899e0d2ac62c22ee34bcd72900df78e4cb436cc7a80',
} as const;
export const SOURCE_HASHES = {
  rules: '042ee27fc3e6bf373db7851ce8ad38c5448978c58bb36dfc292c89d046cc5832',
  skills: 'd1d9ee7687b5bcb6ab1e4899e0d2ac62c22ee34bcd72900df78e4cb436cc7a80',
} as const;
export type SourceHashes = { rules: string; skills: string };
// Leave enough in-world turns for a 184-born timeline to reach Phase 4's
// 190/191 historical events through ordinary 30-day actions.
export const MAX_TURNS = 120;
export const INTENTS = ['耕讀自持', '訪求人才', '經商營生', '遊歷鄉里'] as const;
export type Intent = typeof INTENTS[number];
export const STATS = ['統率', '武力', '智力', '政治', '魅力'] as const;
export type Stat = typeof STATS[number];
export interface FamilyMember { role: string; name: string; status: '在世' | '已故' | '示例'; }
export interface OpeningFacts {
  birthYear: number; birthRegion: string; surname: string; background: string; family: FamilyMember[];
  potential: Record<Stat, number>; health: string; localSituation: string; rngTrace: number[];
}
export interface OpeningHistory { regions: string[]; surnames: string[]; }
export interface Character {
  name: string; birthYear: number; age: number; home: string; surname: string; family: FamilyMember[];
  background: string; health: string; potential: Record<Stat, number>; growth: Record<'study'|'practice'|'social', number>;
  profile: { rules: string; skills: string; modernMemory: true; expertise: readonly string[]; personality: readonly string[]; abilitiesStatus: 'catalogued-not-implemented'|'phase-three-partial' };
  money: number; reputation: number; contacts: string[];
}
export interface World { seed: number; worldlineId: string; year: number; month: number; eventCount: number; }
export interface LedgerEntry extends AccountEntry { turn: number; }
export interface PlannedActionDetail { intent:Intent; order:number; targetId?:string; targetName?:string; method?:string; condition?:'目標仍在場'; }
export interface ActionRecord { lifeChoices?:string[]; turn: number; intent: Intent|'幼年日常'; intents?: Intent[]; title: string; details: string; supplement?: string; freeTextActions?:PlannedActionDetail[]; elapsedDays?: number; interruptions?: string[]; }
export interface Summary { turn: number; kind: '小記'|'大記'; text: string; }
export interface PendingDecision { id: string; kind: string; }
export interface GameState {
  schemaVersion: number; engineVersion: number; rulesVersion: string; skillsVersion: string; sourceHashes: SourceHashes;
  status: 'playing'|'complete'; turn: number; revision: number; worldlineId: string; character: Character; world: World;
  trend: string; historicalNodes: string[]; backend: { personnelChecks: number; talentChecks: number; historyChecks: number; trendChecks: number; personnel: string[]; talents: string[] };
  accounts: AccountBook; ledger: LedgerEntry[]; actions: ActionRecord[]; summaries: Summary[]; pendingDecisions: PendingDecision[]; appliedCommands: Record<string, string>;
  actionNotes?: Array<{ turn: number; revision: number; text: string }>;
  phase2?: Phase2Model;
  innate?: InnateModel;
  phase4?: Phase4Model;
}
function historicalRescueSubject(location:string):InnateModel['subjects'][string]{return{id:'sun-jian',fear:0,trauma:[],injuries:[],disease:[],physiologicalAge:0,bodyChanges:[],grantedAbilities:[],sensesLost:false,morale:50,willingness:50,location,alive:true,lifeThreatened:false,bodySystems:{神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50}};}
function syncHistoricalPatient(source:InnateModel,phase4:Phase4Model):InnateModel{const innate=structuredClone(source),patient=innate.subjects['sun-jian'],person=phase4.historicalPersons.find(p=>p.id==='sun-jian'),node=phase4.nodes.find(n=>n.contentId==='sun-jian-death-191');if(!patient||!person)return innate;if(!person.alive){patient.alive=false;patient.location='亡者紀錄';return innate;}patient.location=person.location;if(node?.status==='triggered'&&!patient.injuries.some(injury=>injury.includes('死亡節點情境'))){patient.injuries.unshift('前線危重傷勢（死亡節點情境示例）');patient.lifeThreatened=true;}return innate;}
export type GameEvent =
  | {version:5;eventId:string;commandId:string;commandHash:string;revision:number;type:'LifePlanResolved';payload:{policyVersion:1;choiceIds:string[];supplement:string;paceDays?:number}}
  | { version: number; eventId: string; commandId: string; commandHash: string; revision: number; type: 'WorldCreated'; payload: { worldlineId: string; name: string; seed: number; facts: OpeningFacts; phase4ContentVersion?:string; rulesVersion?:string; sourceHashes?:SourceHashes } }
  | { version: number; eventId: string; commandId: string; commandHash: string; revision: number; type: 'IntentResolved'; payload: { intent: Intent } }
  | { version: 4; eventId: string; commandId: string; commandHash: string; revision: number; type: 'ActionPlanResolved'; payload: { intents: Intent[]; supplement: string } }
  | { version: 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'ActionPlanResolved'; payload: { intents: Intent[]; supplement: string; executedIntents: Intent[]; elapsedDays: number; interruptions: string[]; interruptedIntent?:Intent; freeTextActions?:PlannedActionDetail[] } }
  | { version: 4 | 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'ActionNoteRecorded'; payload: { text: string } }
  | { version: 2 | 3 | 4 | 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'Phase2Changed'; payload: { action: Phase2Action } }
  | { version: 2; eventId: string; commandId: string; commandHash: string; revision: number; type: 'WorldlineUpgraded'; payload: { phase2: Phase2Model } }
  | { version: 3; eventId: string; commandId: string; commandHash: string; revision: number; type: 'InnateSystemUpgraded'; payload: { innate: InnateModel } }
  | { version: 4 | 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'InnateChanged'; payload: { action: InnateAction } }
  | { version: 4; eventId: string; commandId: string; commandHash: string; revision: number; type: 'EngineUpgraded' }
  | { version: 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'EngineUpgraded' }
  | { version: 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'Phase4Changed'; payload: { action: Phase4Action } }
  | { version: 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'Phase4ContentUpdated'; payload:{contentVersion:string} }
  | { version: 5; eventId: string; commandId: string; commandHash: string; revision: number; type: 'RulesUpdated'; payload:{fromVersion:string;toVersion:string;sourceHashes:SourceHashes} };
export type GameCommand =
  | {version:5;commandId:string;expectedRevision:number;worldlineId:string;type:'SubmitLifePlan';choiceIds:string[];supplement:string;paceDays?:number}
  | { version: number; commandId: string; expectedRevision: number; type: 'StartGame'; name: string; seed: number; facts: OpeningFacts }
  | { version: number; commandId: string; expectedRevision: number; worldlineId: string; type: 'ChooseIntent'; intent: Intent }
  | { version: 5; commandId: string; expectedRevision: number; worldlineId: string; type: 'SubmitActionPlan'; intents: Intent[]; supplement: string; freeTextActions?:PlannedActionDetail[] }
  | { version: 5; commandId: string; expectedRevision: number; worldlineId: string; type: 'RecordActionNote'; text: string }
  | { version: number; commandId: string; expectedRevision: number; worldlineId: string; type: 'Continue' }
  | { version: 5; commandId: string; expectedRevision: number; worldlineId: string; type: 'Phase2Action'; action: Phase2Action }
  | { version: 5; commandId: string; expectedRevision: number; worldlineId: string; type: 'InnateAction'; action: InnateAction }
  | { version: 5; commandId: string; expectedRevision: number; worldlineId: string; type: 'Phase4Action'; action: Phase4Action };

export const REGIONS = [
  '司隸','豫州','兗州','徐州','青州','冀州','幽州','并州','涼州','荊州','揚州','益州','交州','漢中','關中','遼東','南中','江東','荊襄','河東','潁川','汝南','陳留','南陽','襄陽','成都周邊','吳郡／會稽一帶','許縣／潁川一帶','洛陽周邊','隨機邊郡／特殊地區',
] as const;
// Small, explicitly illustrative surname pool. The canonical source specifies deduplication, not a surname probability table.
const surnames = ['陳','劉','曹','孫','袁','荀','張','趙','周','王','李','許','郭','鄭','馬','黃','朱','何','高','徐','盧','陶','孔','丁','蔡','韓','韋','鍾','潘','杜'];
const backgrounds = ['寒門農戶','小地主','地方豪族旁支','士族旁支','商賈之家','醫卜之家','軍戶／邊軍之家','郡縣小吏之家','流民家庭','戰亂遺孤','工匠之家'];
const given = ['伯和','季平','叔明','仲良','公達','元讓','子敬','文遠','奉孝','士衡','子安','季常','元直','叔至','公瑾','子瑜'];
const familyRoles = ['父親','母親（內名）','祖父／祖母','叔伯或宗族長輩','兄弟姊妹狀態','啟蒙師長／鄰近重要人物'];
const modernExpertise = ['現代與歷史知識','兵法','軍謀','內政','交易'];
const personality = ['長期主義與保留自主','愛逛市場與殺價','購得好物樂於分享','可在亂世中自由選擇路線','重情護短、會記恩怨'];

export function random(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
function select<T>(items: readonly T[], seed: number, salt: number): T { return items[Math.floor(random(seed, salt) * items.length)]; }
function newName(surname: string, seed: number, salt: number, excluded: Set<string>): string {
  // Three deterministic candidate rounds, then a final distinctness check.
  const candidates = [0,1,2].map((round) => `${surname}${select(given, seed, salt + round * 13)}`);
  return candidates.find((candidate) => !excluded.has(candidate)) ?? `${surname}${select(given, seed, salt + 73)}`;
}
export function createOpeningFacts(seed: number, birthYear: number, history: OpeningHistory): OpeningFacts {
  const recentRegions = new Set(history.regions.slice(-3)), recentSurnames = new Set(history.surnames.slice(-3));
  const availableRegions = REGIONS.filter((r) => !recentRegions.has(r));
  const availableSurnames = surnames.filter((s) => !recentSurnames.has(s));
  const rngTrace: number[] = [];
  const draw = (salt: number) => { const v = random(seed, salt); rngTrace.push(Math.floor(v * 1_000_000)); return v; };
  const region = availableRegions[Math.floor(draw(101) * availableRegions.length)];
  const surname = availableSurnames[Math.floor(draw(102) * availableSurnames.length)];
  const background = backgrounds[Math.floor(draw(103) * backgrounds.length)];
  const excluded = new Set<string>();
  const family = familyRoles.map((role, i) => {
    if (role === '兄弟姊妹狀態') return { role, name: Math.floor(draw(200 + i) * 3) === 0 ? '有一名兄姊（示例）' : '暫無手足紀錄（示例）', status: '示例' as const };
    const name = newName(surname, seed, 220 + i * 17, excluded); excluded.add(name);
    return { role, name, status: role.startsWith('祖父') && draw(230 + i) < .45 ? '已故' as const : '示例' as const };
  });
  const potential = Object.fromEntries(STATS.map((stat, i) => [stat, 25 + Math.floor(draw(300 + i) * 51)])) as Record<Stat, number>;
  return { birthYear, birthRegion: region, surname, background, family, potential, health: select(['幼年體健（示例）','體質平常（示例）','需留意休養（示例）'], seed, 401), localSituation: select(['鄉里安定、農事初興（示例）','市集往來頻繁（示例）','地方正收容流民（示例）'], seed, 402), rngTrace };
}
export function createStartEvent(command: Extract<GameCommand,{type:'StartGame'}>): GameEvent {
  const worldlineId = `wl-${command.commandId}`;
  return { version: command.version, eventId: `${worldlineId}:1`, commandId: command.commandId, commandHash: fingerprint(command), revision: 1, type: 'WorldCreated', payload: { worldlineId, name: command.name.trim(), seed: command.seed >>> 0, facts: command.facts, ...(command.version===ENGINE_VERSION?{phase4ContentVersion:PHASE4_CONTENT_VERSION,rulesVersion:RULES_VERSION,sourceHashes:SOURCE_HASHES}:{}) } };
}
function fingerprint(command: GameCommand): string {
  return JSON.stringify(command.type === 'StartGame'
    ? { type: command.type, name: command.name.trim(), seed: command.seed >>> 0, facts: command.facts, expectedRevision: command.expectedRevision }
    : { type: command.type, worldlineId: command.worldlineId, payload: command.type === 'SubmitLifePlan' ? {choiceIds:command.choiceIds,supplement:command.supplement,...(command.paceDays!==undefined?{paceDays:command.paceDays}:{})} : command.type === 'ChooseIntent' ? command.intent : command.type === 'SubmitActionPlan' ? { intents: command.intents, supplement: command.supplement } : command.type === 'RecordActionNote' ? command.text : command.type === 'Phase2Action' || command.type === 'InnateAction' || command.type === 'Phase4Action' ? command.action : null, expectedRevision: command.expectedRevision });
}
export function applyEvent(state: GameState | null, event: GameEvent): GameState {
  // Event versions 1–3 retain their original reducers. Version 4 remains readable
  // by the phase-three reducer; v5 adds the historical/governance world layer.
  if (event.version <= 3) return applyLegacyEvent(state as LegacyGameState | null, event as LegacyGameEvent) as GameState;
  if (![4, ENGINE_VERSION].includes(event.version)) throw new Error(`不支援的事件版本：${event.version}`);
  if (event.type === 'EngineUpgraded') {
    if (!state || event.revision !== state.revision + 1) throw new Error('階段引擎升級事件無效');
    if (event.version === 4 && state.engineVersion !== 3) throw new Error('第三階段引擎升級事件無效');
    if (event.version === 5 && (state.engineVersion !== 4 || state.phase4)) throw new Error('第四階段引擎升級事件無效');
    if (event.version === 5) return { ...state, schemaVersion:5, engineVersion:5, phase4:createPhase4Model(state.world.year,state.world.month,state.phase2?.persons.map(p=>({id:p.id,name:p.name,alive:p.alive,location:p.id==='protagonist'?state.phase2!.scene.location:'地方（未定位）',office:p.office}))??[],PHASE4_LEGACY_CONTENT_VERSION), revision:event.revision, appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash} };
    const innate = state.innate ? {
      ...state.innate,
      lightningZones: state.innate.lightningZones ?? [], scenarioUnits: state.innate.scenarioUnits ?? [],
      loyaltyNetworks: state.innate.loyaltyNetworks ?? [], communitySupport: state.innate.communitySupport ?? 50,
      languageActs: state.innate.languageActs ?? [],
    } : undefined;
    if(innate&&state.phase2)for(const person of state.phase2.persons){const subject=innate.subjects[person.id];if(subject){subject.birthYear??=person.birthYear;subject.rejuvenationOffset??=0;}}
    if(innate)for(const object of innate.objects.filter(item=>item.kind==='其他生命'))if(!innate.subjects[object.id])innate.subjects[object.id]={id:object.id,fear:0,trauma:[],injuries:[],disease:[],physiologicalAge:0,bodyChanges:[],grantedAbilities:[],sensesLost:false,morale:50,willingness:50,location:object.location,alive:true,bodySystems:{神經:50,肌力:50,肌腱關節:50,循環:50,心肺:50,疼痛:50,感官:50,平衡:50,反射:50,動作協調:50,疲勞處理:50,恢復:50}};
    return { ...state, schemaVersion:4, engineVersion:4, revision:event.revision, ...(innate?{innate}:{}), appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash} };
  }
  if (event.type === 'WorldlineUpgraded') {
    if (!state || state.engineVersion !== LEGACY_ENGINE_VERSION || event.version !== PHASE2_ENGINE_VERSION || event.revision !== state.revision + 1) throw new Error('舊世界線升級事件無效');
    return { ...state, schemaVersion: 2, engineVersion: PHASE2_ENGINE_VERSION, status: 'playing', revision: event.revision, phase2: event.payload.phase2, appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash } };
  }
  if (event.type === 'WorldCreated') {
    if (state) {
      const existing = state.appliedCommands[event.commandId];
      if (existing === event.commandHash) return state;
      throw new Error('世界線建立事件只能是事件流第一筆');
    }
    const { facts, name, worldlineId, seed } = event.payload;
    const rulesVersion=event.payload.rulesVersion??LEGACY_RULES_VERSION;
    const sourceHashes=event.payload.sourceHashes??LEGACY_SOURCE_HASHES;
    if (!name.trim() || !Number.isInteger(facts.birthYear) || facts.birthYear < 160 || facts.birthYear > 184 || !Number.isInteger(seed) || !REGIONS.includes(facts.birthRegion as typeof REGIONS[number])) throw new Error('開局資料無效');
    const newState: GameState = {
      schemaVersion: event.version >= 2 ? event.version : 1, engineVersion: event.version, rulesVersion, skillsVersion: SKILLS_VERSION, sourceHashes,
      status: 'playing', turn: 0, revision: 1, worldlineId, character: {
        name, birthYear: facts.birthYear, age: 0, home: facts.birthRegion, surname: facts.surname, family: facts.family,
        background: facts.background, health: facts.health, potential: facts.potential, growth: { study: 0, practice: 0, social: 0 },
        profile: { rules: rulesVersion, skills: SKILLS_VERSION, modernMemory: true, expertise: modernExpertise, personality, abilitiesStatus: event.version===ENGINE_VERSION?'phase-three-partial':'catalogued-not-implemented' },
        money: 12, reputation: 0, contacts: [],
      },
      world: { seed, worldlineId, year: facts.birthYear, month: 1, eventCount: 0 }, trend: '新生於鄉里，天下仍在自行運轉。', historicalNodes: [],
      backend: { personnelChecks: 0, talentChecks: 0, historyChecks: 0, trendChecks: 0, personnel: ['縣亭佐吏・示例人物（待地方考課）'], talents: [] },
      accounts: { private: 12, family: 0, public: 0, military: 0, sovereign: 0 }, ledger: [openingEntry(worldlineId, facts.birthYear)], actions: [], summaries: [], pendingDecisions: [], appliedCommands: { [event.commandId]: event.commandHash },
    };
    if (event.version >= 2) newState.phase2 = createPhase2Model(name, facts.birthYear, facts.family, facts.potential);
    if (event.version === ENGINE_VERSION && newState.phase2) newState.innate = createInnateModel(newState.phase2, facts.birthYear, facts.birthRegion);
    if (event.version === ENGINE_VERSION) newState.phase4 = createPhase4Model(facts.birthYear,1,newState.phase2?.persons.map(p=>({id:p.id,name:p.name,alive:p.alive,location:p.id==='protagonist'?'家宅・庭院':'地方（未定位）',office:p.office}))??[],event.payload.phase4ContentVersion??PHASE4_LEGACY_CONTENT_VERSION);
    return newState;
  }
  if (!state) throw new Error('事件流缺少世界線建立事件');
  if (state.appliedCommands[event.commandId]) {
    if (state.appliedCommands[event.commandId] === event.commandHash) return state;
    throw new Error('事件 commandId 重複但內容不一致');
  }
  if (event.revision !== state.revision + 1) throw new Error('事件版本序列不連續');
  if(event.type==='RulesUpdated'){
    if(event.version!==ENGINE_VERSION||state.rulesVersion!==event.payload.fromVersion||event.payload.toVersion!==RULES_VERSION||event.payload.sourceHashes.rules!==SOURCE_HASHES.rules||event.payload.sourceHashes.skills!==SOURCE_HASHES.skills)throw new Error('規則來源升級事件無效');
    return {...state,revision:event.revision,rulesVersion:event.payload.toVersion,sourceHashes:event.payload.sourceHashes,character:{...state.character,profile:{...state.character.profile,rules:event.payload.toVersion}},appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash}};
  }
  if(event.type==='Phase4ContentUpdated'){
    if(event.version!==ENGINE_VERSION||!state.phase4)throw new Error('歷史內容更新不適用於此存檔');
    const phase4=upgradePhase4Content(state.phase4,event.payload.contentVersion);
    const innate=state.innate?syncHistoricalPatient(state.innate,phase4):undefined;
    return {...state,revision:event.revision,phase4,...(innate?{innate}:{}),appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash}};
  }
  if(event.type==='LifePlanResolved'){
    if(!event.eventId.startsWith(`${state.worldlineId}:`))throw new Error('世界線不符');
    const next=resolveYoungLife(state,event);
    if(next.innate&&next.phase4)next.innate=syncHistoricalPatient(next.innate,next.phase4);
    if(next.turn%5===0)next.summaries=[...state.summaries,makeSummary(next.turn,next.character,next.world,next.actions,next.ledger)];
    return next;
  }
  if (event.type === 'ActionNoteRecorded') {
    if (![4,ENGINE_VERSION].includes(event.version) || !event.payload.text.trim()) throw new Error('補充說明不可為空白');
    return { ...state, revision:event.revision, actionNotes:[...(state.actionNotes ?? []), { turn:state.turn, revision:event.revision, text:event.payload.text.trim() }], appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash} };
  }
  if (event.type === 'Phase4Changed') {
    if(event.version!==ENGINE_VERSION||!state.phase4||!state.phase2)throw new Error('第四階段資料尚未遷移');
    const people=[...state.phase2.persons.map(p=>({id:p.id,name:p.name,alive:p.alive,location:p.id==='protagonist'?state.phase2!.scene.location:'地方（未定位）',office:p.office})),...state.phase4.candidates.filter(c=>c.status==='recruited').map(c=>({id:c.id,name:c.name,alive:true,location:c.origin,office:'在籍人才（待任）'}))];
    const phase4=applyPhase4Action(state.phase4,event.payload.action,people);
    const innate=state.innate?syncHistoricalPatient(state.innate,phase4):undefined;
    const phase2=structuredClone(state.phase2);
    for(const person of phase2.persons){const office=phase4.offices.find(o=>o.holderId===person.id);if(office)person.office=office.title;else if(phase4.offices.some(o=>o.appointment?.personId===person.id)||phase4.offices.some(o=>o.holderId!==person.id&&person.office===o.title))person.office='白身';}
    const age=Math.max(0,phase4.year-state.character.birthYear);
    return {...state,revision:event.revision,phase4,phase2:{...phase2,age},character:{...state.character,age},...(innate?{innate}:{}),world:{...state.world,year:phase4.year,month:phase4.month},appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash}};
  }
  if (event.type === 'Phase2Changed') {
    if (![ENGINE_VERSION,4,PHASE2_ENGINE_VERSION,3].includes(event.version) || !state.phase2) throw new Error('第二階段命令不適用於此版本存檔');
    const phase2 = applyPhase2Action(state.phase2, event.payload.action);
    let innate=state.innate;
    let phase4=state.phase4;
    if(innate&&event.payload.action.type==='MarkDeath'){
      const personId=event.payload.action.personId;innate=structuredClone(innate);
      if(innate.subjects[personId]){innate.subjects[personId].alive=false;innate.subjects[personId].location='亡者紀錄';}
      const body=innate.objects.find(object=>object.id===`person-body-${personId}`);if(body){body.kind='人類屍體';body.location='亡者紀錄';}
    }
    if(phase4&&event.payload.action.type==='MarkDeath'){
      const deceasedId=event.payload.action.personId;phase4=structuredClone(phase4);const office=phase4.offices.find(entry=>entry.holderId===deceasedId);if(office){office.holderId=null;office.vacancySince=phase4.day;phase4.externalUpdates.push(`${office.title}因任職者亡故出缺，繼任程序啟動。`);}
    }
    const changed = { ...state, revision: event.revision, phase2, ...(innate?{innate}:{}), ...(phase4?{phase4}:{}), appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash } };
    if (event.payload.action.type === 'TransferAsset' && event.payload.action.asset === '錢') {
      const action = event.payload.action;
      const result = applyAccountEntry(state.accounts, { id:event.eventId, eventId:event.eventId, turn:action.turn, asset:'錢', amount:action.amount, from:action.from, to:action.to, memo:action.memo });
      if (result.accounts.private !== phase2.assetBalances.錢.private) throw new Error('私帳金額與多資產帳簿不一致');
      return { ...changed, character: { ...state.character, money: result.accounts.private }, accounts: result.accounts, ledger: [...state.ledger, result.entry] };
    }
    if (event.payload.action.type === 'RecalculateMoneyAccounts') {
      const accounts = rebuildAccountBook(state.ledger);
      const balances = { ...phase2.assetBalances.錢, ...accounts };
      return { ...changed, character: { ...state.character, money: accounts.private }, accounts, phase2: { ...phase2, assetBalances: { ...phase2.assetBalances, 錢: balances } } };
    }
    return changed;
  }
  if (event.type === 'InnateChanged') {
    if (![4,ENGINE_VERSION].includes(event.version) || !state.phase2 || !state.innate) throw new Error('此世界線尚未完成天生技系統遷移');
    const scene = state.phase2.scene;
    const action=event.payload.action;const sourceInnate=structuredClone(state.innate);if(action.type==='Heal'&&action.targetId==='sun-jian'&&!sourceInnate.subjects['sun-jian']&&state.phase4){sourceInnate.subjects['sun-jian']=historicalRescueSubject(state.phase4.historicalPersons.find(p=>p.id==='sun-jian')?.location??'長江中游（節點資料）');Object.assign(sourceInnate,syncHistoricalPatient(sourceInnate,state.phase4));}
    const sunInjuriesBefore=sourceInnate.subjects['sun-jian']?.injuries.length??0;
    const innate = applyInnateAction(sourceInnate,event.payload.action,state.turn, {location:scene.location,presentIds:scene.presentIds,text:state.actions.at(-1)?.details ?? '場景尚無已記錄正文'},state.phase2);
    let phase2 = state.phase2;
    const actionSteps:InnateAction[]=action.type==='Combination'?action.steps:[action];
    const flashStep=actionSteps.find((step):step is Extract<InnateAction,{type:'Flash'}>=>step.type==='Flash');
    if(flashStep){
      const carriedPeople=flashStep.bringIds.map(id=>innate.objects.find(object=>object.id===id)).filter(object=>object?.kind==='人類活體').map(object=>object!.id.replace(/^person-body-/,''));
      const presentIds=['protagonist',...carriedPeople];
      phase2={...phase2,scene:{...phase2.scene,location:flashStep.location,presentIds,enteredIds:presentIds,leftIds:phase2.scene.presentIds.filter(id=>!presentIds.includes(id))}};
    }
    if(actionSteps.some(step=>['Store','Retrieve','Flash'].includes(step.type))){
      const moved=new Map(innate.objects.map(object=>[object.id,object]));
      phase2={...phase2,items:phase2.items.map(item=>{const object=moved.get(item.id);return object?{...item,ownerId:object.ownerId,custodianId:object.custodianId,locationId:object.location,quantity:object.quantity}:item;})};
    }
    let phase4=state.phase4&&flashStep?{...state.phase4,playerLocation:innate.subjects.protagonist.location}:state.phase4;
    const healingSteps=actionSteps.filter((step):step is Extract<InnateAction,{type:'Heal'}>=>step.type==='Heal');
    if(phase4&&healingSteps.some(step=>step.targetId==='sun-jian')&&innate.subjects['sun-jian'].injuries.length<sunInjuriesBefore)phase4=recordInnateDeathRescue(phase4,'sun-jian',true);
    if(phase4)Object.assign(innate,syncHistoricalPatient(innate,phase4));
    const lethalIllusion=action.type==='Illusion'&&action.intent==='致命'&&((action.severity===3&&(action.depth==='入實'||action.depth==='五感實相'))||action.accidentOutcome==='致命');
    const lethalLightning=action.type==='Lightning'&&action.intent==='致命'&&action.intensity===3;
    if(lethalIllusion||lethalLightning){
      const deadIds=action.targets.filter(id=>!action.excluded.includes(id));
      const cause=lethalIllusion?(action.type==='Illusion'&&action.accidentOutcome==='致命'&&!(action.severity===3&&(action.depth==='入實'||action.depth==='五感實相'))?'幻術次生事故致命傷':'幻術實相致命直接傷害'):'雷霆致命直接傷害';
      phase2={...phase2,persons:phase2.persons.map(person=>deadIds.includes(person.id)&&person.alive?{...person,alive:false,deathYear:state.world.year,deathCause:cause}:person),scene:{...phase2.scene,presentIds:phase2.scene.presentIds.filter(id=>!deadIds.includes(id))}};
      for(const id of deadIds){const body=innate.objects.find(object=>object.id===`person-body-${id}`);if(body){body.kind='人類屍體';body.location='亡者紀錄';}if(innate.subjects[id])innate.subjects[id].location='亡者紀錄';}
    }
    return { ...state, revision:event.revision, innate, phase2, ...(phase4?{phase4}:{}), appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash} };
  }
  const turnLimit = event.version === LEGACY_ENGINE_VERSION ? 20 : MAX_TURNS;
  if (state.status === 'complete' && !(event.version === ENGINE_VERSION && state.schemaVersion >= 2) || state.turn >= turnLimit) throw new Error('本段旅程已結束');
  const intents: Intent[] | null = event.type === 'IntentResolved' ? [event.payload.intent] : event.type === 'ActionPlanResolved' ? (event.version===ENGINE_VERSION&&event.payload.executedIntents?event.payload.executedIntents:event.payload.intents) : null;
  const interruptedOnly=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'&&intents?.length===0&&!!event.payload.interruptedIntent&&event.payload.interruptions.length>0;
  if (!intents || intents.length === 0&&!interruptedOnly || intents.some((intent) => !INTENTS.includes(intent)) || !event.eventId.startsWith(`${state.worldlineId}:`)) throw new Error('回合事件無效或屬於其他世界線');
  if (event.type === 'ActionPlanResolved' && (![4,ENGINE_VERSION].includes(event.version) || inspectActionPlan(intents).conflicts.length > 0)) throw new Error('行動計畫有衝突，請先調整');
  const freeTextActions=event.type==='ActionPlanResolved'&&event.version===ENGINE_VERSION?(event.payload.freeTextActions??[]).filter(detail=>intents.includes(detail.intent)):[];
  for(const detail of freeTextActions){
    if(!intents.includes(detail.intent)||!Number.isInteger(detail.order)||detail.order<1)throw new Error('自由文字候選行動未包含於已確認計畫');
    if(detail.method&&!({耕讀自持:['讀書','讀兵書','讀經','抄書','耕作','耕田'],訪求人才:['訪求人才','訪賢','尋訪人才','尋才','招攬','延請','登門延請','訪問'],經商營生:['經商營生','經商','做生意','買賣','交易','擺攤','市集'],遊歷鄉里:['遊歷鄉里','遊歷','走訪','遊訪','探訪','拜訪','探望','出門走走']} as Record<Intent,string[]>)[detail.intent].includes(detail.method))throw new Error('文字行動方式尚未支援');
    if(detail.condition&&detail.condition!=='目標仍在場')throw new Error('文字行動條件尚未支援');
    if(detail.targetId&&detail.intent==='訪求人才'&&!state.phase4?.candidates.some(candidate=>candidate.id===detail.targetId&&candidate.name===detail.targetName&&['available','competing'].includes(candidate.status)))throw new Error('指定人才目前不可招攬');
    if(detail.targetId&&detail.intent==='遊歷鄉里'&&!state.phase2?.persons.some(person=>person.id===detail.targetId&&person.name===detail.targetName&&person.alive&&state.phase2?.scene.presentIds.includes(person.id)))throw new Error('指定人物不在可拜訪的當前場景');
    if(detail.targetId&&!['訪求人才','遊歷鄉里'].includes(detail.intent))throw new Error('此行動尚不支援指定目標');
    if(detail.condition==='目標仍在場'&&(!detail.targetId||!state.phase2?.scene.presentIds.includes(detail.targetId)))throw new Error('行動條件不成立：目標目前不在場');
  }
  const turn = state.turn + 1;
  const elapsedDays=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'?event.payload.elapsedDays:intents.reduce((sum,intent)=>sum+ACTION_DURATION_DAYS[intent],0);
  const interruptions=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'?event.payload.interruptions:[];
  let phase4 = event.version===ENGINE_VERSION&&state.phase4 ? advancePhase4(state.phase4,elapsedDays) : state.phase4;
  if(phase4)for(const detail of freeTextActions)if(detail.intent==='訪求人才'&&detail.targetId){phase4=applyPhase4Action(phase4,{type:'Recruit',candidateId:detail.targetId},state.phase2?.persons.map(person=>({id:person.id,name:person.name,alive:person.alive,office:person.office,location:state.phase2?.scene.location??''}))??[]);}
  let moneyDelta = 0, reputationDelta = 0;
  const moneyDeltas: Array<{ intent:Intent; amount:number; memo:string }> = [];
  let character = { ...state.character, growth: { ...state.character.growth }, contacts: [...state.character.contacts] };
  const outcomes: string[] = [];
  for (const intent of intents) {
    const roll = random(state.world.seed, turn * 7 + INTENTS.indexOf(intent));
    switch (intent) {
      case '耕讀自持': { const income = roll > .82 ? 4 : 2; moneyDelta += income; moneyDeltas.push({intent,amount:income,memo:`田畝與書卷・家計收入 ${income}`}); outcomes.push(`田畝與書卷：學習經驗增加，家計收入錢 ${income}`); break; }
      case '訪求人才': { const target=freeTextActions.find(detail=>detail.intent==='訪求人才'&&detail.targetId);if(target){const status=phase4?.candidates.find(candidate=>candidate.id===target.targetId)?.status;outcomes.push(status==='approached'?`已向指定人才 ${target.targetName} 正式提出招攬；本人回應仍待後續結算`:`指定人才 ${target.targetName} 已被競爭勢力先行延請，招攬未成功`);}else{const result = resolvePersonnel(character, state.world.seed, turn, roll); character = result.character; reputationDelta += result.reputationDelta; outcomes.push(`${result.title}：${result.details}`);} break; }
      case '經商營生': { const trade = roll > .24 ? 5 : -2; moneyDelta += trade; moneyDeltas.push({intent,amount:trade,memo:`市集營生・${trade > 0 ? `收入 ${trade}` : '貨損支出 2'}`}); outcomes.push(`市集營生：${trade > 0 ? `收入錢 ${trade}` : '貨物折損，支出錢 2'}`); break; }
      case '遊歷鄉里': { moneyDelta -= 1; moneyDeltas.push({intent,amount:-1,memo:'行走鄉里・旅費支出 1'}); const rep = roll > .48 ? 1 : 0; reputationDelta += rep; const target=freeTextActions.find(detail=>detail.intent==='遊歷鄉里'&&detail.targetId);outcomes.push(`行走鄉里：${target?`拜訪${target.targetName}，信任 +${ENGINEERING.playerVisitTrustGain}`:'探訪村落'}，支出旅費錢 1${rep ? '，鄉里聲望 +1' : ''}`); break; }
    }
  }
  moneyDelta = Math.max(-character.money, moneyDelta);
  const recordedIntents=event.type==='ActionPlanResolved'?event.payload.intents:intents;
  const interruptedIntent=event.type==='ActionPlanResolved'&&event.version===ENGINE_VERSION?event.payload.interruptedIntent:undefined;
  const title = intents.length === 0 ? `重大節點中斷：${interruptedIntent??''}` : intents.length === 1 ? ({'耕讀自持':'田畝與書卷','訪求人才':'訪求人才','經商營生':'市集營生','遊歷鄉里':'行走鄉里'} as Record<Intent,string>)[intents[0]] : `行動計畫：${intents.join('、')}`;
  const supplement = event.type === 'ActionPlanResolved' ? event.payload.supplement.trim() : '';
  const resolvedText=freeTextActions.map(detail=>`${detail.order}. ${detail.intent}${detail.targetName?`・對象 ${detail.targetName}`:''}${detail.method?`・方式 ${detail.method}`:''}${detail.condition?`・條件 ${detail.condition}`:''}`).join('；');
  const supplementRecord=event.type==='ActionPlanResolved'&&event.payload.supplement.trim()?freeTextActions.length?'；補充說明原文已保存於本條紀錄；僅已確認候選條件參與結算':'；補充說明未解析，原文已保存於本條紀錄':'';
  const details = `${outcomes.join('；')|| (interruptedOnly?`「${interruptedIntent}」尚未完成，未結算其收益或資源`: '')}${resolvedText?`；已確認文字行動：${resolvedText}`:''}${supplementRecord}`;
  const finalDetails = `${details}${event.version===ENGINE_VERSION?`；本計畫推進 ${elapsedDays} 日${interruptions.length?`，遇重大節點後中斷：${interruptions.join('；')}`:''}`:''}`;
  character.money += moneyDelta; character.reputation += reputationDelta;
  for (const intent of intents) character = developTalent(character, intent, random(state.world.seed, turn * 7 + INTENTS.indexOf(intent)));
  const year = phase4?.year ?? state.world.year + (turn % 4 === 0 ? 1 : 0), month = phase4?.month ?? ((turn * 3) % 12) + 1;
  character.age = year - character.birthYear;
  const personnel = runPersonnelEngine(state.backend.personnel, turn);
  const talent = runTalentEngine(state.backend.talents, state.world.seed, turn);
  const node = historicalNodeAt(turn), trend = trendForTurn(state.world.seed, turn);
  let accounts = state.accounts;
  const newLedger: LedgerEntry[] = [];
  for (const [index, change] of moneyDeltas.entries()) {
    const amount = Math.abs(change.amount);
    if (!amount) continue;
    const paid = Math.min(amount, accounts.private);
    if (change.amount < 0 && paid === 0) continue;
    const entry = applyAccountEntry(accounts, { id:`${event.eventId}:asset:${index}`, eventId:event.eventId, turn, asset:'錢', amount:change.amount > 0 ? amount : paid, from:change.amount > 0 ? 'market' : 'private', to:change.amount > 0 ? 'private' : 'market', memo:change.memo });
    accounts = entry.accounts; newLedger.push(entry.entry);
  }
  const ledger = newLedger.length ? [...state.ledger, ...newLedger] : state.ledger;
  const actions = [...state.actions, { turn, intent:intents[0]??recordedIntents[0], intents:[...recordedIntents], title, details:finalDetails, ...(supplement ? { supplement } : {}), ...(freeTextActions.length?{freeTextActions}:{}), ...(event.version===ENGINE_VERSION?{elapsedDays,interruptions}: {}) }];
  const summaries = turn % 5 === 0 ? [...state.summaries, makeSummary(turn, character, state.world, actions, ledger)] : state.summaries;
  let phase2 = event.version >= PHASE2_ENGINE_VERSION && state.phase2 ? advancePhase2(state.phase2, turn, year, intents.join('＋'), character.money, event.eventId,event.version===ENGINE_VERSION?elapsedDays:undefined) : state.phase2;
  if(phase2)for(const detail of freeTextActions)if(detail.intent==='遊歷鄉里'&&detail.targetId){const relation=phase2.relationships.find(record=>record.personId===detail.targetId);if(relation)phase2=applyPhase2Action(phase2,{type:'AdjustRelation',personId:detail.targetId,axis:'trust',delta:ENGINEERING.playerVisitTrustGain,reason:`依玩家已確認的${detail.method??'拜訪'}行動建立交往`,turn});}
  let innate = event.version >= 4 && state.innate ? advanceInnate(state.innate,turn,event.version===ENGINE_VERSION?elapsedDays:undefined,year) : state.innate;
  if(innate&&phase4)innate=syncHistoricalPatient(innate,phase4);
  if(phase2&&phase4){phase2=structuredClone(phase2);for(const person of phase2.persons){const assigned=phase4.offices.find(office=>office.holderId===person.id);if(assigned)person.office=assigned.title;else if(phase4.offices.some(office=>office.title===person.office))person.office='白身';}}
  if (phase2 && turn % 5 === 0) {
    const summary = summaries.at(-1)!;
    summary.text += `；成長記錄 ${phase2.practiceLog.length} 項、持續傷勢 ${phase2.injuries.filter((injury) => injury.active).length} 項、關係人物 ${phase2.relationships.length} 位`;
  }
  return {
    ...state, schemaVersion: event.version >= PHASE2_ENGINE_VERSION ? event.version : state.schemaVersion, engineVersion: event.version >= PHASE2_ENGINE_VERSION ? event.version : state.engineVersion, status: turn === turnLimit ? 'complete' : 'playing', turn, revision: event.revision,
    character, world: { ...state.world, year, month, eventCount: state.world.eventCount + 1 }, trend,
    historicalNodes: node ? [...state.historicalNodes, node] : state.historicalNodes,
    backend: { personnelChecks: state.backend.personnelChecks + 1, talentChecks: state.backend.talentChecks + 1, historyChecks: state.backend.historyChecks + 1, trendChecks: state.backend.trendChecks + 1, personnel: personnel.messages.length ? personnel.messages : state.backend.personnel, talents: talent.names },
    accounts, ledger, actions, summaries, appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash }, ...(phase2 ? { phase2 } : {}), ...(innate ? { innate } : {}), ...(phase4?{phase4}:{}),
  };
}
export function makeSummary(turn: number, c: Character, world: World, actions: ActionRecord[], ledger: LedgerEntry[]): Summary {
  const period = actions.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => `${entry.turn}回合:${entry.title}`).join('、');
  const kind = turn % 10 === 0 ? '大記' : '小記';
  const finance = ledger.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => entry.memo).join('；');
  return { turn, kind, text: `第 ${turn} 回合${kind}（${world.year}年）：${c.name}生於${c.home}，現年 ${c.age} 歲、私錢 ${c.money}；本段行動：${period || '無'}；帳務：${finance || '無資產異動'}。` };
}
export const ACTION_PLAN_EFFORT_BUDGET = 2;
const ACTION_EFFORT: Record<Intent, number> = { '耕讀自持':1, '訪求人才':2, '經商營生':1, '遊歷鄉里':2 };
export const ACTION_DURATION_DAYS: Record<Intent,number> = {'耕讀自持':30,'訪求人才':7,'經商營生':10,'遊歷鄉里':14};
function plannedTimeline(state:GameState,intents:Intent[]):{executedIntents:Intent[];elapsedDays:number;interruptions:string[];interruptedIntent?:Intent}{
 let timeline=state.phase4;const executedIntents:Intent[]=[];let elapsedDays=0;const interruptions:string[]=[];
 for(let index=0;index<intents.length;index++){
  const intent=intents[index],days=ACTION_DURATION_DAYS[intent];let actionEvent:string|undefined;
  for(let day=0;day<days;day++){
   if(!timeline){elapsedDays++;continue;}
   const before=timeline.eventLedger.length;timeline=advancePhase4(timeline,1);elapsedDays++;
   const newEvents=timeline.eventLedger.slice(before),deathWindow=newEvents.find(e=>e.type==='死亡硬節點觸發');
   if(deathWindow){interruptions.push(`${deathWindow.type}：${deathWindow.detail}`);return{executedIntents,elapsedDays,interruptions,interruptedIntent:intent};}
   const major=newEvents.find(e=>['史實事件形成','史實事件取消','死亡硬節點落實'].includes(e.type));if(major)actionEvent??=`${major.type}：${major.detail}`;
  }
  executedIntents.push(intent);
  if(actionEvent){interruptions.push(actionEvent);return{executedIntents,elapsedDays,interruptions,...(intents[index+1]?{interruptedIntent:intents[index+1]}:{})};}
 }
 return {executedIntents,elapsedDays,interruptions};
}
export function inspectActionPlan(intents: Intent[]): { effort: number; conflicts: string[] } {
  const conflicts: string[] = [];
  if (new Set(intents).size !== intents.length) conflicts.push('同一行動重複勾選，請移除重複項目。');
  const effort = intents.reduce((sum, intent) => sum + (ACTION_EFFORT[intent] ?? 99), 0);
  if (effort > ACTION_PLAN_EFFORT_BUDGET) conflicts.push(`本回合可用行動時間為 ${ACTION_PLAN_EFFORT_BUDGET} 點，所選行動需要 ${effort} 點；請調整計畫。`);
  if (intents.includes('遊歷鄉里') && intents.some((intent) => intent !== '遊歷鄉里')) conflicts.push('遊歷鄉里會離開家宅；與同回合留在家宅耕讀或市集營生有地點衝突。');
  if (intents.includes('訪求人才') && intents.includes('遊歷鄉里')) conflicts.push('訪求人才與遊歷鄉里都需要外出安排，無法在此示例的一回合內保證行程相容。');
  return { effort, conflicts:[...new Set(conflicts)] };
}
export function dispatch(state: GameState | null, command: GameCommand): { state: GameState | null; event: GameEvent | null; duplicate: boolean } {
  if (command.version !== ENGINE_VERSION) throw new Error(`不支援的命令版本：${command.version}`);
  const known = state?.appliedCommands[command.commandId];
  if (known) {
    const expected = fingerprint(command);
    if (known === expected) return { state, event: null, duplicate: true };
    throw new Error('commandId 已用於不同命令');
  }
  if (command.type === 'Continue') {
    if (!state || command.worldlineId !== state.worldlineId) throw new Error('目前沒有可繼續的世界線');
    if (command.expectedRevision !== state.revision) throw new Error('狀態版本已更新，請重新檢視');
    // Continue only closes the current narrative pause; it neither advances time nor accepts any pending decision.
    return { state, event: null, duplicate: false };
  }
  if (command.type === 'RecordActionNote') {
    if (!state || command.worldlineId !== state.worldlineId || command.expectedRevision !== state.revision) throw new Error('補充說明所屬世界線或版本已變更');
    if (!command.text.trim()) throw new Error('補充說明不可為空白');
    const event: GameEvent = { version:ENGINE_VERSION, eventId:`${state.worldlineId}:${state.revision+1}`, commandId:command.commandId, commandHash:fingerprint(command), revision:state.revision+1, type:'ActionNoteRecorded', payload:{text:command.text.trim()} };
    return { state:applyEvent(state,event), event, duplicate:false };
  }
  if (command.type === 'StartGame') {
    if (state) throw new Error('請先切換到新世界線');
    if (command.expectedRevision !== 0) throw new Error('新局版本必須從零開始');
    const event = createStartEvent(command);
    return { state: applyEvent(null, event), event, duplicate: false };
  }
  if (!state || command.worldlineId !== state.worldlineId) throw new Error('命令世界線不符');
  if (command.expectedRevision !== state.revision) throw new Error('狀態版本已更新，請重新檢視');
  if (command.type === 'Phase2Action') {
    if (!state.phase2) throw new Error('此世界線尚未完成第二階段存檔遷移');
    const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'Phase2Changed', payload: { action: command.action } };
    return { state: applyEvent(state, event), event, duplicate: false };
  }
  if (command.type === 'InnateAction') {
    if (!state.innate || !state.phase2) throw new Error('此存檔尚未升級天生技系統');
    const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'InnateChanged', payload: { action: command.action } };
    return { state: applyEvent(state,event), event, duplicate:false };
  }
  if (command.type === 'Phase4Action') {
    if(!state.phase4||!state.phase2)throw new Error('此存檔尚未升級第四階段');
    const event:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'Phase4Changed',payload:{action:command.action}};
    return {state:applyEvent(state,event),event,duplicate:false};
  }
  if(command.type==='SubmitLifePlan'){
    const plan=inspectLifePlan(state,command.choiceIds,command.paceDays);if(plan.errors.length)throw new Error(plan.errors.join(' '));
    if(state.character.age>=15){
      const intents=plan.choices.map(c=>c.intent!);const errors=inspectActionPlan(intents).conflicts;if(errors.length)throw new Error(errors.join(' '));
      const event:GameEvent={version:5,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'ActionPlanResolved',payload:{intents,supplement:command.supplement,...plannedTimeline(state,intents)}};
      return{state:applyEvent(state,event),event,duplicate:false};
    }
    const event:GameEvent={version:5,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'LifePlanResolved',payload:{policyVersion:1,choiceIds:[...command.choiceIds],supplement:command.supplement,...(command.paceDays!==undefined?{paceDays:command.paceDays}:{})}};
    return{state:applyEvent(state,event),event,duplicate:false};
  }
  if (command.type === 'SubmitActionPlan') {
    if (!command.intents.length) throw new Error('行動計畫至少須勾選一項行動');
    const plan = inspectActionPlan(command.intents);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join(' '));
    const schedule=plannedTimeline(state,command.intents);
    const event: GameEvent = { version:ENGINE_VERSION, eventId:`${state.worldlineId}:${state.revision+1}`, commandId:command.commandId, commandHash:fingerprint(command), revision:state.revision+1, type:'ActionPlanResolved', payload:{intents:[...command.intents],supplement:command.supplement,...schedule,...(command.freeTextActions?{freeTextActions:command.freeTextActions}:{})} };
    return { state:applyEvent(state,event), event, duplicate:false };
  }
  if (!INTENTS.includes(command.intent)) throw new Error('無效的生活意圖');
  const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'IntentResolved', payload: { intent: command.intent } };
  return { state: applyEvent(state, event), event, duplicate: false };
}
export function replay(events: GameEvent[]): GameState | null { return events.reduce<GameState | null>((state, event) => applyEvent(state, event), null); }
