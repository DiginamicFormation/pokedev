import { InjectionToken } from '@angular/core';
import { CurrentWeather } from '../../domain/weather';

/**
 * Adresse du service météo Open-Meteo (gratuit, sans clé, https://open-meteo.com).
 * Un jeton d'injection permet de la remplacer (tests, autre serveur).
 */
export const WEATHER_URL = new InjectionToken<string>('WEATHER_URL', {
  factory: () => 'https://api.open-meteo.com/v1/forecast',
});

/** Données demandées à Open-Meteo pour le temps actuel. */
export const CURRENT_FIELDS = 'temperature_2m,weather_code,is_day';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Valide une réponse d'Open-Meteo ; lève une erreur si elle n'a pas la forme attendue. */
export function parseCurrentWeather(raw: unknown): CurrentWeather {
  const current = isRecord(raw) ? raw['current'] : undefined;
  if (
    !isRecord(current) ||
    typeof current['temperature_2m'] !== 'number' ||
    typeof current['weather_code'] !== 'number'
  ) {
    throw new Error('Réponse météo inattendue.');
  }
  return {
    temperature: current['temperature_2m'],
    code: current['weather_code'],
    // Open-Meteo renvoie 1 le jour et 0 la nuit.
    isDay: current['is_day'] !== 0,
  };
}
