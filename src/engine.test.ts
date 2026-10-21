import { describe, expect, it } from 'vitest';
import { createOpeningFacts, dispatch, ENGINE_VERSION, INTENTS, MAX_TURNS, replay, type GameCommand, type GameEvent, type GameState, type OpeningHistory } from './engine';
import { applyAccountEntry, placeInSubspace } from './ledger';
import { applyPhase2Action, advancePhase2, kinshipTerm, validateStatValue, type Phase2Action } from './phase2';

const noHistory: OpeningHistory = { regions: [], surnames: [] };
function start(commandId = 'start-a', seed = 987654, profile = noHistory) {
  const facts = createOpeningFacts(seed, 184, profile);
  const command: GameCommand = { version: ENGINE_VERSION, commandId, expectedRevision: 0, type: 'StartGame', name: `${facts.surname}景初`, seed, facts };
  const result = dispatch(null, command);
  if (!result.state || !result.event) throw new Error('test fixture start failed');
  return { state: result.state, event: result.event, command, facts };
}
function act(state: GameState, intent: typeof INTENTS[number], id = `cmd-${state.revision}`) {
  return dispatch(state, { version: ENGINE_VERSION, commandId: id, expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'ChooseIntent', intent });
}
function playTurns(id = 'start-a', pattern: readonly (typeof INTENTS[number])[] = INTENTS, count = MAX_TURNS) {
  const initial = start(id);
  let state = initial.state;
  const events: GameEvent[] = [initial.event];
  for (let i = 0; i < count; i++) {
    const result = act(state, pattern[i % pattern.length], `${id}-turn-${i + 1}`);
    if (!result.state || !result.event) throw new Error('test fixture turn failed');
    state = result.state; events.push(result.event);
  }
  return { state, events };
}
function phaseAction(state: GameState, action: Phase2Action, id = `phase-${state.revision}`) {
  return dispatch(state, { version:ENGINE_VERSION, commandId:id, expectedRevision:state.revision, worldlineId:state.worldlineId, type:'Phase2Action', action });
}
describe('ROADMAP 第一階段：正式驗收案例', () => {
  it('A01 相同種子與命令重播十回合，狀態、事件與 RNG 結果一致；不同意圖會產生不同狀態', () => {
    const a = playTurns('deterministic', INTENTS, 10); const b = playTurns('deterministic', INTENTS, 10);
    expect(a.events).toEqual(b.events); expect(a.state).toEqual(b.state); expect(replay(a.events)).toEqual(a.state);
    expect(a.state.turn).toBe(10);
    const alternate = playTurns('alternate', ['耕讀自持'], 10);
    expect(alternate.state.character.money).not.toBe(a.state.character.money);
    expect(alternate.state.actions).not.toEqual(a.state.actions);
  });

  it('A02 新局建立獨立世界線，舊世界線事件與存檔狀態仍可重播', () => {
    const old = playTurns('old-world'); const fresh = start('new-world', 555);
    expect(fresh.state.worldlineId).not.toBe(old.state.worldlineId);
    expect(fresh.state.character.contacts).toEqual([]); expect(fresh.state.actions).toEqual([]); expect(fresh.state.accounts).toEqual({ private: 12, family: 0, public: 0, military: 0, sovereign: 0 });
    expect(replay(old.events)).toEqual(old.state);
  });

  it('A03 出生地按 v3.15 30 類表且最近三次不重複；家族姓氏依近期紀錄去重；結果可先預覽且不換 seed', () => {
    const profile = { regions: ['司隸','豫州','兗州'], surnames: ['陳','劉','曹'] };
    const seed = 123456, facts = createOpeningFacts(seed, 184, profile), again = createOpeningFacts(seed, 184, profile);
    expect(facts).toEqual(again); expect(seed).toBe(123456);
    expect(facts.birthRegion).not.toBe('司隸'); expect(facts.birthRegion).not.toBe('豫州'); expect(facts.birthRegion).not.toBe('兗州');
    expect(facts.surname).not.toMatch(/^(陳|劉|曹)$/); expect(facts.rngTrace.length).toBeGreaterThan(0);
    expect(facts.family.filter((person) => person.role !== '兄弟姊妹狀態')).toHaveLength(5);
    expect(new Set(facts.family.filter((person) => person.role !== '兄弟姊妹狀態').map((person) => person.name)).size).toBe(5);
  });

  it('A04 同 commandId 重送只結算一次；過期 revision 會拒絕覆寫', () => {
    const initial = start('idempotency');
    const command: GameCommand = { version: ENGINE_VERSION, commandId: 'exact-click', expectedRevision: initial.state.revision, worldlineId: initial.state.worldlineId, type: 'ChooseIntent', intent: '遊歷鄉里' };
    const first = dispatch(initial.state, command); const duplicate = dispatch(first.state, command);
    expect(duplicate.duplicate).toBe(true); expect(duplicate.event).toBeNull(); expect(duplicate.state).toEqual(first.state);
    expect(first.state?.turn).toBe(1); expect(first.state?.ledger.filter((entry) => entry.eventId === first.event?.eventId)).toHaveLength(1);
    expect(() => dispatch(first.state, { ...command, commandId: 'stale-click' })).toThrow('狀態版本已更新');
    expect(() => dispatch(first.state, { ...command, intent: '經商營生' })).toThrow('commandId 已用於不同命令');
  });

  it('A07 每回合四引擎皆自動檢查；5／10／15／20 摘要節點正確且十回合不重複小記', () => {
    const { state } = playTurns('summaries', INTENTS, 20);
    expect(state.summaries.map(({ turn, kind }) => [turn, kind])).toEqual([[5,'小記'],[10,'大記'],[15,'小記'],[20,'大記']]);
    expect(state.actions).toHaveLength(20); expect(state.actions.every((action) => action.turn >= 1 && action.details.length > 0)).toBe(true);
    expect(state.backend).toMatchObject({ personnelChecks: 20, talentChecks: 20, historyChecks: 20, trendChecks: 20 });
    expect(state.trend.length).toBeGreaterThan(0); expect(state.backend.talents.length).toBeGreaterThan(0); expect(state.historicalNodes.length).toBeGreaterThan(0);
  });

  it('A11 私帳支出、公帑收入及藏界代管都保留可追溯帳目與物權', () => {
    const book = { private: 12, family: 0, public: 0, military: 0, sovereign: 0 };
    const paid = applyAccountEntry(book, { id:'pay', eventId:'e1', turn:1, asset:'錢', amount:4, from:'private', to:'market', memo:'私人買書' });
    const publicIncome = applyAccountEntry(paid.accounts, { id:'tax', eventId:'e2', turn:2, asset:'錢', amount:8, from:'market', to:'public', memo:'示例公帑收入' });
    expect(paid.accounts.private).toBe(8); expect(publicIncome.accounts.public).toBe(8);
    expect(paid.entry.from).toBe('private'); expect(publicIncome.entry.eventId).toBe('e2');
    const lot = { id:'grain-1', item:'糧', quantity:500, ownerId:'family-1', custodianId:'storekeeper', locationId:'warehouse-1' };
    const kept = placeInSubspace(lot, 'player', 'warehouse-1', true);
    expect(kept).toMatchObject({ quantity:500, ownerId:'family-1', custodianId:'player' });
    expect(kept.locationId).not.toBe(lot.locationId);
    expect(placeInSubspace(kept, 'player', 'warehouse-1', true)).toMatchObject({ quantity:500, ownerId:'family-1' });
    expect(() => placeInSubspace(lot, 'player', 'warehouse-1', false)).toThrow('不在可存取範圍');
  });

  it('A27 四項意圖各有單一主向；「繼續」不推進回合或批准待決事項', () => {
    const { state } = start('continue');
    const withDecision = { ...state, pendingDecisions: [{ id:'land-cession', kind:'永久割地待批准' }] };
    const result = dispatch(withDecision, { version:ENGINE_VERSION, commandId:'continue-only', expectedRevision:state.revision, worldlineId:state.worldlineId, type:'Continue' });
    expect(INTENTS).toHaveLength(4); expect(result.event).toBeNull(); expect(result.state).toEqual(withDecision);
    expect(result.state?.turn).toBe(0); expect(result.state?.pendingDecisions).toHaveLength(1);
  });
});

