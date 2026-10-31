// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndingReofferNotice } from './EndingReofferNotice';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('重大節點後的大結局入口提示', () => {
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
  });

  it('達到門檻時在主故事區提供即時提示與可操作入口', async () => {
    const onPromptEnding = vi.fn();
    await act(async () => root.render(createElement(EndingReofferNotice, { due: true, busy: false, onPromptEnding })));

    const status = host.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('aria-atomic')).toBe('true');
    expect(status?.textContent).toContain('重大節點累積完成');
    expect(host.querySelector('.finale-reoffer h2')?.textContent).toContain('可以重新考慮大結局');
    expect(host.querySelector('button')?.textContent).toContain('進入大結局選擇');
    await act(async () => host.querySelector('button')!.click());
    expect(onPromptEnding).toHaveBeenCalledOnce();
  });

  it('尚未達門檻或正在保存時不顯示可用入口', async () => {
    await act(async () => root.render(createElement(EndingReofferNotice, { due: false, busy: false, onPromptEnding: vi.fn() })));
    const status = host.querySelector('[role="status"]');
    expect(status?.textContent).toBe('');
    expect(host.querySelector('.finale-reoffer')).toBeNull();

    await act(async () => root.render(createElement(EndingReofferNotice, { due: true, busy: true, onPromptEnding: vi.fn() })));
    expect(host.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent).toContain('重大節點累積完成');
    expect(host.querySelector('button')?.disabled).toBe(true);
  });
});
