import { Component } from '@angular/core';

/**
 * Bloc « état vide » : le contenu est projeté par le parent.
 * Le slot [actions] reçoit les boutons ou liens, le reste va dans le message.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="message"><ng-content /></div>
    <div class="actions"><ng-content select="[actions]" /></div>
  `,
  styles: `
    :host {
      display: block;
      padding: 2rem 1rem;
      border: 2px dashed var(--border);
      border-radius: 0.75rem;
      text-align: center;
    }
    .actions:empty {
      display: none;
    }
    .actions {
      margin-top: 1rem;
    }
  `,
})
export class EmptyState {}