describe('ROADMAP 第二階段：人物與資訊行為驗收', () => {
  it('A08 五維硬限 1–100、普通核心技能最多五項，與天生技清單分離', () => {
    const { state } = start('limits'); const p2 = state.phase2!;
    expect(p2.stats).toBeNull(); expect(() => applyPhase2Action(p2, { type:'TrainStat', stat:'智力', turn:0 })).toThrow('童年階段');
    expect(validateStatValue(1)).toBe(1); expect(validateStatValue(100)).toBe(100); expect(() => validateStatValue(101)).toThrow('1 至 100');
    let changed = p2;
    for (let i=0;i<5;i++) changed = applyPhase2Action(changed, { type:'PracticeSkill', skillId:`s${i}`, name:`技能${i}`, turn:0 });
    expect(changed.coreSkills).toHaveLength(5);
    expect(() => applyPhase2Action(changed, { type:'PracticeSkill', skillId:'s6', name:'第六項', turn:0 })).toThrow('最多五項');
    changed.innateAbilities.push('天生技基準・未實作');
    expect(changed.innateAbilities).toHaveLength(1); expect(changed.coreSkills).toHaveLength(5);
  });

  it('A09 命名先暫停在待決流程，只有玩家提交姓名後才建立人物', () => {
    const { state } = start('naming');
    const pending = phaseAction(state, { type:'RequestName', request:{ id:'name-request', relation:'收養子女', role:'養子女', birthYear:184, anchorId:'protagonist' } });
    expect(pending.state?.phase2?.pendingNames).toHaveLength(1);
    expect(pending.state?.phase2?.persons.some((person) => person.name === '阿和')).toBe(false);
    const completed = phaseAction(pending.state!, { type:'ChooseName', requestId:'name-request', personId:'adopted-1', name:'阿和' });
    expect(completed.state?.phase2?.pendingNames).toHaveLength(0);
    expect(completed.state?.phase2?.persons.find((person) => person.id === 'adopted-1')?.name).toBe('阿和');
    expect(kinshipTerm(completed.state!.phase2!, 'adopted-1')).toBe('養子女');
  });

  it('A10 親屬稱謂依世代路徑而非年齡；婚姻、收養、死亡均保留關係紀錄', () => {
    const { state } = start('kinship'); let graph = state.phase2!;
    graph = applyPhase2Action(graph, { type:'RequestName', request:{ id:'sibling-request', relation:'血親手足', role:'血親手足', birthYear:184, anchorId:'protagonist' } });
    graph = applyPhase2Action(graph, { type:'ChooseName', requestId:'sibling-request', personId:'sibling', name:'景同' });
    graph = applyPhase2Action(graph, { type:'RequestName', request:{ id:'nephew-request', relation:'血親子女', role:'血親子女', birthYear:184, anchorId:'sibling' } });
    graph = applyPhase2Action(graph, { type:'ChooseName', requestId:'nephew-request', personId:'nephew', name:'景晚' });
    expect(graph.persons.find((person) => person.id === 'nephew')?.birthYear).toBe(graph.persons.find((person) => person.id === 'protagonist')?.birthYear);
    expect(kinshipTerm(graph, 'nephew')).toBe('姪／甥輩');
    graph = applyPhase2Action(graph, { type:'RequestName', request:{ id:'spouse-request', relation:'婚姻', role:'配偶', birthYear:184, anchorId:'protagonist' } });
    graph = applyPhase2Action(graph, { type:'ChooseName', requestId:'spouse-request', personId:'spouse', name:'清和' });
    expect(kinshipTerm(graph, 'spouse')).toBe('配偶／姻親');
    const dead = applyPhase2Action(graph, { type:'MarkDeath', personId:'nephew', deathYear:190 });
    expect(dead.persons.find((person) => person.id === 'nephew')).toMatchObject({ alive:false, deathYear:190 });
    expect(kinshipTerm(dead, 'nephew')).toBe('姪／甥輩');
  });

  it('A11／A12 不同資產分帳、物權與保管分離，帳務可由事件重播還原', () => {
    const initial = start('accounts'); const action: Phase2Action = { type:'TransferAsset', asset:'糧', amount:5, from:'family', to:'private', memo:'分家取糧', turn:0, id:'grain-transfer' };
    const changed = phaseAction(initial.state, action); expect(changed.state?.phase2?.assetBalances.糧.family).toBe(15); expect(changed.state?.phase2?.assetBalances.糧.private).toBe(5);
    expect(changed.state?.phase2?.assetLedger.at(-1)).toMatchObject({ asset:'糧', amount:5, from:'family', to:'private' });
    expect(() => applyPhase2Action(changed.state!.phase2!, { ...action, id:'overdraw', amount:99 })).toThrow('來源帳戶資產不足');
    const lot = changed.state!.phase2!.items[0], moved = phaseAction(changed.state!, { type:'ChangeCustody', itemId:lot.id, custodianId:'protagonist', locationId:'主角隨身' });
    expect(moved.state?.phase2?.items[0]).toMatchObject({ ownerId:lot.ownerId, custodianId:'protagonist', quantity:lot.quantity });
    expect(replay([initial.event, changed.event!])).toEqual(changed.state);
    const cash = phaseAction(moved.state!, { type:'TransferAsset', asset:'錢', amount:3, from:'private', to:'family', memo:'示例家庭支出', turn:0, id:'cash-transfer' });
    expect(cash.state?.phase2?.assetBalances.錢.private).toBe(cash.state?.accounts.private);
    expect(cash.state?.phase2?.assetBalances.錢.family).toBe(cash.state?.accounts.family);
    const earned = act(cash.state!, '耕讀自持', 'after-cash-transfer');
    expect(earned.state?.phase2?.assetBalances.錢.private).toBe(earned.state?.character.money);
    expect(earned.state?.phase2?.assetBalances.錢.private).toBe(earned.state?.accounts.private);
  });

  it('A13 單向傳音立即抵達但不自動回覆；書信依旅程延遲抵達', () => {
    const { state } = start('messages'); const recipient = state.phase2!.persons.find((person) => person.alive && person.id !== 'protagonist')!;
    const sent = applyPhase2Action(state.phase2!, { type:'SendMessage', id:'signal-1', recipientId:recipient.id, channel:'軒轅傳音示例', text:'家中安好', turn:2 });
    expect(sent.messages[0]).toMatchObject({ arrived:true, sentTurn:2, arrivalTurn:2 }); expect(sent.messages).toHaveLength(1);
    let mail = applyPhase2Action(sent, { type:'SendMessage', id:'letter-1', recipientId:recipient.id, channel:'書信', text:'兩回合後見', turn:2 });
    expect(mail.messages[1].arrived).toBe(false);
    mail = advancePhase2(mail, 3, 184, '耕讀自持'); expect(mail.messages[1].arrived).toBe(false);
    mail = advancePhase2(mail, 4, 185, '耕讀自持'); expect(mail.messages[1].arrived).toBe(true);
  });

  it('A14 場景只列在場者；同回合首次發言含年齡官職，後續不重複且換回合重置', () => {
    const { state } = start('scene'); const first = advancePhase2(state.phase2!, 1, 184, '耕讀自持');
    expect(first.scene.presentIds).toContain('protagonist'); expect(first.scene.speeches).toHaveLength(2);
    expect(first.scene.speeches[0].label).toMatch(/（\d+歲，.+）/); expect(first.scene.speeches[1].label).toBe(first.scene.speeches[1].name);
    const second = advancePhase2(first, 2, 184, '耕讀自持');
    expect(second.scene.speeches[0].firstSpeech).toBe(true); expect(second.scene.turn).toBe(2);
    expect(second.scene.leftIds.length + second.scene.enteredIds.length).toBeGreaterThan(0);
  });

  it('A25 只選家庭生活仍自動結算外部人事死亡、接任與天下後台', () => {
    const { state } = start('family-turns'); let current = state;
    for (let i=0;i<16;i++) {
      const result = act(current, '耕讀自持', `family-turn-${i+1}`); current = result.state!;
    }
    expect(current.backend).toMatchObject({ personnelChecks:16, talentChecks:16, historyChecks:16, trendChecks:16 });
    expect(current.phase2?.worldUpdates.some((entry) => entry.includes('佐吏病故'))).toBe(true);
    expect(current.phase2?.worldUpdates.some((entry) => entry.includes('抵達接任'))).toBe(true);
    expect(current.phase2?.persons.find((person) => person.id === 'example-clerk')?.alive).toBe(false);
    expect(current.phase2?.persons.some((person) => person.id === 'example-successor' && person.alive)).toBe(true);
  });

  it('A28 一次目擊只記錄可見現象，不洩漏技能名稱、容量或後台限制', () => {
    const { state } = start('witness'); const witness = state.phase2!.persons.find((person) => person.id !== 'protagonist')!;
    const observed = applyPhase2Action(state.phase2!, { type:'RecordObservation', observation:{ id:'witness-event', witnessId:witness.id, turn:1, observation:'物品短暫消失後出現。', known:['目擊物品消失並出現'], unknown:['能力名稱','容量','全部限制'] } });
    expect(observed.observations[0].known).toEqual(['目擊物品消失並出現']);
    expect(observed.observations[0].unknown.join('')).not.toContain('容量=');
    expect(JSON.stringify(observed.observations[0])).not.toMatch(/軒轅藏界|無限容量/);
  });
});
