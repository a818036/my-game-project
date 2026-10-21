import { applyAccountEntry, openingEntry, type AccountBook, type AccountEntry } from './ledger';
import { developTalent, historicalNodeAt, resolvePersonnel, runPersonnelEngine, runTalentEngine, trendForTurn } from './systems';

export const ENGINE_VERSION = 1;
export const RULES_VERSION = '3.15';
export const SKILLS_VERSION = '1.10';
export const SOURCE_HASHES = {
  rules: 'c30b9b1e64bfff24f2827f0a0f791f667edc5a4686cd520c8529af746d4f48a4',
  skills: 'd1d9ee7687b5bcb6ab1e4899e0d2ac62c22ee34bcd72900df78e4cb436cc7a80',
} as const;
export const MAX_TURNS = 20;
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
  profile: { rules: typeof RULES_VERSION; skills: typeof SKILLS_VERSION; modernMemory: true; expertise: readonly string[]; personality: readonly string[]; abilitiesStatus: 'catalogued-not-implemented' };
  money: number; reputation: number; contacts: string[];
}
export interface World { seed: number; worldlineId: string; year: number; month: number; eventCount: number; }
export interface LedgerEntry extends AccountEntry { turn: number; }
export interface ActionRecord { turn: number; intent: Intent; title: string; details: string; }
export interface Summary { turn: number; kind: '小記'|'大記'; text: string; }
export interface PendingDecision { id: string; kind: string; }
export interface GameState {
  schemaVersion: number; engineVersion: number; rulesVersion: string; skillsVersion: string; sourceHashes: typeof SOURCE_HASHES;
  status: 'playing'|'complete'; turn: number; revision: number; worldlineId: string; character: Character; world: World;
  trend: string; historicalNodes: string[]; backend: { personnelChecks: number; talentChecks: number; historyChecks: number; trendChecks: number; personnel: string[]; talents: string[] };
  accounts: AccountBook; ledger: LedgerEntry[]; actions: ActionRecord[]; summaries: Summary[]; pendingDecisions: PendingDecision[]; appliedCommands: Record<string, string>;
}
export type GameEvent =
  | { version: number; eventId: string; commandId: string; commandHash: string; revision: number; type: 'WorldCreated'; payload: { worldlineId: string; name: string; seed: number; facts: OpeningFacts } }
  | { version: number; eventId: string; commandId: string; commandHash: string; revision: number; type: 'IntentResolved'; payload: { intent: Intent } };
