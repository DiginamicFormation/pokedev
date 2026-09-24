import { Pipe, PipeTransform } from '@angular/core';
import { formatDexNumber } from '../../domain/dev-rules';

/** Affiche un numéro façon pokédex : {{ 7 | dexNumber }} → #007 */
@Pipe({ name: 'dexNumber' })
export class DexNumberPipe implements PipeTransform {
  transform(id: number): string {
    return formatDexNumber(id);
  }
}
