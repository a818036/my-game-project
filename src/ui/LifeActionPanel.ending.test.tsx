// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOpeningFacts, dispatch, ENGINE_VERSION, type GameCommand } from '../engine';
import { LifeActionPanel } from './LifeActionPanel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { understandInput } = vi.hoisted(() => ({ understandInput: vi.fn() }));
vi.mock('../narration/interaction', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../narration/interaction')>()),
  understandInput: (...args: unknown[]) => understandInput(...args),
}));

describe('明確文字輸入的大結局意向', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    understandInput.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  function unifiedState() {
    const facts = createOpeningFacts(393, 184, { regions: [], surnames: [] });
    const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'ending-text-start', expectedRevision: 0, type: 'StartGame', name: '主角', seed: 393, facts }).state!;
    return { ...started, phase4: { ...started.phase4!, unified: true, ending: 'continuing' as const } };
  }

  function setText(textarea: HTMLTextAreaElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('明確結局用語直接開啟結局詢問，不呼叫 AI 或推進生活行動', async () => {
    const onRun = vi.fn(async (_command: GameCommand) => true);
    await act(async () => root.render(createElement(LifeActionPanel, { state: unifiedState(), busy: false, onRun })));
    await act(async () => setText(host.querySelector('textarea')!, '請進入大結局'));
    await act(async () => host.querySelector<HTMLButtonElement>('.primary.wide')!.click());

    expect(understandInput).not.toHaveBeenCalled();
    expect(onRun).toHaveBeenCalledOnce();
    expect(onRun.mock.calls[0][0]).toMatchObject({ type: 'Phase4Action', action: { type: 'PromptEnding' } });
    expect(host.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('');
  });

  it('明確結局用語與已勾選生活行動混送時要求拆開，不結算任一項', async () => {
    const onRun = vi.fn(async (_command: GameCommand) => true);
    await act(async () => root.render(createElement(LifeActionPanel, { state: unifiedState(), busy: false, onRun })));
    await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async () => setText(host.querySelector('textarea')!, '收尾'));
    await act(async () => host.querySelector<HTMLButtonElement>('.primary.wide')!.click());

    expect(understandInput).not.toHaveBeenCalled();
    expect(onRun).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('請取消勾選生活行動');
    expect(host.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('收尾');
  });
});
