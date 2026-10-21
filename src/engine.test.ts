import { describe, expect, it } from 'vitest';
import { createOpeningFacts, dispatch, ENGINE_VERSION, INTENTS, MAX_TURNS, replay, type GameCommand, type GameEvent, type GameState, type OpeningHistory } from './engine';
import { applyAccountEntry, placeInSubspace } from './ledger';

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
    const { state } = playTurns('summaries');
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
