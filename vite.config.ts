import { defineConfig } from 'vite';
import { fantasize } from './src/ui/fantasy';
// VITE_FANTASY=1: rewrite franchise names in all source strings at build time so the shipped bundle contains none of them.
const fantasyPlugin = { name: 'original-fantasy', enforce: 'pre' as const, transform(code: string, id: string) { if (process.env.VITE_FANTASY !== '1' || !/src[\\/].*\.ts$/.test(id)) return null; return { code: fantasize(code), map: null }; },
  transformIndexHtml(html: string) { return process.env.VITE_FANTASY === '1' ? fantasize(html).replace('HARRY POTTER', 'HIGHSPIRE') : html; } };
// Code-split: three.js vendor, game engine, content data, and lazily loaded screens/replay/explore.
const chunk = (id: string) => {
  if (id.includes('node_modules/three/examples')) return 'three-extras';
  if (id.includes('node_modules/three')) return 'three';
  if (/src\/(story|modes)\//.test(id) || /fullroster|whatif/.test(id)) return 'content';
  if (/src\/(war|ai|combat|rendering|character|replay\/recorder)\//.test(id) || id.endsWith('src/game.ts')) return 'engine';
  return undefined;
};
export default defineConfig({ plugins: [fantasyPlugin], base: './', preview: { host: true, allowedHosts: true }, server: { host: true, allowedHosts: true }, test: { environment: 'node', globals: true },
  build: { chunkSizeWarningLimit: 700, rollupOptions: { output: { manualChunks: chunk } }, rolldownOptions: { output: { advancedChunks: { groups: [
    { name: 'three', test: /node_modules[\\/]three/ },
    { name: 'content', test: /src[\\/](story|modes)[\\/]|fullroster|whatif/ }, { name: 'engine', test: /src[\\/](war|ai|combat|rendering|character)[\\/]|src[\\/]game\.ts|replay[\\/]recorder/ } ] } } } } } as any);
