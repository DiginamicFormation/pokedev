import { Component, inject } from '@angular/core';
import { ConfirmDialog } from './core/dialog/confirm-dialog';
import { Loading } from './core/http/loading';
import { Pc } from './core/pc/pc';
import { Team } from './core/team/team';
import { WeatherWidget } from './features/weather/weather-widget';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog, WeatherWidget],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly loading = inject(Loading);
  protected readonly team = inject(Team);
  protected readonly pc = inject(Pc);
}
