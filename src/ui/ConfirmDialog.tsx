import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trapDialogTab } from './dialog-focus';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, description, confirmLabel, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
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
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) cancelHandlerRef.current();
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
    <div className="button-row">
      <button ref={cancelRef} className="quiet" type="button" disabled={busy} onClick={onCancel}>返回確認</button>
      <button className="primary" type="button" disabled={busy} onClick={onConfirm}>{busy ? '正在保存…' : confirmLabel}</button>
    </div>
  </section></div>, document.body);
}
