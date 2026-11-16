export interface DialogTabEvent {
  key: string;
  shiftKey: boolean;
  currentTarget: HTMLElement;
  preventDefault(): void;
}

const FOCUSABLE_SELECTOR = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function trapDialogTab(event: DialogTabEvent): void {
  if (event.key !== 'Tab') return;

  const dialog = event.currentTarget;
  const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) =>
    !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true' && element.tabIndex >= 0,
  );

  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1)!;
  const active = dialog.ownerDocument.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
