import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';
import ssrPlugin from 'vite-ssr-components/plugin';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import baseConfig from '../../configs/vite.config.base';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'node:path';

const config = defineConfig({
  plugins: [
    svgr(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, './src/apps/diceshock/routers'),
      generatedRouteTree: path.resolve(
        __dirname,
        './src/apps/diceshock/routeTree.gen.ts'
      ),
    }),
    cloudflare({ configPath: path.resolve(__dirname, './wrangler.toml') }),
    ssrPlugin({
      hotReload: {
        ignore: ['./src/client/**/*.tsx', './src/apps/**/*.tsx'],
      },
    }),
    react(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});

export default mergeConfig(config, baseConfig);
