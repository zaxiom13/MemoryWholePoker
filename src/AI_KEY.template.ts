// Template file for AI_KEY.ts
// Copy this file to AI_KEY.ts and replace YOUR_API_KEY_HERE with your actual Gemini API key
// Alternatively, set VITE_GEMINI_API_KEY in a .env file for better security.

export const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? 'YOUR_API_KEY_HERE'
