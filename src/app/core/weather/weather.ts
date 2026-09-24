import { Service, computed, inject, resource } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import {
  CurrentWeather,
  WeatherAdvice,
  WeatherDescription,
  describeWeather,
  weatherAdvice,
} from '../../domain/weather';
import { Coordinates, GEOLOCATION, PositionUnavailableError, locate } from './geolocation';
import { CURRENT_FIELDS, WEATHER_URL, parseCurrentWeather } from './open-meteo';

export type WeatherState =
  | { readonly status: 'loading' }
  /** L'utilisateur a refusé la géolocalisation. */
  | { readonly status: 'denied' }
  /** Position introuvable ou service météo en panne. */
  | { readonly status: 'unavailable' }
  | {
      readonly status: 'ready';
      readonly weather: CurrentWeather;
      readonly description: WeatherDescription;
      readonly advice: WeatherAdvice;
    };

/** Délai entre deux mises à jour de la météo : un quart d'heure. */
export const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;

/** Même endroit, à l'arrondi près : la requête météo n'a pas à changer. */
const samePlace = (a: Coordinates, b: Coordinates) =>
  a.latitude === b.latitude && a.longitude === b.longitude;

/** Météo à la position actuelle, demandée au chargement puis tous les quarts d'heure. */
@Service()
export class Weather {
  private readonly geolocation = inject(GEOLOCATION);
  private readonly url = inject(WEATHER_URL);

  private readonly position = resource({
    loader: () => locate(this.geolocation),
    equal: samePlace,
  });

  /** La météo n'est demandée qu'une fois la position connue. */
  private readonly current = httpResource(
    () => {
      if (!this.position.hasValue()) {
        return undefined;
      }
      const { latitude, longitude } = this.position.value();
      return { url: this.url, params: { latitude, longitude, current: CURRENT_FIELDS } };
    },
    { parse: parseCurrentWeather },
  );

  /**
   * Tous les quarts d'heure, relocalise l'utilisateur et redemande la météo, ce qui permet
   * aussi de réessayer après un échec. reload() garde la météo affichée pendant le
   * rechargement ; si la position a changé, la nouvelle requête remplace celle en cours.
   */
  protected readonly refresh = interval(WEATHER_REFRESH_INTERVAL)
    .pipe(takeUntilDestroyed())
    .subscribe(() => {
      this.position.reload();
      this.current.reload();
    });

  readonly state = computed<WeatherState>(() => {
    const positionError = this.position.error();
    if (positionError) {
      const denied = positionError instanceof PositionUnavailableError && positionError.denied;
      return { status: denied ? 'denied' : 'unavailable' };
    }
    if (this.current.error()) {
      return { status: 'unavailable' };
    }
    if (this.current.hasValue()) {
      const weather = this.current.value();
      return {
        status: 'ready',
        weather,
        description: describeWeather(weather.code, weather.isDay),
        advice: weatherAdvice(weather),
      };
    }
    return { status: 'loading' };
  });
}
