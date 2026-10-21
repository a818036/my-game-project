export const STAT_NAMES = ['統率', '武力', '智力', '政治', '魅力'] as const;
export type StatName = typeof STAT_NAMES[number];
export type RelationshipKind = '血親父母' | '血親子女' | '血親手足' | '收養父母' | '收養子女' | '婚姻';
export type RelationAxis = 'trust' | 'loyalty' | 'fear';
export type AssetName = '錢' | '糧' | '貨物' | '馬匹' | '書籍';
export type AccountName = 'private' | 'family' | 'public' | 'military' | 'sovereign';

export interface Phase2Person {
  id: string; name: string; role: string; birthYear: number; deathYear: number | null;
  alive: boolean; office: string; gender: string; deathCause?: string;
}
export interface KinEdge { id: string; from: string; to: string; kind: 'parent' | 'adoptive-parent' | 'spouse' | 'sibling' | 'mentor'; }
export interface RelationshipRecord {
  personId: string; trust: number; loyalty: number; fear: number;
  grievances: Array<{ id: string; turn: number; text: string }>;
}
export interface CoreSkill { id: string; name: string; rank: '初階' | '進階' | '極階'; practice: number; }
export interface Injury { id: string; label: string; severity: '輕' | '中' | '重'; startedTurn: number; elapsedTurns: number; active: boolean; elapsedDays?:number; }
export interface Message { id: string; recipientId: string; channel: '軒轅傳音示例' | '書信'; sentTurn: number; arrivalTurn: number; text: string; arrived: boolean; }
export interface Speech { speakerId: string; name: string; label: string; text: string; firstSpeech: boolean; }
export interface SceneRecord { turn: number; location: string; presentIds: string[]; enteredIds: string[]; leftIds: string[]; speeches: Speech[]; }
export interface NameRequest { id: string; relation: RelationshipKind; role: string; birthYear: number; anchorId: string; }
export interface Observation { id: string; witnessId: string; turn: number; observation: string; known: string[]; unknown: string[]; }
export interface Phase2Model {
  version: 2;
  persons: Phase2Person[]; kin: KinEdge[]; relationships: RelationshipRecord[];
  age: number; potential: Record<StatName, number>; stats: Record<StatName, number> | null; overrideRecords: string[]; coreSkills: CoreSkill[]; innateAbilities: string[];
  practiceLog: Array<{ turn: number; focus: string; note: string }>;
  assetBalances: Record<AssetName, Record<AccountName, number>>;
  assetLedger: Array<{ id: string; turn: number; asset: AssetName; amount: number; from: AccountName | 'market'; to: AccountName | 'market'; memo: string }>;
  items: Array<{ id: string; item: string; quantity: number; ownerId: string; custodianId: string; locationId: string }>;
  injuries: Injury[]; messages: Message[]; scene: SceneRecord;
  worldUpdates: string[]; pendingNames: NameRequest[]; observations: Observation[];
}

export type Phase2Action =
  | { type: 'RequestName'; request: NameRequest }
  | { type: 'ChooseName'; requestId: string; personId: string; name: string }
  | { type: 'MarkDeath'; personId: string; deathYear: number }
  | { type: 'AdjustRelation'; personId: string; axis: RelationAxis; delta: number; reason: string; turn: number }
  | { type: 'RecordGrievance'; personId: string; text: string; turn: number }
  | { type: 'PracticeSkill'; skillId: string; name: string; turn: number }
  | { type: 'TrainStat'; stat: StatName; turn: number }
  | { type: 'InitializeAdultStats' }
  | { type: 'TransferAsset'; asset: AssetName; amount: number; from: AccountName | 'market'; to: AccountName | 'market'; memo: string; turn: number; id: string }
  | { type: 'RecalculateMoneyAccounts' }
  | { type: 'ChangeCustody'; itemId: string; custodianId: string; locationId: string }
  | { type: 'SendMessage'; id: string; recipientId: string; channel: Message['channel']; text: string; turn: number }
  | { type: 'AddInjury'; injury: Injury }
  | { type: 'TreatInjury'; injuryId: string }
  | { type: 'RecordObservation'; observation: Observation };

const accounts: AccountName[] = ['private', 'family', 'public', 'military', 'sovereign'];
function blankBalances(): Phase2Model['assetBalances'] {
  const record = () => Object.fromEntries(accounts.map((account) => [account, 0])) as Record<AccountName, number>;
  return { 錢: record(), 糧: record(), 貨物: record(), 馬匹: record(), 書籍: record() };
}

