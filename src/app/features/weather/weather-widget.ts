import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Weather } from '../../core/weather/weather';
import { ADVICE_LABELS } from '../../domain/labels';

/**
 * Météo de la barre de navigation : temps, température et conseil pour les devs.
 * role="status" annonce le résultat aux lecteurs d'écran quand il arrive.
 */
@Component({
  selector: 'app-weather-widget',
  imports: [DecimalPipe],
  host: { role: 'status' },
  template: `
    @let state = weather.state();
    @if (state.status === 'ready') {
      <p
        class="weather"
        [class.go-out]="state.advice === 'go-out'"
        [title]="state.description.label"
      >
        <span aria-hidden="true">{{ state.description.icon }}</span>
        <span class="visually-hidden">{{ state.description.label }},</span>
        {{ state.weather.temperature | number: '1.0-0' }}&#8239;°C ·
        <strong>{{ adviceLabels[state.advice] }}</strong>
      </p>
    } @else if (state.status === 'loading') {
      <p class="weather muted">Météo…</p>
    } @else if (state.status === 'denied') {
      <p class="weather muted" title="Autorisez la géolocalisation pour voir la météo.">
        Météo indisponible
      </p>
    } @else {
      <p class="weather muted" title="La météo n’a pas pu être récupérée.">Météo indisponible</p>
    }
  `,
  styles: `
    .weather {
      margin: 0;
      padding: 0.15rem 0.65rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .go-out {
      border-color: transparent;
      background: var(--good-bg);
    }
  `,
})
export class WeatherWidget {
  protected readonly weather = inject(Weather);
  protected readonly adviceLabels = ADVICE_LABELS;
}
