// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { ConfirmDialog } from './ConfirmDialog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ConfirmDialog', () => {
  let root: ReturnType<typeof createRoot> | undefined;
  let app: HTMLDivElement | undefined;
  let trigger: HTMLButtonElement | undefined;

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    app?.remove();
    trigger?.remove();
    root = undefined;
    app = undefined;
    trigger = undefined;
  });

  it('限制焦點、Escape 取消，並在關閉後將焦點還給觸發按鈕', async () => {
    const onCancel = vi.fn();
    app = document.createElement('div');
    app.id = 'root';
    trigger = document.createElement('button');
    trigger.textContent = '批准條款';
    document.body.append(app, trigger);
    trigger.focus();
    root = createRoot(app);
    await act(async () => root!.render(createElement(ConfirmDialog, {
      title: '批准主權條款', description: '批准後會變更領地控制者。', confirmLabel: '確認批准條款', onConfirm: vi.fn(), onCancel,
    })));

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const cancel = dialog?.querySelector<HTMLButtonElement>('button.quiet');
    const confirm = dialog?.querySelector<HTMLButtonElement>('button.primary');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(document.getElementById('root')?.inert).toBe(true);
    expect(document.activeElement).toBe(cancel);
    const scan = await axe.run(dialog!, { rules: { 'color-contrast': { enabled: false } } });
    expect(scan.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(',')).join('; ')}`)).toEqual([]);

    confirm?.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(cancel);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => root!.render(null));
    expect(document.getElementById('root')?.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('中文輸入法組字期間按 Enter 不會送出確認', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    app = document.createElement('div');
    app.id = 'root';
    trigger = document.createElement('button');
    document.body.append(app, trigger);
    root = createRoot(app);
    await act(async () => root!.render(createElement(ConfirmDialog, {
      title: '記錄具體恩怨', description: '保存前再次確認。', confirmLabel: '保存恩怨紀錄',
      input: { label: '恩怨內容', value: '組字中的文字', onChange: vi.fn() }, onConfirm, onCancel,
    })));

    const field = document.querySelector<HTMLInputElement>('#confirm-dialog-input');
    expect(document.activeElement).toBe(field);
    const scan = await axe.run(document.querySelector('[role="dialog"]')!, { rules: { 'color-contrast': { enabled: false } } });
    expect(scan.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(',')).join('; ')}`)).toEqual([]);
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true });
    field?.dispatchEvent(composingEnter);
    const legacyComposingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(legacyComposingEnter, 'keyCode', { value: 229 });
    field?.dispatchEvent(legacyComposingEnter);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
