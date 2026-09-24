import { failingWith, locatedAt } from '../../testing/fake-geolocation';
import { PositionUnavailableError, locate } from './geolocation';

describe('locate', () => {
  it('arrondit la position au centième de degré', async () => {
    await expect(locate(locatedAt(48.85661, 2.35222))).resolves.toEqual({
      latitude: 48.86,
      longitude: 2.35,
    });
  });

  it('accepte une position récente et abandonne après un délai', async () => {
    const geolocation = locatedAt(48.85, 2.35);
    const getCurrentPosition = vi.spyOn(geolocation, 'getCurrentPosition');

    await locate(geolocation);

    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      maximumAge: 600_000,
      timeout: 15_000,
    });
  });

  it('signale un refus de l’utilisateur', async () => {
    const error = await locate(failingWith(1)).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(PositionUnavailableError);
    expect(error).toMatchObject({ denied: true, message: 'Géolocalisation refusée.' });
  });

  it.each([2, 3])('signale une position introuvable (code %i)', async (code) => {
    await expect(locate(failingWith(code))).rejects.toMatchObject({
      denied: false,
      message: 'Position indisponible.',
    });
  });

  it('signale l’absence de géolocalisation', async () => {
    await expect(locate(undefined)).rejects.toMatchObject({ denied: false });
  });
});
