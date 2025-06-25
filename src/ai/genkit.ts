
import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This list will hold the configured AI plugins.
const plugins: Plugin<any>[] = [];

// The default model will be determined based on the available API keys.
let defaultModel: string | undefined;

// Use Google AI if the API key is provided.
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);
} else {
  // Warn the user if no Google API key is configured.
  // Also mention the removed OpenRouter key for clarity.
  console.warn(
    'WARN: No GOOGLE_API_KEY found. AI features will not work. Support for OpenRouter is temporarily disabled for debugging.'
  );
  // Set a placeholder model to prevent crashes, although AI calls will fail.
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property here sets the default model for all 'ai' calls unless overridden.
  // This makes our flows more flexible, as they no longer need to hardcode a model name.
  model: defaultModel,
});
