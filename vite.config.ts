import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Security headers for development server
// Note: In production, these should be configured on the web server (nginx, Apache) or CDN
const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS filter in older browsers
  'X-XSS-Protection': '1; mode=block',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions Policy (formerly Feature-Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
};

// Content Security Policy directives
// Note: Development requires more permissive settings for hot reload
const getCSPDirectives = (isDev: boolean) => {
  const baseDirectives = {
    'default-src': ["'self'"],
    'script-src': isDev
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Required for HMR in development
      : ["'self'", 'https://static.cloudflareinsights.com'],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind/styled-components
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': isDev
      ? ["'self'", 'ws:', 'wss:', 'http:', 'https:'] // Permissive for dev server
      : ["'self'", 'wss://*.salesos.org', 'https://*.salesos.org', 'https://*.sentry.io'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  // Build CSP string
  return Object.entries(baseDirectives)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        ...securityHeaders,
        'Content-Security-Policy': getCSPDirectives(isDev),
      },
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
        '/ws': {
          target: env.VITE_WS_TARGET || 'ws://localhost:4000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: {
      headers: {
        ...securityHeaders,
        'Content-Security-Policy': getCSPDirectives(false),
        // Add HSTS for preview (production-like environment)
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Generate source maps for error tracking (Sentry) but don't expose them in the bundle
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          // Chunk splitting for better caching
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            ui: ['lucide-react'],
          },
        },
      },
    },
  };
});
