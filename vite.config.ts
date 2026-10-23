import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// In the Base44 sandbox the dev server is reached through a proxy, so requests arrive
// with a BASE44_SANDBOX_HOST_DOMAIN host instead of localhost. Vite's host check must
// allow that host or it answers 403. Only applied in the sandbox (BASE44_PREVIEW_MODE
// === '1'); without the flag (or without the domain) no allowlist is configured and
// the original default behaviour is unchanged.
const previewAllowedHosts =
  process.env.BASE44_PREVIEW_MODE === '1' && process.env.BASE44_SANDBOX_HOST_DOMAIN
    ? [`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`]
    : [];

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      ...(previewAllowedHosts.length ? { allowedHosts: previewAllowedHosts } : {}),
    },
  };
});
