/** Temps qu'il fait à la position de l'utilisateur. */
export interface CurrentWeather {
  /** Température en degrés Celsius. */
  readonly temperature: number;
  /** Code météo WMO : 0 pour un ciel dégagé, 61 pour de la pluie… */
  readonly code: number;
  readonly isDay: boolean;
}

export interface WeatherDescription {
  readonly label: string;
  readonly icon: string;
}

/** Conseil donné pour les devs selon la météo. */
export type WeatherAdvice = 'go-out' | 'keep-cool' | 'stay-inside';

/** À partir de cette température (°C), il fait trop chaud. */
export const TOO_HOT_FROM = 28;
/** En dessous de cette température (°C), il fait froid. */
export const COLD_BELOW = 15;

type WeatherEntry = readonly [codes: readonly number[], label: string, icon: string];

/** Libellés des codes météo WMO, regroupés par temps. */
const DESCRIPTIONS: readonly WeatherEntry[] = [
  [[0], 'Ciel dégagé', '☀️'],
  [[1], 'Plutôt dégagé', '🌤️'],
  [[2], 'Partiellement nuageux', '⛅'],
  [[3], 'Couvert', '☁️'],
  [[45, 48], 'Brouillard', '🌫️'],
  [[51, 53, 55], 'Bruine', '🌦️'],
  [[56, 57, 66, 67], 'Pluie verglaçante', '🌧️'],
  [[61, 63, 65], 'Pluie', '🌧️'],
  [[80, 81, 82], 'Averses', '🌦️'],
  [[71, 73, 75, 77], 'Neige', '🌨️'],
  [[85, 86], 'Averses de neige', '🌨️'],
  [[95], 'Orage', '⛈️'],
  [[96, 99], 'Orage avec grêle', '⛈️'],
];

/** Libellé et pictogramme d'un code météo ; la nuit, un ciel dégagé montre la lune. */
export function describeWeather(code: number, isDay: boolean): WeatherDescription {
  const found = DESCRIPTIONS.find(([codes]) => codes.includes(code));
  if (!found) {
    return { label: 'Temps inconnu', icon: '🌡️' };
  }
  const [, label, icon] = found;
  return { label, icon: !isDay && code <= 1 ? '🌙' : icon };
}

/** Beau temps : ciel dégagé à partiellement nuageux (codes WMO 0 à 2). */
export function isFairWeather(code: number): boolean {
  return code >= 0 && code <= 2;
}

/**
 * Sortir les devs s'il fait beau et bon, les garder au frais s'il fait trop chaud,
 * à l'intérieur s'il fait froid ou mauvais. La chaleur l'emporte : même sous l'orage,
 * il vaut mieux les garder au frais.
 * La température est jugée arrondie au degré, comme elle est affichée : à 27,6 °C,
 * l'utilisateur lit « 28 °C », il fait donc déjà trop chaud.
 */
export function weatherAdvice({ temperature, code }: CurrentWeather): WeatherAdvice {
  const degrees = Math.round(temperature);
  if (degrees >= TOO_HOT_FROM) {
    return 'keep-cool';
  }
  if (degrees >= COLD_BELOW && isFairWeather(code)) {
    return 'go-out';
  }
  return 'stay-inside';
}
