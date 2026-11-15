import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Збірка: app/dist → scripts/publish.js копіює її в корінь репозиторію (index.html + assets/),
// який GitHub Pages роздає як і раніше (main / root). base './' — відносні шляхи, працює в підпапці /Klimat/.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
