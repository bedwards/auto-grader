import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/auto-grader/',
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
    server: {
      port: 3000,
    },
    define: {
      'process.env.CLOUDFLARE_WORKER_URL': JSON.stringify(env.CLOUDFLARE_WORKER_URL || ''),
      'process.env.GITHUB_PAGES_URL': JSON.stringify(env.GITHUB_PAGES_URL || 'https://bedwards.github.io/auto-grader'),
    },
  };
});