export function createPhase2Model(protagonistName: string, birthYear: number, family: Array<{ role: string; name: string; status: string }>, potential: Record<StatName, number>): Phase2Model {
  const persons: Phase2Person[] = [{ id: 'protagonist', name: protagonistName, role: '主角', birthYear, deathYear: null, alive: true, office: '白身', gender: '未設定' }];
  const kin: KinEdge[] = [];
  family.forEach((entry, index) => {
    if (entry.role === '兄弟姊妹狀態') return;
    const id = `opening-family-${index}`;
    const isGrand = entry.role.startsWith('祖父');
    const person: Phase2Person = { id, name: entry.name, role: entry.role, birthYear: birthYear - (isGrand ? 45 : 25), deathYear: entry.status === '已故' ? birthYear - 1 : null, alive: entry.status !== '已故', office: '白身', gender: entry.role.startsWith('母') || entry.role.includes('祖母') ? '女' : '未設定' };
    persons.push(person);
    if (entry.role === '父親') kin.push({ id: `kin-${id}`, from: id, to: 'protagonist', kind: 'parent' });
    else if (entry.role.startsWith('祖父')) kin.push({ id: `kin-${id}`, from: id, to: 'opening-family-0', kind: 'parent' });
    else if (entry.role === '母親（內名）') kin.push({ id: `kin-${id}`, from: id, to: 'protagonist', kind: 'parent' });
    else kin.push({ id: `kin-${id}`, from: 'protagonist', to: id, kind: entry.role.includes('師長') ? 'mentor' : 'sibling' });
  });
  persons.push({ id: 'example-clerk', name: '縣亭佐吏・示例人物', role: '縣亭佐吏・示例人物', birthYear: birthYear - 40, deathYear: null, alive: true, office: '縣亭佐吏', gender: '男' });
  const relationships = persons.filter((person) => person.id !== 'protagonist').map((person) => ({ personId: person.id, trust: 50, loyalty: 50, fear: 0, grievances: [] }));
  const assetBalances = blankBalances(); assetBalances.錢.private = 12; assetBalances.糧.family = 20; assetBalances.書籍.family = 3;
  const assetLedger: Phase2Model['assetLedger'] = [
    { id:'opening-money', turn:0, asset:'錢', amount:12, from:'market', to:'private', memo:'開局私帳示例資產' },
    { id:'opening-grain', turn:0, asset:'糧', amount:20, from:'market', to:'family', memo:'開局家中存糧示例' },
    { id:'opening-books', turn:0, asset:'書籍', amount:3, from:'market', to:'family', memo:'開局家中藏書示例' },
  ];
  const father = persons.find((person) => person.role === '父親');
  const items = father ? [{ id: 'family-ledger', item: '家中帳簿（示例）', quantity: 1, ownerId: father.id, custodianId: father.id, locationId: '家宅' }] : [];
  return { version: 2, persons, kin, relationships, age: 0, potential: structuredClone(potential), stats: null, overrideRecords: [], coreSkills: [], innateAbilities: [], practiceLog: [], assetBalances, assetLedger, items, injuries: [], messages: [], scene: { turn: 0, location: '家宅・庭院', presentIds: ['protagonist', ...persons.filter((person) => person.id !== 'protagonist' && person.alive).slice(0, 2).map((person) => person.id)], enteredIds: [], leftIds: [], speeches: [] }, worldUpdates: [], pendingNames: [], observations: [] };
}

export function kinshipPath(model: Phase2Model, fromId: string, toId: string): KinEdge[] | null {
  const adjacency = new Map<string, Array<{ id: string; next: string; kind: KinEdge['kind'] }>>();
  for (const edge of model.kin) {
    const forward = adjacency.get(edge.from) ?? []; forward.push({ id: edge.id, next: edge.to, kind: edge.kind }); adjacency.set(edge.from, forward);
    const reverse = adjacency.get(edge.to) ?? []; reverse.push({ id: edge.id, next: edge.from, kind: edge.kind }); adjacency.set(edge.to, reverse);
  }
  const queue: Array<{ id: string; path: KinEdge[] }> = [{ id: fromId, path: [] }]; const visited = new Set([fromId]);
  while (queue.length) {
    const current = queue.shift()!; if (current.id === toId) return current.path;
    for (const step of adjacency.get(current.id) ?? []) if (!visited.has(step.next)) { visited.add(step.next); queue.push({ id: step.next, path: [...current.path, { id: step.id, from: current.id, to: step.next, kind: step.kind }] }); }
  }
  return null;
}

