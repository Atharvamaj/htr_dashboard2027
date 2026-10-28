// Performance optimization utilities for production

import { logger } from "@/utils/logger";

// Web Vitals and performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, any> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Core Web Vitals observer
    try {
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, {
            value: entry.value || (entry as any).processingStart,
            timestamp: Date.now(),
            entryType: entry.entryType,
          });
        }
      });

      vitalsObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      this.observers.push(vitalsObserver);
    } catch (e) {
      logger.warn('Could not observe Core Web Vitals:', e);
    }

    // Navigation timing observer
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationTiming(entry as PerformanceNavigationTiming);
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (e) {
      logger.warn('Could not observe navigation timing:', e);
    }

    // Resource timing observer
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceTiming(entry as PerformanceResourceTiming);
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (e) {
      logger.warn('Could not observe resource timing:', e);
    }
  }

  private recordMetric(name: string, value: any) {
    this.metrics.set(name, value);
    
    // Report critical metrics immediately
    if (['largest-contentful-paint', 'first-input-delay', 'cumulative-layout-shift'].includes(name)) {
      this.reportMetric(name, value);
    }
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      connect: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domComplete - entry.domLoading,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.navigationStart,
    };

    this.recordMetric('navigation-timing', metrics);
  }

  private recordResourceTiming(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize;
    
    if (duration > 1000 || size > 100000) { // Log slow or large resources
      this.recordMetric('slow-resource', {
        name: entry.name,
        duration,
        size,
        type: entry.initiatorType,
      });
    }
  }

  private reportMetric(name: string, value: any) {
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      // In production, send to your analytics service
      // analytics.track('performance-metric', { name, value });
      logger.log(`[Performance] ${name}:`, value);
    }
  }

  // Public methods
  public startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(`custom-${name}`, { duration, timestamp: Date.now() });
    };
  }

  public recordCustomMetric(name: string, value: any) {
    this.recordMetric(`custom-${name}`, value);
  }

  public getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics.entries());
  }

  public clearMetrics() {
    this.metrics.clear();
  }

  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Lazy loading utilities
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

// Bundle size optimization
export const importComponent = async <T = any>(
  importFunction: () => Promise<{ default: T }>
): Promise<T> => {
  try {
    const module = await importFunction();
    return module.default;
  } catch (error) {
    logger.error('Failed to import component:', error);
    throw error;
  }
};

// Resource preloading
export const preloadResource = (
  href: string,
  as: 'script' | 'style' | 'font' | 'image' | 'fetch' = 'fetch',
  crossorigin?: 'anonymous' | 'use-credentials'
): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (crossorigin) {
    link.crossOrigin = crossorigin;
  }
  
  if (as === 'font') {
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
  }
  
  document.head.appendChild(link);
};

// Memory management
export const createMemoryMonitor = () => {
  const monitor = {
    used: 0,
    total: 0,
    percentage: 0,
  };

  const updateMemoryInfo = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      monitor.used = memory.usedJSHeapSize;
      monitor.total = memory.totalJSHeapSize;
      monitor.percentage = (monitor.used / monitor.total) * 100;
    }
  };

  // Update every 30 seconds in production
  if (import.meta.env.PROD) {
    const interval = setInterval(updateMemoryInfo, 30000);
    updateMemoryInfo(); // Initial check
    
    return {
      ...monitor,
      destroy: () => clearInterval(interval),
    };
  }

  return {
    ...monitor,
    destroy: () => {},
  };
};

// Network optimization
export const createNetworkMonitor = () => {
  if (!('navigator' in window) || !('connection' in navigator)) {
    return {
      effectiveType: 'unknown',
      isSlowConnection: false,
      shouldReduceData: false,
    };
  }

  const connection = (navigator as any).connection;
  
  const getConnectionInfo = () => ({
    effectiveType: connection.effectiveType || 'unknown',
    isSlowConnection: ['slow-2g', '2g'].includes(connection.effectiveType),
    shouldReduceData: connection.saveData || ['slow-2g', '2g'].includes(connection.effectiveType),
    downlink: connection.downlink,
    rtt: connection.rtt,
  });

  return getConnectionInfo();
};

// Image optimization utilities
export const createImageOptimizer = () => {
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  const supportsAvif = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  };

  const getBestFormat = () => {
    if (supportsAvif()) return 'avif';
    if (supportsWebP()) return 'webp';
    return 'jpeg';
  };

  const optimizeImageUrl = (url: string, width?: number, quality?: number) => {
    const params = new URLSearchParams();
    
    if (width) params.append('w', width.toString());
    if (quality) params.append('q', quality.toString());
    params.append('f', getBestFormat());
    
    return `${url}?${params.toString()}`;
  };

  return {
    supportsWebP: supportsWebP(),
    supportsAvif: supportsAvif(),
    getBestFormat,
    optimizeImageUrl,
  };
};

// Bundle analyzer helper
export const analyzeBundleSize = () => {
  if (import.meta.env.DEV) {
    return;
  }

  // Analyze chunk sizes and report large bundles
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  const analyzeResource = async (element: HTMLScriptElement | HTMLLinkElement) => {
    try {
      const response = await fetch(element.src || element.href, { method: 'HEAD' });
      const size = parseInt(response.headers.get('content-length') || '0');
      
      if (size > 500000) { // Report bundles larger than 500KB
        logger.warn(`Large bundle detected: ${element.src || element.href} (${Math.round(size / 1024)}KB)`);
      }
    } catch {
      // Silently fail for cross-origin resources
    }
  };

  [...scripts, ...styles].forEach(analyzeResource);
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  const monitor = PerformanceMonitor.getInstance();
  const memoryMonitor = createMemoryMonitor();
  const networkInfo = createNetworkMonitor();

  // Log initial performance state
  if (import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true') {
    logger.log('Performance monitoring initialized', {
      network: networkInfo,
      memory: {
        used: memoryMonitor.used,
        percentage: memoryMonitor.percentage,
      },
    });
  }

  // Analyze bundle size in production
  setTimeout(analyzeBundleSize, 2000);

  return {
    monitor,
    memoryMonitor,
    networkInfo,
    destroy: () => {
      monitor.destroy();
      memoryMonitor.destroy();
    },
  };
};