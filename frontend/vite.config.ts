import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({base:'/multigym/',plugins:[react()],server:{port:5173},build:{sourcemap:false}});
