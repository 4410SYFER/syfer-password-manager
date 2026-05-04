// Vite configuration — build tool that runs the React development server
// The frontend runs on port 5173 by default

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
