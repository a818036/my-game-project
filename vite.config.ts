import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{const port=Number(loadEnv(mode,'.','NARRATION_PORT').NARRATION_PORT??8787);return{plugins:[react()],build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'history-engine',test:/[\\/]src[\\/]phase4\.ts$/}]}}}},server:{proxy:{'/api':{target:`http://127.0.0.1:${port}`,changeOrigin:true}}}};});
