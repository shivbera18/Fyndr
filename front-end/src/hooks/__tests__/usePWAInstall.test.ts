import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '../usePWAInstall';

describe('usePWAInstall hook', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with default values in standard environment', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.showGuideModal).toBe(false);
  });

  test('dismiss sets localStorage cooldown and updates isDismissed', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isDismissed).toBe(false);

    act(() => {
      result.current.dismiss(7);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(localStorage.getItem('fyndr_pwa_dismissed_until')).not.toBeNull();
  });

  test('captures beforeinstallprompt event and enables canInstall', () => {
    const { result } = renderHook(() => usePWAInstall());

    const mockPromptEvent = new Event('beforeinstallprompt');
    Object.assign(mockPromptEvent, {
      platforms: ['web'],
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(result.current.canInstall).toBe(true);
  });

  test('tracks online and offline window events', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOffline).toBe(false);
  });

  test('appinstalled event marks app as installed and clears prompt', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });
});
