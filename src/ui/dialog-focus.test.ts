// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trapDialogTab } from './dialog-focus';

describe('命名對話框鍵盤焦點限制', () => {
  let dialog: HTMLElement;
  let first: HTMLInputElement;
  let last: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = '<button id="outside">背景操作</button><section id="dialog" tabindex="-1"><input id="first"><button id="disabled" disabled>停用</button><button id="last">確認</button></section>';
    dialog = document.querySelector<HTMLElement>('#dialog')!;
    first = document.querySelector<HTMLInputElement>('#first')!;
    last = document.querySelector<HTMLButtonElement>('#last')!;
  });

  function tab(shiftKey = false, key = 'Tab') {
    const event = { key, shiftKey, currentTarget: dialog, preventDefault: vi.fn() };
    trapDialogTab(event);
    return event.preventDefault;
  }

  it('從最後一項向前循環至第一項，忽略停用控制項', () => {
    last.focus();
    const preventDefault = tab();
    expect(document.activeElement).toBe(first);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('從第一項向後循環至最後一項', () => {
    first.focus();
    const preventDefault = tab(true);
    expect(document.activeElement).toBe(last);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('焦點意外在對話框外時送回第一項，非 Tab 按鍵不干預', () => {
    document.querySelector<HTMLButtonElement>('#outside')!.focus();
    const preventDefault = tab();
    expect(document.activeElement).toBe(first);
    expect(preventDefault).toHaveBeenCalledOnce();
    const preventEnter = tab(false, 'Enter');
    expect(preventEnter).not.toHaveBeenCalled();
  });

  it('沒有可用控制項時將焦點留在對話框本身', () => {
    dialog.innerHTML = '<button disabled>停用</button>';
    const preventDefault = tab();
    expect(document.activeElement).toBe(dialog);
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
