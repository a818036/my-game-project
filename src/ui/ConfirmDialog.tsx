import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trapDialogTab } from './dialog-focus';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  input?: { label: string; value: string; onChange(value: string): void; maxLength?: number; placeholder?: string };
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, description, confirmLabel, busy = false, input, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(busy);
  const cancelHandlerRef = useRef(onCancel);
  busyRef.current = busy;
  cancelHandlerRef.current = onCancel;

  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    (input ? inputRef.current : cancelRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) cancelHandlerRef.current();
        return;
      }
      if (event.key === 'Enter' && event.target === inputRef.current && !event.isComposing && !busyRef.current && inputRef.current?.value.trim()) {
        event.preventDefault();
        onConfirm();
        return;
      }
      trapDialogTab({ key: event.key, shiftKey: event.shiftKey, currentTarget: dialog, preventDefault: () => event.preventDefault() });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (appRoot) appRoot.inert = wasInert;
      previous?.focus();
    };
  }, []);

  return createPortal(<div className="modal-backdrop"><section ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" tabIndex={-1}>
    <div className="section-kicker">重大決策・再次確認</div>
    <h2 id="confirm-dialog-title">{title}</h2>
    <p id="confirm-dialog-description">{description}</p>
    {input && <label htmlFor="confirm-dialog-input">{input.label}<input ref={inputRef} id="confirm-dialog-input" maxLength={input.maxLength} placeholder={input.placeholder} value={input.value} onChange={(event) => input.onChange(event.target.value)} /></label>}
    <div className="button-row">
      <button ref={cancelRef} className="quiet" type="button" disabled={busy} onClick={onCancel}>返回確認</button>
      <button className="primary" type="button" disabled={busy || !!input && !input.value.trim()} onClick={onConfirm}>{busy ? '正在保存…' : confirmLabel}</button>
    </div>
  </section></div>, document.body);
}
