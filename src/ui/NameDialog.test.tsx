// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NameDialog } from './NameDialog';

describe('必要命名對話框焦點管理', () => {
  let root: Root;
  let appRoot: HTMLDivElement;
  let mount: HTMLDivElement;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    appRoot = document.createElement('div');
    appRoot.id = 'root';
    document.body.append(appRoot);
    trigger = document.createElement('button');
    trigger.textContent = '新增親屬';
    appRoot.append(trigger);
    trigger.focus();
    mount = document.createElement('div');
    appRoot.append(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    appRoot.remove();
  });

  function render(value = '小明') {
    act(() => root.render(createElement(NameDialog, { role: '子女', value, busy: false, onChange: () => {}, onConfirm: () => {} })));
  }

  it('開啟時將焦點放入姓名欄，卸載時回到開啟前的控制項', () => {
    render();
    expect(document.activeElement).toBe(document.body.querySelector('[role="dialog"] input'));
    expect(appRoot.inert).toBe(true);
    expect(document.querySelector('#root [role="dialog"]')).toBeNull();
    act(() => root.render(null));
    expect(appRoot.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('在對話框首尾使用 Tab 與 Shift+Tab 會循環焦點', () => {
    render();
    const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    const button = document.body.querySelector<HTMLButtonElement>('[role="dialog"] button')!;
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(button);
  });

  it('焦點意外移出對話框後按 Tab 會回到姓名欄', () => {
    render();
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(document.body.querySelector('[role="dialog"] input'));
  });
});