export function kinshipTerm(model: Phase2Model, personId: string): string {
  const person = model.persons.find((entry) => entry.id === personId); if (!person) return '關係未建立';
  if (personId === 'protagonist') return '本人';
  const path = kinshipPath(model, 'protagonist', personId); if (!path) return '未連結親族';
  if (path.some((edge) => edge.kind === 'spouse')) return '配偶／姻親';
  if (path.some((edge) => edge.kind === 'adoptive-parent')) {
    const edge = model.kin.find((entry) => entry.kind === 'adoptive-parent' && ((entry.from === 'protagonist' && entry.to === personId) || (entry.to === 'protagonist' && entry.from === personId)));
    return edge?.from === personId ? '養親' : '養子女';
  }
  const ancestors = (id: string) => {
    const result = new Map<string, number>([[id, 0]]); let frontier = [id];
    for (let depth = 1; depth <= 8; depth++) {
      const next: string[] = [];
      for (const child of frontier) for (const edge of model.kin) if ((edge.kind === 'parent' || edge.kind === 'adoptive-parent') && edge.to === child && !result.has(edge.from)) { result.set(edge.from, depth); next.push(edge.from); }
      frontier = next;
    }
    return result;
  };
  const mainAncestors = ancestors('protagonist'), otherAncestors = ancestors(personId);
  const common = [...mainAncestors.keys()].filter((id) => otherAncestors.has(id)).sort((a, b) => (mainAncestors.get(a)! + otherAncestors.get(a)!) - (mainAncestors.get(b)! + otherAncestors.get(b)!));
  if (common.length) {
    const ancestor = common[0], mainGap = mainAncestors.get(ancestor)!, otherGap = otherAncestors.get(ancestor)!;
    if (mainGap === 0 && otherGap === 1) return person.gender === '女' ? '女兒' : '子女';
    if (mainGap === 1 && otherGap === 0) return person.gender === '女' ? '母親' : '父親';
    if (mainGap === 0 && otherGap === 2) return '孫輩';
    if (mainGap === 2 && otherGap === 0) return '祖輩';
    if (mainGap === 1 && otherGap === 1) return '兄弟姊妹';
    if (mainGap === 1 && otherGap === 2) return '姪／甥輩';
    if (mainGap === 2 && otherGap === 1) return '伯叔姑舅輩';
    if (mainGap === otherGap) return '同輩宗親';
    return mainGap > otherGap ? '長輩宗親' : '晚輩宗親';
  }
  if (person.role === '父親') return '父親'; if (person.role.startsWith('母')) return '母親';
  if (person.role.includes('子女')) return '子女'; if (person.role.includes('手足')) return '手足';
  if (person.role.includes('長輩')) return '宗族長輩'; if (person.role.includes('師長')) return '師長';
  return '親族';
}

export function validateStatValue(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('一般五維範圍為 1 至 100');
  return value;
}

