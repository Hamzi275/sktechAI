// In local dev, VITE_API_URL is unset, so API_BASE is empty and requests go
// to relative paths like /api/analyze — vite.config.js's proxy then forwards
// them to http://127.0.0.1:8000.
//
// In production (Vercel), there is no proxy, so VITE_API_URL must be set to
// the deployed backend's full URL (e.g. https://sktechai.onrender.com).
// Vite only exposes env vars prefixed with VITE_ to the client, and only
// ones set at build time — so this must be configured in Vercel's project
// settings, not just a local .env file, for the deployed build to pick it up.
const API_BASE = import.meta.env.VITE_API_URL || ''

export const apiUrl = (path) => `${API_BASE}${path}`