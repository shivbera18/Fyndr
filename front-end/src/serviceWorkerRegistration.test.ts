import { register } from './serviceWorkerRegistration';

jest.useFakeTimers();

describe('serviceWorkerRegistration update checks', () => {
  const updateMock = jest.fn().mockResolvedValue(undefined);
  // Test double for the SW container: structural subset this module touches.
  const fakeRegistration = {
    waiting: { postMessage: jest.fn() },
    installing: null,
    update: updateMock,
  } as unknown as ServiceWorkerRegistration;
  // Plain-array recorders: CRA resets jest mocks before each test, so mock
  // call history recorded in beforeAll would read back empty.
  const registerCalls: Array<ReadonlyArray<unknown>> = [];
  const registerMock = jest.fn(async (...args: Array<unknown>) => {
    registerCalls.push(args);
    return fakeRegistration;
  });
  const events: CustomEvent<ServiceWorkerRegistration>[] = [];

  beforeAll(async () => {
    process.env.REACT_APP_ENABLE_SW = 'true';
    // jsdom serves from localhost, which takes the fetch-verify path — fake a JS response.
    const globals = globalThis as unknown as Record<string, unknown>;
    globals.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => 'application/javascript' },
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register: registerMock, controller: {} },
      configurable: true,
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    // Executor form: TS lib here predates Promise.withResolvers.
    let onUpdated: () => void = () => undefined;
    const updated = new Promise<void>((resolve) => {
      onUpdated = resolve;
    });
    window.addEventListener('pwa-update-available', (e: Event) => {
      events.push(e as CustomEvent<ServiceWorkerRegistration>);
    });
    window.addEventListener('pwa-update-available', () => onUpdated(), { once: true });
    register();
    window.dispatchEvent(new Event('load'));
    await updated;
  });

  beforeEach(() => {
    // Re-arm: mock implementations are wiped before each test.
    updateMock.mockResolvedValue(undefined);
  });

  test('registers sw.js and notifies when a worker is already waiting', () => {
    expect(registerCalls).toContainEqual(['/sw.js', { scope: '/' }]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].detail).toBe(fakeRegistration);
  });

  test('checks for updates when the app becomes visible or back online', () => {
    updateMock.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
    expect(updateMock).toHaveBeenCalled();
  });

  test('rechecks on the hourly poll', () => {
    updateMock.mockClear();
    jest.advanceTimersByTime(59 * 60 * 1000 + 59 * 1000);
    expect(updateMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
