import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        // wayfinder({
        //     formVariants: true,
        // }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
            '@/routes': resolve(__dirname, 'resources/js/routes'),
        },
    },
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:8000',
            '/sanctum': 'http://127.0.0.1:8000',
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/@inertiajs/react')) return 'vendor';
                    if (id.includes('node_modules/@headlessui') || id.includes('node_modules/@radix-ui')) return 'ui';
                    if (id.includes('node_modules/sweetalert2') || id.includes('node_modules/sonner') || id.includes('node_modules/chart.js')) return 'utils';
                },
            },
        },
    },
});
