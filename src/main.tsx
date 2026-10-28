import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeServiceWorker } from './utils/serviceWorker'
import { initializePerformanceMonitoring } from './utils/performance'
import { config, validateSecurityHeaders } from './utils/security'
import { initSentry } from './lib/sentry'
import { logger } from './utils/logger'

// Initialize Sentry error tracking (must be first!)
initSentry();

// Initialize service worker for caching
initializeServiceWorker();

// Initialize performance monitoring
initializePerformanceMonitoring();

// Validate security headers in production
if (config.isProduction) {
  validateSecurityHeaders();
}

// Log startup information
if (config.enableDebugLogs) {
  logger.log('HTR Dashboard starting...', {
    version: '1.0.0',
    mode: import.meta.env.MODE,
    timestamp: new Date().toISOString(),
  });
}

createRoot(document.getElementById("root")!).render(<App />);
