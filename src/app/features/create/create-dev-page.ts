import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { HasUnsavedChanges } from '../../core/navigation/unsaved-changes-guard';
import { DevInfo } from '../../domain/dev.model';
import { DevForm } from './dev-form';

@Component({
  selector: 'app-create-dev-page',
  imports: [DevForm],
  templateUrl: './create-dev-page.html',
})
export class CreateDevPage implements HasUnsavedChanges {
  private readonly repository = inject(DevRepository);
  private readonly router = inject(Router);
  private readonly form = viewChild.required<DevForm>('form');

  private readonly saved = signal(false);

  hasUnsavedChanges(): boolean {
    return this.form().dirty() && !this.saved();
  }

  protected async create(info: DevInfo): Promise<void> {
    const id = this.repository.add(info);
    this.saved.set(true);
    await this.router.navigate(['/devs', id]);
  }
}
