import {
  COLD_BELOW,
  CurrentWeather,
  TOO_HOT_FROM,
  describeWeather,
  isFairWeather,
  weatherAdvice,
} from './weather';

const CLEAR = 0;
const PARTLY_CLOUDY = 2;
const OVERCAST = 3;
const RAIN = 61;
const THUNDERSTORM = 95;

const weather = (temperature: number, code: number): CurrentWeather => ({
  temperature,
  code,
  isDay: true,
});

describe('describeWeather', () => {
  it.each([
    [CLEAR, 'Ciel dégagé', '☀️'],
    [PARTLY_CLOUDY, 'Partiellement nuageux', '⛅'],
    [48, 'Brouillard', '🌫️'],
    [RAIN, 'Pluie', '🌧️'],
    [75, 'Neige', '🌨️'],
    [99, 'Orage avec grêle', '⛈️'],
  ])('décrit le code %i : %s', (code, label, icon) => {
    expect(describeWeather(code, true)).toEqual({ label, icon });
  });

  it('montre la lune par ciel dégagé la nuit', () => {
    expect(describeWeather(CLEAR, false)).toEqual({ label: 'Ciel dégagé', icon: '🌙' });
    expect(describeWeather(1, false).icon).toBe('🌙');
  });

  it('garde le pictogramme des autres temps la nuit', () => {
    expect(describeWeather(RAIN, false).icon).toBe('🌧️');
  });

  it('signale un code inconnu', () => {
    expect(describeWeather(42, true)).toEqual({ label: 'Temps inconnu', icon: '🌡️' });
  });
});

describe('isFairWeather', () => {
  it.each([0, 1, 2])('considère le code %i comme du beau temps', (code) => {
    expect(isFairWeather(code)).toBe(true);
  });

  it.each([OVERCAST, 45, 53, RAIN, 71, 80, THUNDERSTORM])(
    'ne considère pas le code %i comme du beau temps',
    (code) => {
      expect(isFairWeather(code)).toBe(false);
    },
  );
});

describe('weatherAdvice', () => {
  it('conseille de sortir les devs quand il fait beau et bon', () => {
    expect(weatherAdvice(weather(22, CLEAR))).toBe('go-out');
  });

  it('prend les seuils au degré près', () => {
    expect(weatherAdvice(weather(COLD_BELOW, PARTLY_CLOUDY))).toBe('go-out');
    expect(weatherAdvice(weather(COLD_BELOW - 1, PARTLY_CLOUDY))).toBe('stay-inside');
    expect(weatherAdvice(weather(TOO_HOT_FROM - 1, CLEAR))).toBe('go-out');
    expect(weatherAdvice(weather(TOO_HOT_FROM, CLEAR))).toBe('keep-cool');
  });

  it('juge la température arrondie au degré, comme elle est affichée', () => {
    expect(weatherAdvice(weather(TOO_HOT_FROM - 0.5, CLEAR))).toBe('keep-cool');
    expect(weatherAdvice(weather(TOO_HOT_FROM - 0.6, CLEAR))).toBe('go-out');
    expect(weatherAdvice(weather(COLD_BELOW - 0.5, CLEAR))).toBe('go-out');
    expect(weatherAdvice(weather(COLD_BELOW - 0.6, CLEAR))).toBe('stay-inside');
  });

  it('conseille de les garder au frais quand il fait trop chaud, même par mauvais temps', () => {
    expect(weatherAdvice(weather(33, CLEAR))).toBe('keep-cool');
    expect(weatherAdvice(weather(31, THUNDERSTORM))).toBe('keep-cool');
  });

  it('conseille de les garder à l’intérieur quand il fait froid, même au soleil', () => {
    expect(weatherAdvice(weather(4, CLEAR))).toBe('stay-inside');
  });

  it.each([
    ['couvert', OVERCAST],
    ['pluvieux', RAIN],
    ['orageux', THUNDERSTORM],
  ])('conseille de les garder à l’intérieur par temps %s', (_, code) => {
    expect(weatherAdvice(weather(20, code))).toBe('stay-inside');
  });
});
