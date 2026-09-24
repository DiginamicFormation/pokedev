import { Service, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Dev, DevInfo } from '../../domain/dev.model';
import { nextId } from '../../domain/dev-rules';
import { persistedSignal } from '../storage/persisted-signal';
import { isDev, parseDevs } from './dev-validation';
import { DEVS_URL } from './devs-url';

const CUSTOM_DEVS_KEY = 'pokedev.custom-devs.v1';

function isDevList(value: unknown): value is Dev[] {
  return Array.isArray(value) && value.every(isDev);
}

/**
 * Source unique des devs : ceux du fichier JSON et ceux créés par l'utilisateur.
 * Les devs du fichier JSON sont en lecture seule : seuls les devs personnalisés
 * peuvent être modifiés ou supprimés.
 */
@Service()
export class DevRepository {
  private readonly url = inject(DEVS_URL);
  private readonly remote = httpResource(() => this.url, {
    parse: parseDevs,
    defaultValue: [],
  });
  private readonly custom = persistedSignal<Dev[]>(CUSTOM_DEVS_KEY, [], isDevList);

  /**
   * Lire value() d'une ressource en erreur lève une exception :
   * on vérifie hasValue() avant, pour garder les devs personnalisés affichables.
   */
  private readonly remoteDevs = computed(() => (this.remote.hasValue() ? this.remote.value() : []));

  readonly devs = computed(() => [...this.remoteDevs(), ...this.custom()]);
  readonly isLoading = this.remote.isLoading;
  readonly error = this.remote.error;

  byId(id: number): Dev | undefined {
    return this.devs().find((dev) => dev.id === id);
  }

  /** Ajoute un dev créé par l'utilisateur et renvoie son numéro. */
  add(dev: DevInfo): number {
    const id = nextId(this.devs());
    this.custom.update((devs) => [...devs, { ...dev, id, custom: true }]);
    return id;
  }

  /**
   * Remplace les informations d'un dev personnalisé ; sans effet sur un dev du fichier JSON.
   * Les informations absentes de `info` (l'évolution) sont conservées.
   */
  update(id: number, info: DevInfo): void {
    this.custom.update((devs) => devs.map((dev) => (dev.id === id ? { ...dev, ...info } : dev)));
  }

  /** Retire un dev personnalisé du pokédex ; sans effet sur un dev du fichier JSON. */
  remove(id: number): void {
    this.custom.update((devs) => devs.filter((dev) => dev.id !== id));
  }

  reload(): void {
    this.remote.reload();
  }
}
