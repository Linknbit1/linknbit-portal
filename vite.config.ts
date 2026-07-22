import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL ?? 'https://pifsboyhheazpccyliwy.supabase.co'

  return {
    plugins: [react(), tailwindcss()],
    // These are lazy-loaded via dynamic import() inside the file viewer. Pre-bundling
    // them (and their transitive deps like fflate) lets Vite dev resolve the subpath
    // at runtime — otherwise the import works in `build` but 404s in `dev`.
    optimizeDeps: {
      include: ['read-excel-file/browser', 'mammoth', 'marked'],
    },
    server: {
      proxy: {
        // Routes /api/auth/* → Supabase Edge Functions
        // The browser sees same-origin requests, so HTTP-only cookies work correctly.
        // In production, Vercel rewrites do the same job (see vercel.json).
        '/api/auth': {
          target: `${supabaseUrl}/functions/v1`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/auth/, ''),
        },
      },
    },
  }
})