export function applyPhase2Action(model: Phase2Model, action: Phase2Action): Phase2Model {
  const next = structuredClone(model);
  switch (action.type) {
    case 'RequestName':
      if (!action.request.role.trim() || next.pendingNames.some((request) => request.id === action.request.id)) throw new Error('命名請求無效');
      next.pendingNames.push(action.request); return next;
    case 'ChooseName': {
      const request = next.pendingNames.find((entry) => entry.id === action.requestId); if (!request || !action.name.trim()) throw new Error('請選擇待命名事項並輸入姓名');
      if (next.persons.some((person) => person.id === action.personId || person.name === action.name.trim())) throw new Error('人物 ID 或姓名已存在');
      const person: Phase2Person = { id: action.personId, name: action.name.trim(), role: request.role, birthYear: request.birthYear, deathYear: null, alive: true, office: '白身', gender: '未設定' };
      next.persons.push(person);
      const kind = request.relation.includes('收養') ? 'adoptive-parent' : request.relation === '婚姻' ? 'spouse' : request.relation === '血親手足' ? 'sibling' : 'parent';
      if (request.relation === '血親手足') {
        const parents = next.kin.filter((edge) => edge.kind === 'parent' && edge.to === request.anchorId);
        if (parents.length) parents.forEach((edge, index) => next.kin.push({ id: `kin-${action.personId}-${index}`, from: edge.from, to: person.id, kind: 'parent' }));
        else next.kin.push({ id: `kin-${action.personId}`, from: request.anchorId, to: person.id, kind: 'sibling' });
      } else {
        const from = ['血親父母', '收養父母'].includes(request.relation) ? person.id : request.anchorId;
        const to = from === person.id ? request.anchorId : person.id;
        next.kin.push({ id: `kin-${action.personId}`, from, to, kind });
      }
      next.relationships.push({ personId: person.id, trust: 50, loyalty: 50, fear: 0, grievances: [] });
      next.pendingNames = next.pendingNames.filter((entry) => entry.id !== request.id); return next;
    }
    case 'MarkDeath': {
      const person = next.persons.find((entry) => entry.id === action.personId); if (!person || !person.alive || action.deathYear < person.birthYear) throw new Error('死亡紀錄無效');
      person.alive = false; person.deathYear = action.deathYear; next.scene.presentIds = next.scene.presentIds.filter((id) => id !== person.id); return next;
    }
    case 'AdjustRelation': {
      if (!Number.isInteger(action.delta) || action.delta === 0 || Math.abs(action.delta) > 10 || !action.reason.trim()) throw new Error('關係變化紀錄無效');
      const relation = next.relationships.find((entry) => entry.personId === action.personId); if (!relation) throw new Error('找不到關係人物');
      relation[action.axis] = Math.max(0, Math.min(100, relation[action.axis] + action.delta));
      next.practiceLog.push({ turn: action.turn, focus: `關係：${action.axis}`, note: action.reason.trim() }); return next;
    }
    case 'RecordGrievance': {
      const relation = next.relationships.find((entry) => entry.personId === action.personId); if (!relation || !action.text.trim()) throw new Error('恩怨紀錄無效');
      relation.grievances.push({ id: `grievance-${action.turn}-${relation.personId}-${relation.grievances.length}`, turn: action.turn, text: action.text.trim() }); return next;
    }
    case 'PracticeSkill': {
      let skill = next.coreSkills.find((entry) => entry.id === action.skillId);
      if (!skill && next.coreSkills.length >= 5) throw new Error('普通核心技能最多五項');
      if (!skill) { skill = { id: action.skillId, name: action.name.trim(), rank: '初階', practice: 0 }; if (!skill.name) throw new Error('技能名稱不可空白'); next.coreSkills.push(skill); }
      skill.practice += 1; next.practiceLog.push({ turn: action.turn, focus: skill.name, note: '完成一次實務／學習記錄；技能階位不因單次練習自動提升。' }); return next;
    }
    case 'TrainStat': {
      if (!next.stats) throw new Error('主角仍在童年階段；目前記錄潛力與成長經驗，不生成成熟五維');
      next.stats[action.stat] = validateStatValue(next.stats[action.stat] + 1); next.practiceLog.push({ turn: action.turn, focus: action.stat, note: '一次相符訓練，五維微幅成長。' }); return next;
    }
    case 'InitializeAdultStats': {
      if (next.age < 15) throw new Error('原型評估需年滿十五歲；幼年只記錄潛力與成長');
      if (next.stats) throw new Error('成年五維已建立');
      next.stats = structuredClone(next.potential);
      next.overrideRecords.push('prototype-stat-baseline-v1：原文未定成年評估公式；此原型以潛力作明示的測試起值，不代表原作者數值規則。');
      return next;
    }
    case 'TransferAsset': {
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.from === action.to || !action.memo.trim()) throw new Error('收支資料無效');
      const balances = next.assetBalances[action.asset];
      if (action.from !== 'market') { if (balances[action.from] < action.amount) throw new Error('來源帳戶資產不足'); balances[action.from] -= action.amount; }
      if (action.to !== 'market') balances[action.to] += action.amount;
      next.assetLedger.push({ id: action.id, turn: action.turn, asset: action.asset, amount: action.amount, from: action.from, to: action.to, memo: action.memo.trim() }); return next;
    }
    case 'RecalculateMoneyAccounts': return next;
    case 'ChangeCustody': {
      const item = next.items.find((entry) => entry.id === action.itemId); if (!item || !action.custodianId.trim() || !action.locationId.trim()) throw new Error('物品保管資料無效');
      item.custodianId = action.custodianId.trim(); item.locationId = action.locationId.trim(); return next;
    }
    case 'SendMessage': {
      if (!next.persons.some((person) => person.id === action.recipientId && person.alive) || !action.text.trim()) throw new Error('收件人或訊息無效');
      const arrivalTurn = action.channel === '軒轅傳音示例' ? action.turn : action.turn + 2;
      next.messages.push({ id: action.id, recipientId: action.recipientId, channel: action.channel, sentTurn: action.turn, arrivalTurn, text: action.text.trim(), arrived: arrivalTurn <= action.turn }); return next;
    }
    case 'AddInjury': next.injuries.push(action.injury); return next;
    case 'TreatInjury': {
      const injury = next.injuries.find((entry) => entry.id === action.injuryId); if (!injury || !injury.active) throw new Error('找不到持續中的傷勢');
      injury.active = false; next.practiceLog.push({ turn: next.scene.turn, focus: '傷勢照護', note: `${injury.label}於玩家確認的處置後記為康復。` }); return next;
    }
    case 'RecordObservation': next.observations.push(action.observation); return next;
  }
}

