import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Team } from '../../core/team/team';
import { DEV_TYPES, MAX_TEAM_SIZE, MAX_TOTAL, STAT_KEYS } from '../../domain/dev.model';
import { STAT_LABELS } from '../../domain/labels';
import { BackupPanel } from '../backup/backup-panel';
import { DexNumberPipe } from '../../shared/pipes/dex-number-pipe';
import { TotalStatsPipe } from '../../shared/pipes/total-stats-pipe';
import { TypeLabelPipe } from '../../shared/pipes/type-label-pipe';
import { DevAvatar } from '../../shared/ui/dev-avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatBar } from '../../shared/ui/stat-bar';

@Component({
  selector: 'app-team-page',
  imports: [
    DecimalPipe,
    RouterLink,
    BackupPanel,
    DexNumberPipe,
    TotalStatsPipe,
    TypeLabelPipe,
    DevAvatar,
    EmptyState,
    StatBar,
  ],
  templateUrl: 'team-page.html',
  styleUrl: './team-page.css',
})
export class TeamPage {
  protected readonly team = inject(Team);

  protected readonly maxSize = MAX_TEAM_SIZE;
  protected readonly statKeys = STAT_KEYS;
  protected readonly statLabels = STAT_LABELS;

  protected readonly maxTeamTotal = MAX_TOTAL * MAX_TEAM_SIZE;

  protected readonly missingTypes = computed(() =>
    DEV_TYPES.filter((type) => !this.team.coverage().includes(type)),
  );
}
