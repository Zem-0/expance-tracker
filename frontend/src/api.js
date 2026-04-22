// In dev, VITE_API_URL is unset so requests hit Vite's proxy → localhost:3001.
// In prod, set VITE_API_URL=https://your-backend.railway.app in Vercel env vars.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
