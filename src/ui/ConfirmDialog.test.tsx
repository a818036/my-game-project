// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

    confirm?.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(cancel);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => root!.render(null));
    expect(document.getElementById('root')?.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
