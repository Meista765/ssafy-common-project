import { defineConfig,loadEnv  } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [react(), basicSsl()],
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      include: ['axios'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      https: true,
      host: '0.0.0.0',
      cors: true,
      proxy: {
        '/openvidu/api': {
          target: `${env.VITE_OPENVIDU_PROTOCOL}://${env.VITE_OPENVIDU_IP}:${env.VITE_OPENVIDU_PORT}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/openvidu\/api/, '/openvidu/api')
        },
        '/openvidu': {
          target: `wss://${env.VITE_OPENVIDU_IP}:${env.VITE_OPENVIDU_PORT}`,
          ws: true,
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/openvidu/, '/openvidu')
        },
        '/api': {  // 백엔드 API 프록시 추가
          target: `${env.VITE_BACKEND_PROTOCOL}://${env.VITE_BACKEND_IP}:${env.VITE_BACKEND_PORT}`,
          changeOrigin: true,
          secure: false
        }
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization'
      }
    }
  }
});