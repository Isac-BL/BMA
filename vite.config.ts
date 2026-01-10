import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'logo.png'],
        devOptions: {
          enabled: true
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          navigateFallback: '/index.html', // Ensure SPA routing works offline
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                },
                networkTimeoutSeconds: 10 // Timeout faster for network
              }
            }
          ]
        },
        manifest: {
          name: 'Barbearia Mateus Andrade',
          short_name: 'BMA',
          description: 'Agendamento de serviços na Barbearia Mateus Andrade.',
          theme_color: '#171611',
          background_color: '#171611',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
