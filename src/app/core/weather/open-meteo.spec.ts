import { parseCurrentWeather } from './open-meteo';

/** Extrait d'une vraie réponse d'Open-Meteo. */
const RESPONSE = {
  latitude: 48.84,
  longitude: 2.36,
  current_units: { temperature_2m: '°C', weather_code: 'wmo code', is_day: '' },
  current: {
    time: '2026-09-24T17:45',
    interval: 900,
    temperature_2m: 22.4,
    weather_code: 3,
    is_day: 1,
  },
};

describe('parseCurrentWeather', () => {
  it('extrait la température, le code météo et le moment de la journée', () => {
    expect(parseCurrentWeather(RESPONSE)).toEqual({ temperature: 22.4, code: 3, isDay: true });
  });

  it('reconnaît la nuit', () => {
    const night = { current: { ...RESPONSE.current, is_day: 0 } };
    expect(parseCurrentWeather(night).isDay).toBe(false);
  });

  it.each([
    ['null', null],
    ['une réponse sans temps actuel', { latitude: 48.84 }],
    ['une température absente', { current: { weather_code: 3 } }],
    ['un code météo texte', { current: { temperature_2m: 22.4, weather_code: '3' } }],
  ])('refuse %s', (_, raw) => {
    expect(() => parseCurrentWeather(raw)).toThrow('Réponse météo inattendue.');
  });
});
