import { Service, computed, signal } from '@angular/core';

export interface ConfirmationRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
}

interface Pending {
  readonly request: ConfirmationRequest;
  readonly resolve: (confirmed: boolean) => void;
}

/**
 * Remplace window.confirm() par une popin au style de l'app.
 * La popin est affichée par <app-confirm-dialog>, placé une seule fois dans App.
 */
@Service()
export class Confirmation {
  private readonly pending = signal<Pending | undefined>(undefined);

  /** Question en cours ; undefined quand la popin est fermée. */
  readonly request = computed(() => this.pending()?.request);

  /** Pose une question : la promesse vaut true si l'utilisateur confirme. */
  ask(request: ConfirmationRequest): Promise<boolean> {
    // Une seule question à la fois : la précédente est considérée comme refusée.
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ request, resolve }));
  }

  answer(confirmed: boolean): void {
    this.pending()?.resolve(confirmed);
    this.pending.set(undefined);
  }
}
