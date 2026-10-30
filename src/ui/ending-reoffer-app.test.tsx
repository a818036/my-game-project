// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState, type OpeningHistory } from '../engine';
import { ENGINEERING, shouldReofferEnding } from '../phase4';
import { commitWorldline, loadWorkspace, type SaveFile } from '../storage';
import { fetchNarration } from '../narration/client';
import App from './App';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('../storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../storage')>();
  return { ...actual, commitWorldline: vi.fn().mockResolvedValue(undefined), loadWorkspace: vi.fn() };
});
vi.mock('./ChatGptConnection', () => ({ ChatGptConnection: () => null }));
vi.mock('./HistoricalGeographyRegisters', () => ({ HistoricalGeographyRegisters: () => null }));
vi.mock('../narration/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../narration/client')>();
  return { ...actual, fetchNarration: vi.fn() };
});

function makeSaveWithDueReoffer(approvedMilestones = ENGINEERING.endingReofferNaturalNodeCount): SaveFile {
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
  for (let index = 0; index < approvedMilestones; index++) {
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
  if (!state.phase4 || (approvedMilestones >= ENGINEERING.endingReofferNaturalNodeCount) !== shouldReofferEnding(state.phase4)) throw new Error('測試存檔的重新提議門檻狀態不符');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events, state };
}

