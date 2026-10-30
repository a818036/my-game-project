// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState, type OpeningHistory } from '../engine';
import { ENGINEERING, shouldReofferEnding } from '../phase4';
import { commitWorldline, loadWorkspace, type SaveFile } from '../storage';
import App from './App';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('../storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../storage')>();
  return { ...actual, commitWorldline: vi.fn().mockResolvedValue(undefined), loadWorkspace: vi.fn() };
});
vi.mock('./ChatGptConnection', () => ({ ChatGptConnection: () => null }));
vi.mock('./HistoricalGeographyRegisters', () => ({ HistoricalGeographyRegisters: () => null }));

function makeSaveWithDueReoffer(): SaveFile {
  const history: OpeningHistory = { regions: [], surnames: [] };
  const facts = createOpeningFacts(23, 160, history);
  const events: GameEvent[] = [];
  const start = dispatch(null, { version: ENGINE_VERSION, commandId: 'a330-reoffer-start', expectedRevision: 0, type: 'StartGame', name: `${facts.surname}介面驗收`, seed: 23, facts });
  if (!start.state || !start.event) throw new Error('建立長局起始存檔失敗');
  let state: GameState = start.state;
  events.push(start.event);
  for (let decade = 1; decade <= 12; decade++) {
    const step = dispatch(state, { version: ENGINE_VERSION, commandId: `a330-reoffer-decade-${decade}`, expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 3600 } });
    if (!step.state || !step.event) throw new Error(`推進長局失敗：${decade}`);
    state = step.state;
    events.push(step.event);
  }
  const unify = dispatch(state, { version: ENGINE_VERSION, commandId: 'a330-reoffer-unify', expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase4Action', action: { type: 'SetUnified', unified: true } });
  if (!unify.state || !unify.event) throw new Error('記錄天下統一失敗');
  state = unify.state;
  events.push(unify.event);
  const continueLife = dispatch(state, { version: ENGINE_VERSION, commandId: 'a330-reoffer-continue', expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase4Action', action: { type: 'ContinueAfterUnification' } });
  if (!continueLife.state || !continueLife.event) throw new Error('記錄繼續人生失敗');
  state = continueLife.state;
  events.push(continueLife.event);
  for (let index = 0; index < ENGINEERING.endingReofferNaturalNodeCount; index++) {
    const id = `a330-reoffer-treaty-${index}`;
    const draft = dispatch(state, { version: ENGINE_VERSION, commandId: `${id}-draft`, expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase4Action', action: { type: 'DraftTreaty', id, proposer: '玩家', clauses: [{ id: `${id}-clause`, text: `依玩家決策調整示例領地 ${index + 1}`, sovereign: true, territoryId: 'sample-county', successorOwner: `玩家治理 ${index}` }] } });
    if (!draft.state || !draft.event) throw new Error(`建立重大節點失敗：${index}`);
    state = draft.state;
    events.push(draft.event);
    const approve = dispatch(state, { version: ENGINE_VERSION, commandId: `${id}-approve`, expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase4Action', action: { type: 'DecideTreaty', treatyId: id, decision: 'approve' } });
    if (!approve.state || !approve.event) throw new Error(`完成重大節點失敗：${index}`);
    state = approve.state;
    events.push(approve.event);
  }
  if (!state.phase4 || !shouldReofferEnding(state.phase4)) throw new Error('測試存檔未達重新提議條件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events, state };
}

describe('重大節點後重新提供結局的 App 流程', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.clearAllMocks();
    vi.mocked(commitWorldline).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadWorkspace).mockReset();
  });

  it('在主故事區播報重提入口，提交後只開啟結局選擇且不推進時間', async () => {
    const save = makeSaveWithDueReoffer();
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const offer = host.querySelector<HTMLElement>('.finale-reoffer');
    expect(offer).not.toBeNull();
    expect(host.querySelector('#main-content')?.contains(offer)).toBe(true);
    expect(offer?.previousElementSibling?.getAttribute('role')).toBe('status');
    expect(offer?.previousElementSibling?.textContent).toContain('重大節點累積完成');
    const button = offer?.querySelector<HTMLButtonElement>('button');
    expect(button?.textContent).toContain('進入大結局選擇');

    await act(async () => {
      button?.click();
      await import('./EndingChoice');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(commitWorldline).toHaveBeenCalledOnce();
    const saved = vi.mocked(commitWorldline).mock.calls[0]![0] as SaveFile;
    expect(saved.state.phase4).toMatchObject({ year: 280, ending: 'pending', unified: true });
    expect(host.querySelector('.finale-reoffer')).toBeNull();
    expect(host.textContent).toContain('已開啟大結局選擇；沒有呼叫 AI 或推進時間。');
    const decision = host.querySelector<HTMLElement>('#main-content [data-testid="ending-decision-main"]');
    expect(decision).not.toBeNull();
    expect(document.activeElement).toBe(decision?.querySelector('h2'));
    expect(decision?.querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
    expect(decision?.textContent).toContain('選擇繼續人生');
    expect(decision?.querySelector('label[for="ending-direction"]')?.textContent).toBe('你決定的結局方向');
    expect(decision?.querySelector('#ending-direction')).not.toBeNull();
    expect(decision?.querySelector('#ending-direction')?.getAttribute('aria-describedby')).toBe('ending-direction-help');
    expect(decision?.querySelector('#ending-direction-help')?.textContent).toContain('留白或繼續人生都不會結束這條世界線');
    expect(decision?.querySelector('button[type="submit"]')?.textContent).toBe('確認選擇結局');
    expect(host.querySelector('.phase4-panel [data-testid="ending-decision-main"]')).toBeNull();
  }, 30000);

  it('操作自然節點重提入口後，待決結局可從 IndexedDB 重新載入', async () => {
    const actualStorage = await vi.importActual<typeof import('../storage')>('../storage');
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: indexedDB });
    const save = makeSaveWithDueReoffer();
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    vi.mocked(commitWorldline).mockImplementation((candidate, history, makeActive) =>
      actualStorage.commitWorldline(candidate as SaveFile, history, makeActive),
    );
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const button = host.querySelector<HTMLButtonElement>('.finale-reoffer button');
    expect(button).not.toBeNull();
    await act(async () => {
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const workspace = await actualStorage.loadWorkspace();
    expect(workspace.profile.activeWorldlineId).toBe(save.worldlineId);
    expect(workspace.saves).toHaveLength(1);
    expect(workspace.saves[0]?.state.phase4).toMatchObject({ year: 280, ending: 'pending', unified: true });
    expect(replay(workspace.saves[0]!.events)).toEqual(workspace.saves[0]!.state);
  }, 30000);

  it('主故事結局表單可保存不同結局文字且不推進世界時間', async () => {
    const save = makeSaveWithDueReoffer();
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const reofferButton = host.querySelector<HTMLButtonElement>('.finale-reoffer button');
    expect(reofferButton).not.toBeNull();
    await act(async () => {
      reofferButton?.click();
      await import('./EndingChoice');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(commitWorldline).toHaveBeenCalledOnce();
    expect(host.querySelector('[data-testid="ending-decision-main"]')).not.toBeNull();
    const input = host.querySelector<HTMLInputElement>('#ending-direction');
    expect(input).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '建立新朝，安定四方');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>('.finale-choice-main form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(commitWorldline).toHaveBeenCalledTimes(2);
    const chosen = vi.mocked(commitWorldline).mock.calls[1]![0] as SaveFile;
    expect(chosen.state.phase4).toMatchObject({ year: 280, ending: 'chosen', chosenEnding: '建立新朝，安定四方' });
    expect(chosen.state.turn).toBe(0);
    expect(chosen.state.actions.at(-1)?.elapsedDays).toBe(save.state.actions.at(-1)?.elapsedDays);
  }, 30000);
});
