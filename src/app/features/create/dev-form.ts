import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import {
  FormField,
  form,
  max,
  maxLength,
  min,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { DevRepository } from '../../core/data/dev-repository';
import { DEV_TYPES, Dev, DevInfo, MAX_STAT, MAX_TOTAL, STAT_KEYS } from '../../domain/dev.model';
import { totalStats } from '../../domain/dev-rules';
import { STAT_LABELS } from '../../domain/labels';
import { TypeLabelPipe } from '../../shared/pipes/type-label-pipe';
import { devToDraft, draftToDev, emptyDraft, splitLanguages } from './dev-draft';

/**
 * Formulaire d'un dev, partagé par la création et la modification.
 * Le slot [actions] reçoit les liens ou boutons placés à côté du bouton d'envoi.
 */
@Component({
  selector: 'app-dev-form',
  imports: [FormField, TypeLabelPipe],
  templateUrl: './dev-form.html',
  styleUrl: './dev-form.css',
})
export class DevForm {
  private readonly repository = inject(DevRepository);

  /** Dev à modifier ; absent pour une création. */
  readonly dev = input<Dev>();
  readonly submitLabel = input.required<string>();
  /** Émis avec les informations saisies, seulement si le formulaire est valide. */
  readonly submitted = output<DevInfo>();

  protected readonly types = DEV_TYPES;
  protected readonly statKeys = STAT_KEYS;
  protected readonly statLabels = STAT_LABELS;
  protected readonly maxTotal = MAX_TOTAL;

  /** Valeurs saisies ; elles repartent de celles du dev s'il change. */
  protected readonly draft = linkedSignal(() => {
    const dev = this.dev();
    return dev ? devToDraft(dev) : emptyDraft();
  });

  protected readonly devForm = form(this.draft, (path) => {
    required(path.name, { message: 'Le nom est obligatoire.' });
    minLength(path.name, 2, { message: 'Au moins 2 caractères.' });
    maxLength(path.name, 30, { message: 'Au plus 30 caractères.' });
    validate(path.name, ({ value }) => {
      const name = value().trim().toLowerCase();
      // Le dev modifié a le droit de garder son propre nom.
      const taken = this.repository
        .devs()
        .some((dev) => dev.id !== this.dev()?.id && dev.name.toLowerCase() === name);
      return taken ? { kind: 'unique', message: 'Ce nom est déjà pris.' } : undefined;
    });

    required(path.title, { message: 'Le poste est obligatoire.' });
    maxLength(path.title, 50, { message: 'Au plus 50 caractères.' });

    validate(path.secondaryType, ({ value, valueOf }) =>
      value() !== '' && value() === valueOf(path.primaryType)
        ? { kind: 'duplicate', message: 'Le type secondaire doit différer du type principal.' }
        : undefined,
    );

    for (const key of STAT_KEYS) {
      min(path.stats[key], 0, { message: 'Minimum : 0.' });
      max(path.stats[key], MAX_STAT, { message: `Maximum : ${MAX_STAT}.` });
    }
    validate(path.stats, ({ value }) =>
      totalStats(value()) > MAX_TOTAL
        ? { kind: 'total', message: `Le total ne doit pas dépasser ${MAX_TOTAL}.` }
        : undefined,
    );

    validate(path.languages, ({ value }) =>
      splitLanguages(value()).length === 0
        ? { kind: 'languages', message: 'Indiquez au moins un langage.' }
        : undefined,
    );

    maxLength(path.catchphrase, 120, { message: 'Au plus 120 caractères.' });
  });

  protected readonly total = computed(() => totalStats(this.draft().stats));

  /** Vrai dès que l'utilisateur a modifié un champ. */
  readonly dirty = computed(() => this.devForm().dirty());

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.devForm, async (field) => {
      this.submitted.emit(draftToDev(field().value()));
      return undefined;
    });
  }
}
