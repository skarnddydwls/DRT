import type { KeyboardEvent } from "react";

/** Submit the dialog's primary footer action without interfering with editing or controls. */
export function handleDialogEnter(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Enter" || event.defaultPrevented || event.repeat ||
      event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 ||
      event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof HTMLElement) ||
      target.closest('[role="dialog"]') !== event.currentTarget ||
      target.closest('textarea, button, a, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="listbox"], [role="menu"], [role="grid"], [role="option"]') ||
      (target instanceof HTMLInputElement && ["file", "checkbox", "radio"].includes(target.type))) return;

  const footer = event.currentTarget.querySelector<HTMLElement>('[data-slot="dialog-footer"]');
  if (!footer) return;
  const buttons = Array.from(footer.querySelectorAll<HTMLButtonElement>("button"));
  const primary = buttons.at(-1);
  // Do not fall back to cancel or another action when the primary button is disabled.
  if (!primary || primary.closest('[role="dialog"]') !== event.currentTarget) return;
  event.preventDefault();
  event.stopPropagation();
  if (!primary.disabled && primary.getAttribute("aria-disabled") !== "true" && primary.getClientRects().length) {
    primary.click();
  }
}
