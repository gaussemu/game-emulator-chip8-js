import { defineConfig } from "vite";
import 'dotenv/config';

export default defineConfig({
    base: process.env.VITE_BASE_URL || '/',
    build: {
        outDir: process.env.VITE_BUILD_DIR || 'dist',
    }
})
