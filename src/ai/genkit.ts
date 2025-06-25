
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This file configures Genkit for Google AI, which acts as the default/fallback.
// The chat flow will conditionally use OpenRouter if an API key is provided.
if (!process.env.GOOGLE_API_KEY && !process.env.OPENROUTER_API_KEY) {
  console.warn(
    'WARN: No GOOGLE_API_KEY or OPENROUTER_API_KEY found. AI features may not work.'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GOOGLE_API_KEY})],
  model: 'googleai/gemini-2.0-flash',
});
