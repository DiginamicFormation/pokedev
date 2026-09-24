import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Loading } from './loading';
import { loadingInterceptor } from './loading-interceptor';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let loading: Loading;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(Loading);
  });

  afterEach(() => controller.verify());

  it('est actif pendant la requête', () => {
    http.get('/api').subscribe();
    expect(loading.active()).toBe(true);

    controller.expectOne('/api').flush({});
    expect(loading.active()).toBe(false);
  });

  it('redevient inactif après une erreur', () => {
    http.get('/api').subscribe({ error: () => undefined });
    controller.expectOne('/api').flush('Erreur', { status: 500, statusText: 'Server Error' });
    expect(loading.active()).toBe(false);
  });
});
