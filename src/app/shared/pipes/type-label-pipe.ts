import { Pipe, PipeTransform } from '@angular/core';
import { DevType } from '../../domain/dev.model';
import { TYPE_LABELS } from '../../domain/labels';

/** Libellé lisible d'un type : {{ 'securite' | typeLabel }} → Sécurité */
@Pipe({ name: 'typeLabel' })
export class TypeLabelPipe implements PipeTransform {
  transform(type: DevType): string {
    return TYPE_LABELS[type];
  }
}
