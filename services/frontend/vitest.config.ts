import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Component tests need a DOM and the "@/..." alias tsconfig defines. Without this config
// vitest ran in a node environment, so every .tsx test failed before reaching an assertion.
//
// JSX is handled by vitest's built-in transform rather than @vitejs/plugin-react — that
// plugin's peer range conflicts with the @babel/core this project already resolves through
// shadcn, and nothing here needs Fast Refresh.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
