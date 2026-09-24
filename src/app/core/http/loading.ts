import { Service, computed, signal } from '@angular/core';

/** Compte les requêtes HTTP en cours pour afficher un indicateur global. */
@Service()
export class Loading {
  private readonly pending = signal(0);

  readonly active = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((count) => count + 1);
  }

  stop(): void {
    this.pending.update((count) => Math.max(0, count - 1));
  }
}
