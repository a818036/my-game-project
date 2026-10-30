import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trapDialogTab } from './dialog-focus';

interface NameDialogProps {
  role: string;
  value: string;
  busy: boolean;
  onChange(value: string): void;
  onConfirm(): void;
}

export function NameDialog({ role, value, busy, onChange, onConfirm }: NameDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      trapDialogTab({ key: event.key, shiftKey: event.shiftKey, currentTarget: dialog, preventDefault: () => event.preventDefault() });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (appRoot) appRoot.inert = wasInert;
      previous?.focus();
    };
  }, []);

  return createPortal(<div className="modal-backdrop"><section ref={dialogRef} className="name-dialog" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title" aria-describedby="name-dialog-description" tabIndex={-1}>
    <div className="section-kicker">玩家命名權・待決</div>
    <h2 id="name-dialog-title">請為「{role}」命名</h2>
    <p id="name-dialog-description">命名完成前，此人物不會加入正式家族圖。</p>
    <label>姓名<input ref={inputRef} maxLength={20} value={value} onChange={(event) => onChange(event.target.value)} /></label>
    <button className="primary" disabled={!value.trim() || busy} onClick={onConfirm}>確認姓名</button>
  </section></div>, document.body);
}
