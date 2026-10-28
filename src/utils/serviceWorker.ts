// Service Worker registration and management

import { logger } from "@/utils/logger";

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type ServiceWorkerConfig = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
};

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    // Wait for the page to load before registering
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          logger.log(
            'This web app is being served cache-first by a service ' +
            'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidServiceWorker(swUrl, config);
      }
    });
  }
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      logger.log('Service Worker registered successfully:', registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              logger.log(
                'New content is available and will be used when all ' +
                'tabs for this page are closed. See https://cra.link/PWA.'
              );

              // Execute callback
              if (config?.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              logger.log('Content is cached for offline use.');

              // Execute callback
              if (config?.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      logger.error('Error during service worker registration:', error);
      if (config?.onError) {
        config.onError(error);
      }
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      logger.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        logger.log('Service Worker unregistered');
      })
      .catch(error => {
        logger.error(error.message);
      });
  }
}

// Cache management utilities
export class CacheManager {
  static async clearAllCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      logger.log('All caches cleared');
    }
  }

  static async getCacheSize(): Promise<number> {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  static async clearSpecificCache(cacheName: string): Promise<void> {
    if ('caches' in window) {
      await caches.delete(cacheName);
      logger.log(`Cache ${cacheName} cleared`);
    }
  }

  static async preloadCriticalResources(urls: string[]): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open('critical-resources');
      await cache.addAll(urls);
      logger.log('Critical resources preloaded');
    }
  }
}

// Network status monitoring
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  private constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  addListener(callback: (isOnline: boolean) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (isOnline: boolean) => void): void {
    this.listeners.delete(callback);
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  static measurePerformance(name: string, fn: () => void | Promise<void>): void {
    if ('performance' in window && 'mark' in performance) {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;
      
      performance.mark(startMark);
      
      const result = fn();
      
      if (result instanceof Promise) {
        result.then(() => {
          performance.mark(endMark);
          performance.measure(name, startMark, endMark);
          logger.log(`${name} completed`);
        });
      } else {
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
        logger.log(`${name} completed`);
      }
    }
  }

  static getPerformanceMetrics(): PerformanceEntry[] {
    if ('performance' in window && 'getEntriesByType' in performance) {
      return performance.getEntriesByType('measure');
    }
    return [];
  }

  static clearPerformanceMarks(): void {
    if ('performance' in window && 'clearMarks' in performance) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Background sync utility
export class BackgroundSync {
  static async requestSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        logger.log(`Background sync registered for tag: ${tag}`);
      } catch (error) {
        logger.error('Background sync registration failed:', error);
      }
    }
  }

  static async scheduleDataSync(): Promise<void> {
    await BackgroundSync.requestSync('background-sync');
  }
}

// Initialize service worker for the application
export async function initializeServiceWorker() {
  if (process.env.NODE_ENV === 'production') {
    registerServiceWorker({
      onSuccess: (registration) => {
        logger.log('Service Worker registered successfully:', registration);
      },
      onUpdate: (registration) => {
        logger.log('Service Worker updated, reload to get latest version');
        // Auto-reload after 5 seconds for updates
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      },
      onError: (error) => {
        logger.error('Service Worker registration failed:', error);
      }
    });
    
    // Preload critical resources
    await CacheManager.preloadCriticalResources([
      '/assets/htr_logo_transparent.svg',
      '/manifest.json'
    ]);
  } else {
    logger.log('Service Worker disabled in development mode');
  }
}
