import { Service, computed, inject } from '@angular/core';
import { MAX_TEAM_SIZE } from '../../domain/dev.model';
// totalStats : somme des six stats d'un dev, utilisée pour calculer le total de l'équipe.
import { averageStats, teamCoverage, totalStats } from '../../domain/dev-rules';
import { DevRepository } from '../data/dev-repository';
import { Pc } from '../pc/pc';
import { isIdList, persistedSignal } from '../storage/persisted-signal';

const TEAM_KEY = 'pokedev.team.v1';

/** L'équipe de l'utilisateur : au plus six devs, conservée dans le navigateur. */
@Service()
export class Team {
  private readonly repository = inject(DevRepository);
  private readonly pc = inject(Pc);
  private readonly ids = persistedSignal<number[]>(TEAM_KEY, [], isIdList);

  readonly members = computed(() =>
    this.ids()
      .map((id) => this.repository.byId(id))
      .filter((dev) => dev !== undefined)
      .map((dev) => {
        dev.progression = totalStats(dev.stats);
        return dev;
      }),
  );

  readonly size = computed(() => this.ids().length);
  readonly isFull = computed(() => this.size() >= MAX_TEAM_SIZE);
  readonly coverage = computed(() => teamCoverage(this.members()));
  readonly average = computed(() => averageStats(this.members()));
  // Score total de l'équipe, recalculé automatiquement dès que les membres changent.
  readonly total = computed(() =>
    // reduce part de 0 et ajoute, pour chaque dev, la somme de ses six stats (0 si l'équipe est vide).
    this.members().reduce((sum, dev) => sum + totalStats(dev.stats), 0),
  );

  has(id: number): boolean {
    return this.ids().includes(id);
  }

  /** Ajoute ou retire un dev. Renvoie false si l'équipe est pleine. */
  toggle(id: number): boolean {
    if (this.has(id)) {
      this.remove(id);
      return true;
    }
    if (this.isFull()) {
      return false;
    }
    this.ids.update((ids) => [...ids, id]);
    // Un dev qui rejoint l'équipe quitte le PC.
    this.pc.remove(id);
    return true;
  }

  /** Retire un dev de l'équipe ; sans effet s'il n'en fait pas partie. */
  remove(id: number): void {
    this.ids.update((ids) => ids.filter((current) => current !== id));
  }

  clear(): void {
    this.ids.set([]);
  }

  /** Remplace toute l'équipe, par exemple à l'import d'une sauvegarde. */
  replace(ids: readonly number[]): void {
    this.ids.set(ids.slice(0, MAX_TEAM_SIZE));
  }
}
