import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/ProyectoInfoVis-Grupo24/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        aruco: resolve(__dirname, 'aruco.html'),
      }
    }
  }
})