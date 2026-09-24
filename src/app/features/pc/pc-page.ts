import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { Dev, MAX_TEAM_SIZE, MAX_TOTAL } from '../../domain/dev.model';
import { TypeColor } from '../../shared/directives/type-color';
import { DexNumberPipe } from '../../shared/pipes/dex-number-pipe';
import { TotalStatsPipe } from '../../shared/pipes/total-stats-pipe';
import { DevAvatar } from '../../shared/ui/dev-avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatBar } from '../../shared/ui/stat-bar';
import { TypeBadge } from '../../shared/ui/type-badge';
import { BackupPanel } from '../backup/backup-panel';

@Component({
  selector: 'app-pc-page',
  imports: [
    RouterLink,
    BackupPanel,
    TypeColor,
    DexNumberPipe,
    TotalStatsPipe,
    DevAvatar,
    EmptyState,
    StatBar,
    TypeBadge,
  ],
  templateUrl: './pc-page.html',
  styleUrl: './pc-page.css',
  // Les flèches du clavier font défiler le carrousel quand le focus est dans la page.
  host: {
    '(keydown.arrowleft)': 'show(index() - 1)',
    '(keydown.arrowright)': 'show(index() + 1)',
  },
})
export class PcPage {
  private readonly repository = inject(DevRepository);
  protected readonly pc = inject(Pc);
  protected readonly team = inject(Team);

  protected readonly maxTeamSize = MAX_TEAM_SIZE;
  protected readonly maxTotal = MAX_TOTAL;
  protected readonly isLoading = this.repository.isLoading;

  protected readonly count = computed(() => this.pc.members().length);

  /**
   * Position dans le carrousel. Quand un dev quitte le PC, on reste à la même
   * place (le suivant prend sa place), sans dépasser le dernier.
   */
  protected readonly index = linkedSignal<readonly Dev[], number>({
    source: this.pc.members,
    computation: (members, previous) =>
      Math.min(previous?.value ?? 0, Math.max(members.length - 1, 0)),
  });

  /** Sens du dernier déplacement, qui détermine le sens de l'animation. */
  protected readonly direction = signal<'next' | 'previous'>('next');

  protected readonly current = computed(() => this.pc.members()[this.index()]);

  /** Affiche le dev à la position donnée ; le carrousel boucle aux extrémités. */
  protected show(index: number): void {
    const count = this.count();
    if (count > 0) {
      this.direction.set(index < this.index() ? 'previous' : 'next');
      this.index.set((index + count) % count);
    }
  }
}
