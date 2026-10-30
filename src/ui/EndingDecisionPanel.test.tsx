// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndingDecisionPanel } from './EndingDecisionPanel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('統一後結局決策介面', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const callbacks = () => ({
    onRecordUnification: vi.fn(),
    onContinue: vi.fn(),
    onEndingDraftChange: vi.fn(),
    onChooseEnding: vi.fn(),
  });

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it('待決時同時提供明確繼續與結局表單', async () => {
    const cb = callbacks();
    await act(async () => {
      root.render(createElement(EndingDecisionPanel, {
        unified: true, ending: 'pending', busy: false, endingDraft: '歸隱故里', ...cb,
      }));
      await import('./EndingChoice');
    });

    expect(host.textContent).toContain('選擇繼續人生');
    expect(host.textContent).toContain('確認選擇結局');
    const continueButton = [...host.querySelectorAll('button')].find(button => button.textContent === '選擇繼續人生')!;
    await act(async () => continueButton.click());
    expect(cb.onContinue).toHaveBeenCalledOnce();
    expect(cb.onRecordUnification).not.toHaveBeenCalled();
  });

  it('尚未統一時只提供一次統一記錄入口', async () => {
    const cb = callbacks();
    await act(async () => root.render(createElement(EndingDecisionPanel, {
      unified: false, ending: 'continuing', busy: false, endingDraft: '', ...cb,
    })));

    expect(host.textContent).toContain('記錄完成統一');
    expect(host.textContent).not.toContain('進入大結局選擇');
    await act(async () => host.querySelector('button')!.click());
    expect(cb.onRecordUnification).toHaveBeenCalledOnce();
  });
});
