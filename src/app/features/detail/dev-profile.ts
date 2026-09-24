import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Confirmation } from '../../core/dialog/confirmation';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { Dev, MAX_TOTAL, STAT_KEYS, StatKey } from '../../domain/dev.model';
import { bestStat, previousEvolution } from '../../domain/dev-rules';
import { STAT_LABELS } from '../../domain/labels';
import { TypeColor } from '../../shared/directives/type-color';
import { DexNumberPipe } from '../../shared/pipes/dex-number-pipe';
import { TotalStatsPipe } from '../../shared/pipes/total-stats-pipe';
import { DevAvatar } from '../../shared/ui/dev-avatar';
import { StatBar } from '../../shared/ui/stat-bar';
import { TypeBadge } from '../../shared/ui/type-badge';

/**
 * Fiche complète d'un dev existant, avec ses actions.
 * Le dev est obligatoire : la page parente gère le chargement et les numéros inconnus.
 */
@Component({
  selector: 'app-dev-profile',
  imports: [RouterLink, TypeColor, DexNumberPipe, TotalStatsPipe, DevAvatar, StatBar, TypeBadge],
  templateUrl: './dev-profile.html',
  styleUrl: './dev-profile.css',
})
export class DevProfile {
  private readonly repository = inject(DevRepository);
  private readonly confirmation = inject(Confirmation);
  private readonly router = inject(Router);
  protected readonly team = inject(Team);
  protected readonly pc = inject(Pc);

  readonly dev = input.required<Dev>();

  protected readonly statKeys = STAT_KEYS;
  protected readonly statLabels = STAT_LABELS;
  protected readonly maxTotal = MAX_TOTAL;

  protected readonly previous = computed(() =>
    previousEvolution(this.repository.devs(), this.dev()),
  );
  protected readonly next = computed(() => {
    const target = this.dev().evolvesTo;
    return target === undefined ? undefined : this.repository.byId(target);
  });

  /**
   * Statistique mise en avant : par défaut la meilleure du dev affiché.
   * L'utilisateur peut en choisir une autre ; le choix est réinitialisé
   * quand on passe à un autre dev.
   */
  protected readonly focusedStat = linkedSignal<StatKey>(() => bestStat(this.dev().stats));

  protected readonly devCount = computed(() => this.repository.devs().length);

  /** Rang du dev pour la statistique mise en avant (1 = meilleur). */
  protected readonly focusedRank = computed(() => {
    const dev = this.dev();
    const key = this.focusedStat();
    return this.repository.devs().filter((other) => other.stats[key] > dev.stats[key]).length + 1;
  });

  /** Autres devs partageant le type principal. */
  protected readonly sameType = computed(() => {
    const dev = this.dev();
    return this.repository
      .devs()
      .filter((other) => other.id !== dev.id && other.types.includes(dev.types[0]));
  });

  protected toggleTeam(id: number): void {
    if (!this.team.toggle(id)) {
      this.pc.offer(id);
    }
  }

  /** Après confirmation, retire le dev du pokédex, de l'équipe et du PC. */
  protected async remove(dev: Dev): Promise<void> {
    const confirmed = await this.confirmation.ask({
      title: `Supprimer ${dev.name} ?`,
      message: `${dev.name} sera définitivement retiré du pokédex.`,
      confirmLabel: 'Supprimer',
    });
    if (!confirmed) {
      return;
    }
    this.repository.remove(dev.id);
    this.team.remove(dev.id);
    this.pc.remove(dev.id);
    await this.router.navigate(['/devs']);
  }
}
