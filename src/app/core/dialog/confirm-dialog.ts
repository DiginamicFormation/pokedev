import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { Confirmation } from './confirmation';

/**
 * Popin de confirmation pilotée par le service Confirmation.
 * Le <dialog> natif gère le focus, la touche Échap et l'arrière-plan inerte.
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog
      #dialog
      closedby="any"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (close)="confirmation.answer(dialog.returnValue === 'confirm')"
    >
      @if (confirmation.request(); as request) {
        <form method="dialog">
          <h2 id="confirm-title">{{ request.title }}</h2>
          <p id="confirm-message">{{ request.message }}</p>
          <p class="actions">
            <button type="submit" value="cancel">{{ request.cancelLabel ?? 'Annuler' }}</button>
            <button type="submit" value="confirm" class="primary">
              {{ request.confirmLabel }}
            </button>
          </p>
        </form>
      }
    </dialog>
  `,
  styles: `
    dialog {
      box-sizing: border-box;
      width: min(26rem, calc(100% - 2rem));
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      background: var(--bg);
      color: var(--fg);
      box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.3);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.5);
    }
    dialog[open] {
      animation: pop 150ms ease-out;
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
    }
    p {
      margin: 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    .primary {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 600;
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog[open] {
        animation: none;
      }
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirmation = inject(Confirmation);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Ouverture après le rendu : les boutons existent déjà et le premier reçoit le focus. */
  protected readonly opening = afterRenderEffect(() => {
    const dialog = this.dialog().nativeElement;
    if (this.confirmation.request() && !dialog.open) {
      dialog.returnValue = '';
      dialog.showModal();
    }
  });
}