export function advancePhase2(model: Phase2Model, turn: number, year: number, intent: string, privateMoney?: number, eventId?: string, elapsedDays?:number): Phase2Model {
  const next = structuredClone(model);
  next.age = Math.max(0, year - (next.persons.find((person) => person.id === 'protagonist')?.birthYear ?? year));
  if (privateMoney !== undefined && privateMoney !== next.assetBalances.錢.private) {
    const delta = privateMoney - next.assetBalances.錢.private;
    next.assetBalances.錢.private = privateMoney;
    next.assetLedger.push({ id:eventId ?? `round-${turn}-cash`, turn, asset:'錢', amount:Math.abs(delta), from:delta > 0 ? 'market' : 'private', to:delta > 0 ? 'private' : 'market', memo:`${intent}生活結算` });
  }
  next.injuries.forEach((injury) => { if (injury.active) { injury.elapsedTurns += 1; if(elapsedDays!==undefined)injury.elapsedDays=(injury.elapsedDays??0)+elapsedDays; } });
  next.messages.forEach((message) => { if (!message.arrived && message.arrivalTurn <= turn) message.arrived = true; });
  if (turn === 15) {
    const clerk = next.persons.find((person) => person.id === 'example-clerk' && person.alive);
    if (clerk) { clerk.alive = false; clerk.deathYear = year; clerk.deathCause = '示例病故'; }
    next.worldUpdates.push('地方人事示例：縣亭佐吏病故，職務出缺；外地文書流程仍持續，由署理者接辦。');
  }
  if (turn === 16 && !next.persons.some((person) => person.id === 'example-successor')) next.persons.push({ id: 'example-successor', name: '新任佐吏・示例人物', role: '地方官吏・示例人物', birthYear: year - 32, deathYear: null, alive: true, office: '縣亭佐吏', gender: '男' });
  const living = next.persons.filter((person) => person.alive && person.id !== 'protagonist');
  const guest = living[turn % Math.max(1, living.length)];
  const previous = new Set(next.scene.presentIds);
  const presentIds = ['protagonist', ...(guest ? [guest.id] : [])];
  const enteredIds = presentIds.filter((id) => !previous.has(id)); const leftIds = next.scene.presentIds.filter((id) => !presentIds.includes(id));
  const speeches: Speech[] = [];
  if (guest) {
    const age = Math.max(0, year - guest.birthYear); const label = `${guest.name}（${age}歲，${guest.office || '白身'}）`;
    speeches.push({ speakerId: guest.id, name: guest.name, label, text: `${intent}之際，${guest.role}來到場中，談及家事與地方近況。`, firstSpeech: true });
    speeches.push({ speakerId: guest.id, name: guest.name, label: guest.name, text: '他轉而談起近來市集物價。', firstSpeech: false });
  }
  next.scene = { turn, location: intent === '遊歷鄉里' ? '鄉亭市肆' : '家宅・庭院', presentIds, enteredIds, leftIds, speeches };
  next.worldUpdates.push(`第 ${turn} 回合外部後台檢查：人事空缺、人才與天下消息同步更新（示例）。`);
  if (turn === 16) next.worldUpdates.push('地方人事示例：新任佐吏抵達接任，文書與地方考課續行。');
  return next;
}

export function migrationPhase2State(protagonistName: string, birthYear: number, family: Array<{ role: string; name: string; status: string }>, potential: Record<StatName, number>, money: number, age: number): Phase2Model {
  const model = createPhase2Model(protagonistName, birthYear, family, potential);
  model.assetBalances.錢.private = money;
  model.assetLedger[0] = { ...model.assetLedger[0], amount: money, memo:'第一階段遷移時私帳結餘' };
  model.age = age;
  return model;
}