describe('重大節點後重新提供結局的 App 流程', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    vi.mocked(fetchNarration).mockResolvedValue({ paragraphs: ['隔離測試敘事'], dialogue: [], suggestions: [], source: 'mock' });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.clearAllMocks();
    vi.mocked(commitWorldline).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadWorkspace).mockReset();
    vi.mocked(fetchNarration).mockReset();
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

  it('玩家在軍政介面逐一批准三個自然節點後，主故事區才出現結局重提入口', async () => {
    const save = makeSaveWithDueReoffer(0);
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host.querySelector('.finale-reoffer')).toBeNull();
    await act(async () => {
      [...host.querySelectorAll<HTMLButtonElement>('.feature-nav button')].find((button) => button.textContent?.trim().startsWith('軍政'))?.click();
      [...host.querySelectorAll<HTMLElement>('summary')].find((summary) => summary.textContent?.includes('歷史、軍政與重大決策'))?.click();
    });

    const treatyLabel = [...host.querySelectorAll<HTMLLabelElement>('.phase4-panel label')].find((label) => label.textContent?.includes('談判提出的具體條款'));
    const successorLabel = [...host.querySelectorAll<HTMLLabelElement>('.phase4-panel label')].find((label) => label.textContent?.includes('條款生效後的控制者'));
    const treatyInput = treatyLabel?.querySelector<HTMLTextAreaElement>('textarea');
    const successorInput = successorLabel?.querySelector<HTMLInputElement>('input');
    expect(treatyInput).not.toBeNull();
    expect(successorInput).not.toBeNull();

    for (let milestone = 1; milestone <= ENGINEERING.endingReofferNaturalNodeCount; milestone++) {
      await act(async () => {
        const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        textareaSetter?.call(treatyInput, `隔離介面自然節點 ${milestone}`);
        treatyInput?.dispatchEvent(new Event('input', { bubbles: true }));
        inputSetter?.call(successorInput, `隔離治理 ${milestone}`);
        successorInput?.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => {
        [...host.querySelectorAll<HTMLButtonElement>('.phase4-panel button')].find((button) => button.textContent?.includes('保存草案（不改主權）'))?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const pending = [...host.querySelectorAll<HTMLButtonElement>('.phase4-panel button')].find((button) => button.textContent?.includes('明確批准條款'));
      expect(pending).not.toBeNull();
      if (milestone === 1) pending?.focus();
      await act(async () => { pending?.click(); });
      expect(document.querySelector('[role=\"dialog\"]')?.textContent).toContain('批准後會變更所列領地控制者');
      if (milestone === 1) {
        await act(async () => { document.querySelector<HTMLButtonElement>('.confirm-dialog button.quiet')?.click(); });
        expect(document.querySelector('.confirm-dialog')).toBeNull();
        expect(commitWorldline).toHaveBeenCalledTimes(milestone);
        expect(host.querySelector('.finale-reoffer')).toBeNull();
        expect(document.activeElement).toBe(pending);
        await act(async () => { pending?.click(); });
        expect(document.querySelector('.confirm-dialog')).not.toBeNull();
      }
      await act(async () => {
        document.querySelector<HTMLButtonElement>('.confirm-dialog button.primary')?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      if (milestone < ENGINEERING.endingReofferNaturalNodeCount) expect(host.querySelector('.finale-reoffer')).toBeNull();
    }

    const offer = host.querySelector<HTMLElement>('.finale-reoffer');
    expect(offer).not.toBeNull();
    expect(host.querySelector('#main-content')?.contains(offer)).toBe(true);
    expect(offer?.textContent).toContain('重大節點後可以重新考慮大結局');
    expect(host.textContent).toContain('西元 280 年');
  }, 30000);

  it('記錄恩怨使用遊戲內文字對話框，空白遭阻止且 Enter 保存文字而不推進回合', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const save = makeSaveWithDueReoffer(0);
    const phase2 = save.state.phase2!;
    phase2.persons.push({ id:'a367-grievance-person', name:'測試關係人', role:'友人', birthYear:150, deathYear:null, alive:true, office:'故吏', gender:'不詳' });
    phase2.relationships = [{ personId:'a367-grievance-person', trust:20, loyalty:30, fear:0, grievances:[] }];
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      [...host.querySelectorAll<HTMLElement>('summary')].find((summary) => summary.textContent?.includes('信任、忠誠、恐懼與恩怨'))?.click();
    });
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim()==='記錄恩怨');
    expect(trigger).not.toBeNull();
    trigger?.focus();
    await act(async () => { trigger?.click(); });
    const field = document.querySelector<HTMLInputElement>('#confirm-dialog-input');
    const confirm = document.querySelector<HTMLButtonElement>('.confirm-dialog button.primary');
    expect(field?.labels?.[0]?.textContent).toContain('恩怨內容');
    expect(document.activeElement).toBe(field);
    expect(confirm?.disabled).toBe(true);
    expect(promptSpy).not.toHaveBeenCalled();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(field, '在約定日期拒絕交還借物');
      field?.dispatchEvent(new Event('input', { bubbles:true }));
    });
    expect(confirm?.disabled).toBe(false);
    await act(async () => {
      field?.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(commitWorldline).toHaveBeenCalledOnce();
    const candidate = vi.mocked(commitWorldline).mock.calls[0]![0] as SaveFile;
    expect(candidate.state.phase2?.relationships.find((relation) => relation.personId==='a367-grievance-person')?.grievances.at(-1)?.text).toBe('在約定日期拒絕交還借物');
    expect(candidate.state.turn).toBe(save.state.turn);
    expect(document.querySelector('.confirm-dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  }, 30000);

  it('取消恩怨輸入不保存文字、不推進回合並恢復焦點', async () => {
    const save = makeSaveWithDueReoffer(0);
    host.id = 'root';
    const phase2 = save.state.phase2!;
    phase2.persons.push({ id:'a370-grievance-person', name:'取消測試關係人', role:'友人', birthYear:150, deathYear:null, alive:true, office:'故吏', gender:'不詳' });
    phase2.relationships = [{ personId:'a370-grievance-person', trust:20, loyalty:30, fear:0, grievances:[] }];
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      [...host.querySelectorAll<HTMLElement>('summary')].find((summary) => summary.textContent?.includes('信任、忠誠、恐懼與恩怨'))?.click();
    });
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim()==='記錄恩怨');
    expect(trigger).not.toBeNull();
    trigger?.focus();
    await act(async () => { trigger?.click(); });
    const field = document.querySelector<HTMLInputElement>('#confirm-dialog-input');
    expect(field).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(field, '取消後不得寫入的測試文字');
      field?.dispatchEvent(new Event('input', { bubbles:true }));
    });
    expect(document.querySelector<HTMLInputElement>('#confirm-dialog-input')?.value).toBe('取消後不得寫入的測試文字');

    await act(async () => {
      document.querySelector<HTMLInputElement>('#confirm-dialog-input')?.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(commitWorldline).not.toHaveBeenCalled();
    expect(save.state.phase2?.relationships.find((relation) => relation.personId==='a370-grievance-person')?.grievances).toEqual([]);
    expect(save.state.turn).toBe(0);
    expect(document.querySelector('.confirm-dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(host.inert).toBe(false);
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

  it('結局重提保存失敗時保留原入口與焦點，不假裝開啟新結局', async () => {
    const save = makeSaveWithDueReoffer();
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves: [save],
      profile: { regions: [], surnames: [], activeWorldlineId: save.worldlineId },
    });
    vi.mocked(commitWorldline).mockRejectedValueOnce(new Error('配額不足'));
    await act(async () => {
      root.render(createElement(App));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const button = host.querySelector<HTMLButtonElement>('.finale-reoffer button');
    expect(button).not.toBeNull();
    button?.focus();
    await act(async () => {
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(commitWorldline).toHaveBeenCalledOnce();
    expect(host.querySelector('[data-testid="ending-decision-main"]')).toBeNull();
    expect(host.querySelector('.finale-reoffer button')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(host.textContent).toContain('未保存任何變更：配額不足');
    expect(host.textContent).toContain('第 0 回合');
  }, 30000);
});
