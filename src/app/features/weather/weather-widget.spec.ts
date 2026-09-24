import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { GEOLOCATION } from '../../core/weather/geolocation';
import { WEATHER_REFRESH_INTERVAL, Weather, WeatherState } from '../../core/weather/weather';
import { failingWith, locatedAt } from '../../testing/fake-geolocation';
import { WeatherAdvice, describeWeather } from '../../domain/weather';
import { WeatherWidget } from './weather-widget';

describe('WeatherWidget', () => {
  const state = signal<WeatherState>({ status: 'loading' });
  let element: HTMLElement;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    state.set({ status: 'loading' });
    TestBed.configureTestingModule({ providers: [{ provide: Weather, useValue: { state } }] });
    const fixture = TestBed.createComponent(WeatherWidget);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  /** Passe à un temps connu puis attend le rendu. */
  async function show(temperature: number, code: number, advice: WeatherAdvice): Promise<void> {
    state.set({
      status: 'ready',
      weather: { temperature, code, isDay: true },
      description: describeWeather(code, true),
      advice,
    });
    await stable();
  }

  /** Texte affiché, espaces du gabarit réduits. */
  const text = () => element.textContent?.replace(/\s+/g, ' ').trim();
  const bubble = () => element.querySelector('.weather')!;

  it('annonce les changements aux lecteurs d’écran', () => {
    expect(element.getAttribute('role')).toBe('status');
  });

  it('patiente pendant la recherche de la météo', () => {
    expect(text()).toBe('Météo…');
  });

  it('affiche le temps, la température arrondie et le conseil', async () => {
    await show(22.6, 0, 'go-out');

    expect(text()).toContain('23 °C · Sortez vos devs !');
    // Le pictogramme est décoratif ; le libellé, masqué à l'écran, est lu par les lecteurs d'écran.
    expect(element.querySelector('[aria-hidden="true"]')?.textContent).toBe('☀️');
    expect(element.querySelector('.visually-hidden')?.textContent).toBe('Ciel dégagé,');
    expect(bubble().getAttribute('title')).toBe('Ciel dégagé');
  });

  it('met en valeur le conseil de sortir', async () => {
    await show(22, 0, 'go-out');
    expect(bubble().classList).toContain('go-out');

    await show(20, 61, 'stay-inside');
    expect(bubble().classList).not.toContain('go-out');
  });

  it.each([
    [31, 0, 'keep-cool', 'Gardez vos devs au frais'],
    [4, 0, 'stay-inside', 'Gardez vos devs à l’intérieur'],
    [18, 61, 'stay-inside', 'Gardez vos devs à l’intérieur'],
  ] as const)('à %i °C (code %i), conseille : %s', async (temperature, code, advice, label) => {
    await show(temperature, code, advice);

    expect(element.querySelector('strong')?.textContent).toBe(label);
  });

  it('explique comment obtenir la météo quand la géolocalisation est refusée', async () => {
    state.set({ status: 'denied' });
    await stable();

    expect(text()).toBe('Météo indisponible');
    expect(bubble().getAttribute('title')).toBe('Autorisez la géolocalisation pour voir la météo.');
  });

  it('signale une météo indisponible', async () => {
    state.set({ status: 'unavailable' });
    await stable();

    expect(text()).toBe('Météo indisponible');
    expect(bubble().getAttribute('title')).toBe('La météo n’a pas pu être récupérée.');
  });
});

/** De la position à l'affichage : le widget avec le vrai service, une géolocalisation simulée et une fausse API. */
describe('WeatherWidget, de la géolocalisation à l’affichage', () => {
  let element: HTMLElement;
  let http: HttpTestingController;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();
  /** Texte affiché, espaces du gabarit réduits. */
  const text = () => element.textContent?.replace(/\s+/g, ' ').trim();
  /** Réponse d'Open-Meteo. */
  const forecast = (temperature: number, code: number, isDay = 1) => ({
    current: { temperature_2m: temperature, weather_code: code, is_day: isDay },
  });

  async function render(geolocation: Geolocation): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GEOLOCATION, useValue: geolocation },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(WeatherWidget);
    element = fixture.nativeElement;
    TestBed.tick();
  }

  /** Répond à la requête météo, émise une fois la position connue, puis attend le rendu. */
  async function answer(response: object): Promise<void> {
    const request: TestRequest = await vi.waitFor(() => {
      TestBed.tick();
      return http.expectOne((req) => req.url.startsWith('https://api.open-meteo.com/'));
    });
    request.flush(response);
    await stable();
  }

  afterEach(() => http.verify());

  it('affiche la météo et le conseil pour la position de l’utilisateur', async () => {
    await render(locatedAt(48.8566, 2.3522));
    expect(text()).toBe('Météo…');

    await answer(forecast(22.4, 2));

    expect(text()).toContain('22 °C · Sortez vos devs !');
    expect(element.querySelector('[aria-hidden="true"]')?.textContent).toBe('⛅');
    expect(element.querySelector('.visually-hidden')?.textContent).toBe('Partiellement nuageux,');
  });

  it('montre la lune par une nuit dégagée', async () => {
    await render(locatedAt(48.85, 2.35));

    await answer(forecast(18, 0, 0));

    expect(element.querySelector('[aria-hidden="true"]')?.textContent).toBe('🌙');
  });

  it.each([
    [27.6, 0, '28 °C · Gardez vos devs au frais'],
    [14.6, 0, '15 °C · Sortez vos devs !'],
    [-0.4, 71, '0 °C · Gardez vos devs à l’intérieur'],
  ])('donne un conseil cohérent avec la température affichée (%s °C)', async (t, code, shown) => {
    await render(locatedAt(48.85, 2.35));

    await answer(forecast(t, code));

    expect(text()).toContain(shown);
  });

  it('invite à autoriser la géolocalisation si elle est refusée', async () => {
    await render(failingWith(1));
    await stable();

    expect(text()).toBe('Météo indisponible');
    expect(element.querySelector('.weather')?.getAttribute('title')).toBe(
      'Autorisez la géolocalisation pour voir la météo.',
    );
  });

  it('signale un service météo en panne', async () => {
    await render(locatedAt(48.85, 2.35));

    await answer({ error: true, reason: 'Service indisponible' });

    expect(text()).toBe('Météo indisponible');
  });

  describe("tous les quarts d'heure", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
    afterEach(() => vi.useRealTimers());

    it('met la météo à jour sans jamais revenir à « Météo… »', async () => {
      await render(locatedAt(48.85, 2.35));
      await answer(forecast(22, 0));

      vi.advanceTimersByTime(WEATHER_REFRESH_INTERVAL);
      TestBed.tick();
      await Promise.resolve();
      expect(text()).toContain('22 °C · Sortez vos devs !');

      await answer(forecast(31, 0));
      expect(text()).toContain('31 °C · Gardez vos devs au frais');
    });
  });
});