export type GameCommand =
  | { version: number; commandId: string; expectedRevision: number; type: 'StartGame'; name: string; seed: number; facts: OpeningFacts }
  | { version: number; commandId: string; expectedRevision: number; worldlineId: string; type: 'ChooseIntent'; intent: Intent }
  | { version: number; commandId: string; expectedRevision: number; worldlineId: string; type: 'Continue' };

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
  return { version: ENGINE_VERSION, eventId: `${worldlineId}:1`, commandId: command.commandId, commandHash: fingerprint(command), revision: 1, type: 'WorldCreated', payload: { worldlineId, name: command.name.trim(), seed: command.seed >>> 0, facts: command.facts } };
}
function fingerprint(command: GameCommand): string {
  return JSON.stringify(command.type === 'StartGame'
    ? { type: command.type, name: command.name.trim(), seed: command.seed >>> 0, facts: command.facts, expectedRevision: command.expectedRevision }
    : { type: command.type, worldlineId: command.worldlineId, intent: command.type === 'ChooseIntent' ? command.intent : null, expectedRevision: command.expectedRevision });
}
export function applyEvent(state: GameState | null, event: GameEvent): GameState {
  if (event.version !== ENGINE_VERSION) throw new Error(`不支援的事件版本：${event.version}`);
  if (event.type === 'WorldCreated') {
    if (state) {
      const existing = state.appliedCommands[event.commandId];
      if (existing === event.commandHash) return state;
      throw new Error('世界線建立事件只能是事件流第一筆');
    }
    const { facts, name, worldlineId, seed } = event.payload;
    if (!name.trim() || !Number.isInteger(facts.birthYear) || facts.birthYear < 160 || facts.birthYear > 184 || !Number.isInteger(seed) || !REGIONS.includes(facts.birthRegion as typeof REGIONS[number])) throw new Error('開局資料無效');
    const newState: GameState = {
      schemaVersion: 1, engineVersion: ENGINE_VERSION, rulesVersion: RULES_VERSION, skillsVersion: SKILLS_VERSION, sourceHashes: SOURCE_HASHES,
      status: 'playing', turn: 0, revision: 1, worldlineId, character: {
        name, birthYear: facts.birthYear, age: 0, home: facts.birthRegion, surname: facts.surname, family: facts.family,
        background: facts.background, health: facts.health, potential: facts.potential, growth: { study: 0, practice: 0, social: 0 },
        profile: { rules: RULES_VERSION, skills: SKILLS_VERSION, modernMemory: true, expertise: modernExpertise, personality, abilitiesStatus: 'catalogued-not-implemented' },
        money: 12, reputation: 0, contacts: [],
      },
      world: { seed, worldlineId, year: facts.birthYear, month: 1, eventCount: 0 }, trend: '新生於鄉里，天下仍在自行運轉。', historicalNodes: [],
      backend: { personnelChecks: 0, talentChecks: 0, historyChecks: 0, trendChecks: 0, personnel: ['縣亭佐吏・示例人物（待地方考課）'], talents: [] },
      accounts: { private: 12, family: 0, public: 0, military: 0, sovereign: 0 }, ledger: [openingEntry(worldlineId, facts.birthYear)], actions: [], summaries: [], pendingDecisions: [], appliedCommands: { [event.commandId]: event.commandHash },
    };
    return newState;
  }
  if (!state) throw new Error('事件流缺少世界線建立事件');
  if (state.appliedCommands[event.commandId]) {
    if (state.appliedCommands[event.commandId] === event.commandHash) return state;
    throw new Error('事件 commandId 重複但內容不一致');
  }
  if (event.revision !== state.revision + 1) throw new Error('事件版本序列不連續');
  if (state.status === 'complete' || state.turn >= MAX_TURNS) throw new Error('二十回合旅程已結束');
  const { intent } = event.payload;
  if (!INTENTS.includes(intent) || !event.eventId.startsWith(`${state.worldlineId}:`)) throw new Error('回合事件無效或屬於其他世界線');
  const turn = state.turn + 1, roll = random(state.world.seed, turn * 7 + INTENTS.indexOf(intent));
  let moneyDelta = 0, reputationDelta = 0, title = '', details = '';
  let character = { ...state.character, growth: { ...state.character.growth }, contacts: [...state.character.contacts] };
  switch (intent) {
    case '耕讀自持': character.growth.study += 1; title = '田畝與書卷'; details = `在${character.home}整理薄田、溫習經書，累積一段學習與家計經驗。`; moneyDelta = roll > .82 ? 4 : 2; break;
    case '訪求人才': { const result = resolvePersonnel(character, state.world.seed, turn, roll); character = result.character; reputationDelta = result.reputationDelta; title = result.title; details = result.details; break; }
    case '經商營生': character.growth.practice += 1; title = '市集營生'; moneyDelta = roll > .24 ? 5 : -2; details = moneyDelta > 0 ? `售出土產，收入錢 ${moneyDelta}。` : `貨物折損，支出錢 ${Math.min(2, character.money)}。`; moneyDelta = Math.max(-character.money, moneyDelta); break;
    case '遊歷鄉里': character.growth.social += 1; moneyDelta = character.money > 0 ? -1 : 0; reputationDelta = roll > .48 ? 1 : 0; title = '行走鄉里'; details = `探訪周邊村落並聽取地方消息。${moneyDelta ? '支出旅費錢 1。' : '盤纏不足，改在近處步行。'}${reputationDelta ? ' 熱心助人，鄉里聲望略升。' : ''}`; break;
  }
  character.money += moneyDelta; character.reputation += reputationDelta;
  character = developTalent(character, intent, roll);
  const year = state.world.year + (turn % 4 === 0 ? 1 : 0), month = ((turn * 3) % 12) + 1;
  character.age = year - character.birthYear;
  const personnel = runPersonnelEngine(state.backend.personnel, turn);
  const talent = runTalentEngine(state.backend.talents, state.world.seed, turn);
  const node = historicalNodeAt(turn), trend = trendForTurn(state.world.seed, turn);
  const entry = moneyDelta === 0 ? null : applyAccountEntry(state.accounts, {
    id: event.eventId, eventId: event.eventId, turn, asset: '錢', amount: Math.abs(moneyDelta),
    from: moneyDelta > 0 ? 'market' : 'private', to: moneyDelta > 0 ? 'private' : 'market', memo: `${title}｜${details}`,
  });
  const ledger = entry ? [...state.ledger, entry.entry] : state.ledger;
  const accounts = entry?.accounts ?? state.accounts;
  const actions = [...state.actions, { turn, intent, title, details }];
  const summaries = turn % 5 === 0 ? [...state.summaries, makeSummary(turn, character, state.world, actions, ledger)] : state.summaries;
  return {
    ...state, status: turn === MAX_TURNS ? 'complete' : 'playing', turn, revision: event.revision,
    character, world: { ...state.world, year, month, eventCount: state.world.eventCount + 1 }, trend,
    historicalNodes: node ? [...state.historicalNodes, node] : state.historicalNodes,
    backend: { personnelChecks: state.backend.personnelChecks + 1, talentChecks: state.backend.talentChecks + 1, historyChecks: state.backend.historyChecks + 1, trendChecks: state.backend.trendChecks + 1, personnel: personnel.messages.length ? personnel.messages : state.backend.personnel, talents: talent.names },
    accounts, ledger, actions, summaries, appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash },
  };
}
export function makeSummary(turn: number, c: Character, world: World, actions: ActionRecord[], ledger: LedgerEntry[]): Summary {
  const period = actions.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => `${entry.turn}回合:${entry.title}`).join('、');
  const kind = turn % 10 === 0 ? '大記' : '小記';
  const finance = ledger.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => entry.memo).join('；');
  return { turn, kind, text: `第 ${turn} 回合${kind}（${world.year}年）：${c.name}生於${c.home}，現年 ${c.age} 歲、私錢 ${c.money}；本段行動：${period || '無'}；帳務：${finance || '無資產異動'}。` };
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
  if (command.type === 'StartGame') {
    if (state) throw new Error('請先切換到新世界線');
    if (command.expectedRevision !== 0) throw new Error('新局版本必須從零開始');
    const event = createStartEvent(command);
    return { state: applyEvent(null, event), event, duplicate: false };
  }
  if (!state || command.worldlineId !== state.worldlineId) throw new Error('命令世界線不符');
  if (command.expectedRevision !== state.revision) throw new Error('狀態版本已更新，請重新檢視');
  if (!INTENTS.includes(command.intent)) throw new Error('無效的生活意圖');
  const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'IntentResolved', payload: { intent: command.intent } };
  return { state: applyEvent(state, event), event, duplicate: false };
}
export function replay(events: GameEvent[]): GameState | null { return events.reduce<GameState | null>((state, event) => applyEvent(state, event), null); }
