// PM2 process manager config for Hostinger Node.js hosting.
// Usage on the server:
//   npm run build           # produces .output/server/index.mjs
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup  # keep alive across reboots
module.exports = {
  apps: [
    {
      name: "diamond-house",
      script: ".output/server/index.mjs",
      exec_mode: "fork",
      instances: 1,
      // Nitro node-server reads PORT / HOST from the environment.
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      max_memory_restart: "400M",
      autorestart: true,
      // Env vars (Supabase/Razorpay/Resend secrets) are loaded from the `.env`
      // file in the app root by Nitro at runtime, or configure them in hPanel.
    },
  ],
};
