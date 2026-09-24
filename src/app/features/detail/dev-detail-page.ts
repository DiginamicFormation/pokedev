import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { DexNumberPipe } from '../../shared/pipes/dex-number-pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { DevProfile } from './dev-profile';

/** Page d'un dev : retrouve le dev à partir du numéro de la route, puis affiche sa fiche. */
@Component({
  selector: 'app-dev-detail-page',
  imports: [RouterLink, DexNumberPipe, EmptyState, DevProfile],
  templateUrl: './dev-detail-page.html',
})
export class DevDetailPage {
  private readonly repository = inject(DevRepository);

  /** Paramètre de route :id, converti en nombre. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly isLoading = this.repository.isLoading;
  protected readonly dev = computed(() => this.repository.byId(this.id()));
}
