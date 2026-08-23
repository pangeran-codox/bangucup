import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
            // Bunny Fonts dihapus — font dimuat langsung dari Google Fonts
            // di app.blade.php dengan teknik non-blocking (media="print" trick).
        }),
        react(),
        tailwindcss(),
    ],

    build: {
        rollupOptions: {
            output: {
                // Pisahkan vendor besar ke chunk tersendiri.
                // Vite 8+ mewajibkan manualChunks sebagai function.
                // Browser hanya re-download chunk yang berubah, bukan semua sekaligus.
                manualChunks(id) {
                    if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                        return 'vendor-react';
                    }
                    if (id.includes('node_modules/@inertiajs')) {
                        return 'vendor-inertia';
                    }
                },
            },
        },
    },

    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'localhost',
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
            // Bind mount Docker di Windows tidak meneruskan inotify events
            // ke container, polling diperlukan agar HMR tetap berjalan.
            usePolling: true,
            interval: 300,
        },
    },
});
