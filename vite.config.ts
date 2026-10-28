import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(),
    // Sentry plugin for uploading source maps (production only)
    ...(isProduction && process.env.VITE_SENTRY_AUTH_TOKEN ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: './dist/assets/**',
        },
        release: {
          name: process.env.npm_package_version || '1.0.0',
        },
      }),
    ] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for better performance
    target: 'esnext',
    
    // Enable minification
    minify: 'esbuild',
    
    // Remove console.log in production builds
    ...(isProduction && {
      esbuildOptions: {
        drop: ['console', 'debugger'],
        pure: ['console.log', 'console.info', 'console.debug'],
      },
    }),
    
    // Optimize chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          'supabase-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns']
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Additional production optimizations
        ...(isProduction && { compact: true })
      }
    },
    
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps for production debugging (conditional)
    sourcemap: isProduction ? 'hidden' : true,
    
    // CSS code splitting (extract to separate files)
    cssCodeSplit: true,
    
    // Optimize CSS and minimize inline styles
    cssMinify: isProduction ? 'lightningcss' : 'esbuild',
    
    // Production-specific settings
    ...(isProduction && { reportCompressedSize: true })
  },
  
  // Enable optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react'
    ]
  },
  
  // Enable experimental features for better performance
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      }
      return { relative: true }
    }
  },
  
  // Environment-specific settings
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __IS_PRODUCTION__: isProduction,
  }
  
  };
});
