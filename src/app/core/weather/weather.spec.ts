import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { failingWith, fakeGeolocation, locatedAt } from '../../testing/fake-geolocation';
import { GEOLOCATION } from './geolocation';
import { WEATHER_URL } from './open-meteo';
import { WEATHER_REFRESH_INTERVAL, Weather } from './weather';

const URL = 'https://api.open-meteo.com/v1/forecast';

describe('Weather', () => {
  let http: HttpTestingController;
  let weather: Weather;

  function setup(geolocation: Geolocation | undefined): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GEOLOCATION, useValue: geolocation },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    weather = TestBed.inject(Weather);
  }

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  /** Attend la requête météo, émise une fois la position connue. */
  function request(): Promise<TestRequest> {
    return vi.waitFor(() => {
      TestBed.tick();
      return http.expectOne((req) => req.url === URL);
    });
  }

  afterEach(() => http.verify());

  it('patiente tant que la position et la météo ne sont pas connues', async () => {
    setup(locatedAt(48.8566, 2.3522));
    expect(weather.state()).toEqual({ status: 'loading' });

    await request();
    expect(weather.state()).toEqual({ status: 'loading' });
  });

  it('demande le temps actuel à la position arrondie au kilomètre', async () => {
    setup(locatedAt(48.8566, 2.3522));

    const { request: sent } = await request();

    expect(sent.url).toBe(URL);
    expect(sent.params.get('latitude')).toBe('48.86');
    expect(sent.params.get('longitude')).toBe('2.35');
    expect(sent.params.get('current')).toBe('temperature_2m,weather_code,is_day');
  });

  it("utilise l'adresse du jeton WEATHER_URL", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: WEATHER_URL, useValue: 'https://meteo.test/v1' }],
    });
    setup(locatedAt(48.85, 2.35));

    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne((req) => req.url === 'https://meteo.test/v1');
    });
  });

  it('décrit le temps et donne le conseil correspondant', async () => {
    setup(locatedAt(48.85, 2.35));

    (await request()).flush({ current: { temperature_2m: 22.4, weather_code: 1, is_day: 1 } });
    await stable();

    expect(weather.state()).toEqual({
      status: 'ready',
      weather: { temperature: 22.4, code: 1, isDay: true },
      description: { label: 'Plutôt dégagé', icon: '🌤️' },
      advice: 'go-out',
    });
  });

  it('signale un refus de géolocalisation, sans appeler le service météo', async () => {
    setup(failingWith(1));
    await stable();

    expect(weather.state()).toEqual({ status: 'denied' });
  });

  it('signale une position introuvable', async () => {
    setup(failingWith(2));
    await stable();

    expect(weather.state()).toEqual({ status: 'unavailable' });
  });

  it("signale l'absence de géolocalisation", async () => {
    setup(undefined);
    await stable();

    expect(weather.state()).toEqual({ status: 'unavailable' });
  });

  it('signale une erreur inattendue de la géolocalisation', async () => {
    setup(
      fakeGeolocation(() => {
        throw new Error('Géolocalisation bloquée par la politique de sécurité.');
      }),
    );
    await stable();

    expect(weather.state()).toEqual({ status: 'unavailable' });
  });

  it('signale un service météo en panne', async () => {
    setup(locatedAt(48.85, 2.35));

    (await request()).flush('Erreur', { status: 503, statusText: 'Service Unavailable' });
    await stable();

    expect(weather.state()).toEqual({ status: 'unavailable' });
  });

  it('signale une réponse météo inattendue', async () => {
    setup(locatedAt(48.85, 2.35));

    (await request()).flush({ error: true, reason: 'Latitude must be in range' });
    await stable();

    expect(weather.state()).toEqual({ status: 'unavailable' });
  });

  describe('rechargement', () => {
    /** Réponse d'Open-Meteo pour un ciel dégagé, de jour. */
    const sunny = (temperature: number) => ({
      current: { temperature_2m: temperature, weather_code: 0, is_day: 1 },
    });

    /** Laisse passer un quart d'heure. */
    const quarterPasses = () => vi.advanceTimersByTime(WEATHER_REFRESH_INTERVAL);

    // Seul setInterval est simulé : il rythme les rechargements, sans gêner Angular.
    beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
    afterEach(() => vi.useRealTimers());

    it("redemande la météo tous les quarts d'heure, sans effacer celle affichée", async () => {
      setup(locatedAt(48.85, 2.35));
      (await request()).flush(sunny(22));
      await stable();

      quarterPasses();
      const refreshed = await request();
      expect(weather.state()).toMatchObject({ status: 'ready', weather: { temperature: 22 } });

      refreshed.flush(sunny(12));
      await stable();
      expect(weather.state()).toMatchObject({
        status: 'ready',
        weather: { temperature: 12 },
        advice: 'stay-inside',
      });
    });

    it("suit l'utilisateur s'il s'est déplacé", async () => {
      let place = { latitude: 48.85, longitude: 2.35 };
      setup(fakeGeolocation((success) => success({ coords: place } as GeolocationPosition)));
      (await request()).flush(sunny(22));
      await stable();

      place = { latitude: 45.76, longitude: 4.84 };
      quarterPasses();

      const moved = await vi.waitFor(() => {
        TestBed.tick();
        return http.expectOne((req) => req.url === URL && req.params.get('latitude') === '45.76');
      });
      // Le rechargement éventuellement parti avec l'ancienne position a été annulé.
      const stale = http.match((req) => req.params.get('latitude') === '48.85');
      expect(stale.every((req) => req.cancelled)).toBe(true);

      moved.flush(sunny(26));
      await stable();
      expect(weather.state()).toMatchObject({ status: 'ready', weather: { temperature: 26 } });
    });

    it('réessaie après une position introuvable', async () => {
      let attempts = 0;
      setup(
        fakeGeolocation((success, error) =>
          attempts++ === 0
            ? error({ code: 3, message: 'Délai dépassé' } as GeolocationPositionError)
            : success({ coords: { latitude: 48.85, longitude: 2.35 } } as GeolocationPosition),
        ),
      );
      await stable();
      expect(weather.state()).toEqual({ status: 'unavailable' });

      quarterPasses();
      (await request()).flush(sunny(20));
      await stable();

      expect(weather.state()).toMatchObject({ status: 'ready', weather: { temperature: 20 } });
    });

    it('réessaie après une panne du service météo', async () => {
      setup(locatedAt(48.85, 2.35));
      (await request()).flush('Erreur', { status: 503, statusText: 'Service Unavailable' });
      await stable();
      expect(weather.state()).toEqual({ status: 'unavailable' });

      quarterPasses();
      (await request()).flush(sunny(20));
      await stable();

      expect(weather.state()).toMatchObject({ status: 'ready', weather: { temperature: 20 } });
    });

    it("cesse les rechargements quand l'application est détruite", () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      setup(locatedAt(48.85, 2.35));
      // jsdom crée aussi un intervalle pour requestAnimationFrame : on cible celui de la météo.
      const index = setIntervalSpy.mock.calls.findIndex(
        ([, delay]) => delay === WEATHER_REFRESH_INTERVAL,
      );
      const refreshTimer = setIntervalSpy.mock.results[index].value;

      TestBed.resetTestingModule();

      expect(clearIntervalSpy).toHaveBeenCalledWith(refreshTimer);
    });
  });
});
