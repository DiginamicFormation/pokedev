import { Service, computed, inject } from '@angular/core';
import { MAX_TEAM_SIZE } from '../../domain/dev.model';
import { DevRepository } from '../data/dev-repository';
import { Confirmation } from '../dialog/confirmation';
import { isIdList, persistedSignal } from '../storage/persisted-signal';

const PC_KEY = 'pokedev.pc.v1';

/** Le PC : les devs recrutés alors que l'équipe était pleine, conservés dans le navigateur. */
@Service()
export class Pc {
  private readonly repository = inject(DevRepository);
  private readonly confirmation = inject(Confirmation);
  private readonly ids = persistedSignal<number[]>(PC_KEY, [], isIdList);

  readonly members = computed(() =>
    this.ids()
      .map((id) => this.repository.byId(id))
      .filter((dev) => dev !== undefined),
  );

  readonly size = computed(() => this.ids().length);

  has(id: number): boolean {
    return this.ids().includes(id);
  }

  add(id: number): void {
    if (!this.has(id)) {
      this.ids.update((ids) => [...ids, id]);
    }
  }

  remove(id: number): void {
    this.ids.update((ids) => ids.filter((current) => current !== id));
  }

  /** Remplace tout le contenu du PC, par exemple à l'import d'une sauvegarde. */
  replace(ids: readonly number[]): void {
    this.ids.set([...ids]);
  }

  /** L'équipe est pleine : propose d'envoyer le dev au PC plutôt que de l'ignorer. */
  async offer(id: number): Promise<void> {
    const dev = this.repository.byId(id);
    if (!dev || this.has(id)) {
      return;
    }
    const confirmed = await this.confirmation.ask({
      title: 'Équipe pleine',
      message: `Votre équipe compte déjà ${MAX_TEAM_SIZE} devs. Voulez-vous envoyer ${dev.name} au PC ?`,
      confirmLabel: 'Envoyer au PC',
    });
    if (confirmed) {
      this.add(id);
    }
  }
}
