import { DevType, StatKey } from './dev.model';
import { WeatherAdvice } from './weather';

export const TYPE_LABELS: Record<DevType, string> = {
  frontend: 'Front-end',
  backend: 'Back-end',
  devops: 'DevOps',
  data: 'Data',
  mobile: 'Mobile',
  securite: 'Sécurité',
};

export const STAT_LABELS: Record<StatKey, string> = {
  code: 'Code',
  debug: 'Debug',
  archi: 'Architecture',
  tests: 'Tests',
  communication: 'Communication',
  cafe: 'Café',
};

export const ADVICE_LABELS: Record<WeatherAdvice, string> = {
  'go-out': 'Sortez vos devs !',
  'keep-cool': 'Gardez vos devs au frais',
  'stay-inside': 'Gardez vos devs à l’intérieur',
};
