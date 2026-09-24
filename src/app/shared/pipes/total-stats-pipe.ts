import { Pipe, PipeTransform } from '@angular/core';
import { DevStats } from '../../domain/dev.model';
import { totalStats } from '../../domain/dev-rules';

/** Somme des six statistiques : {{ dev.stats | totalStats }} */
@Pipe({ name: 'totalStats' })
export class TotalStatsPipe implements PipeTransform {
  transform(stats: DevStats): number {
    return totalStats(stats);
  }
}
