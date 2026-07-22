import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor';
          }
          if (id.includes('/src/services/')) return 'services';
          if (id.includes('/src/school-portal.js')) return 'school-portal';
          if (id.includes('/src/lms-student.js')) return 'lms-student';

          if (id.includes('/src/lib/')) return 'lib';
        }
      }
    },
    chunkSizeWarningLimit: 300
  }
});
