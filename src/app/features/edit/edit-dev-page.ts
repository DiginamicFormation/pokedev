import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { HasUnsavedChanges } from '../../core/navigation/unsaved-changes-guard';
import { DevInfo } from '../../domain/dev.model';
import { DexNumberPipe } from '../../shared/pipes/dex-number-pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { DevForm } from '../create/dev-form';

@Component({
  selector: 'app-edit-dev-page',
  imports: [RouterLink, DexNumberPipe, EmptyState, DevForm],
  templateUrl: './edit-dev-page.html',
})
export class EditDevPage implements HasUnsavedChanges {
  private readonly repository = inject(DevRepository);
  private readonly router = inject(Router);
  /** Absent tant que le dev n'est pas chargé. */
  private readonly form = viewChild<DevForm>('form');

  /** Paramètre de route :id, converti en nombre. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly isLoading = this.repository.isLoading;
  protected readonly dev = computed(() => this.repository.byId(this.id()));

  private readonly saved = signal(false);

  hasUnsavedChanges(): boolean {
    return (this.form()?.dirty() ?? false) && !this.saved();
  }

  protected async update(info: DevInfo): Promise<void> {
    this.repository.update(this.id(), info);
    this.saved.set(true);
    await this.router.navigate(['/devs', this.id()]);
  }
}
