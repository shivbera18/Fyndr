// Service Worker Registration Manager for Fyndr PWA

export interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Long-lived PWA sessions (installed app resumed from background, camera open
// for hours) perform no navigations, so the browser never checks sw.js for
// updates on its own. Poll explicitly plus on visibility/focus/online.
const UPDATE_POLL_MS = 60 * 60 * 1000;
let polledRegistration: ServiceWorkerRegistration | null = null;
let updateTimer: number | null = null;

function notifyUpdate(registration: ServiceWorkerRegistration, config?: Config): void {
  window.dispatchEvent(
    new CustomEvent('pwa-update-available', { detail: registration })
  );
  if (config && config.onUpdate) {
    config.onUpdate(registration);
  }
}

function checkForUpdate(): void {
  polledRegistration?.update().catch(() => {
    // Offline or transient failure — the next poll retries.
  });
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') checkForUpdate();
}

function startUpdatePolling(registration: ServiceWorkerRegistration): void {
  // Always track the latest registration; start the timer/listeners once.
  polledRegistration = registration;
  if (updateTimer !== null) return;
  updateTimer = window.setInterval(checkForUpdate, UPDATE_POLL_MS);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
}

function stopUpdatePolling(): void {
  if (updateTimer !== null) {
    window.clearInterval(updateTimer);
    updateTimer = null;
  }
  polledRegistration = null;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', checkForUpdate);
  window.removeEventListener('online', checkForUpdate);
}

export function register(config?: Config): void {
  if ('serviceWorker' in navigator) {
    // Only register in production OR if explicitly enabled in local development
    const isProd = process.env.NODE_ENV === 'production';
    const forceEnable = process.env.REACT_APP_ENABLE_SW === 'true';

    if (!isProd && !forceEnable) {
      return;
    }

    const registerSW = () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`;

      if (isLocalhost) {
        // Localhost verification: check if sw exists before registering
        checkValidServiceWorker(swUrl, config);
      } else {
        // Production: register directly
        registerValidSW(swUrl, config);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl, { scope: '/' })
    .then((registration) => {
      // An update may already be waiting (found while the page was loading).
      // Controller check mirrors onupdatefound: no controller means first
      // install, not an update.
      if (registration.waiting && navigator.serviceWorker.controller) {
        notifyUpdate(registration, config);
      }
      startUpdatePolling(registration);
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will serve content until all
              // client tabs are closed.
              notifyUpdate(registration, config);
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config): void {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      // Offline mode
    });
}

export function unregister(): void {
  stopUpdatePolling();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
