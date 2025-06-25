import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from '@genkit-ai/openai';

// This list will hold the configured AI plugins.
const plugins: Plugin<any>[] = [];

// The default model will be determined based on the available API keys.
let defaultModel: string;

// Prioritize OpenRouter if the API key is provided.
if (process.env.OPENROUTER_API_KEY) {
  // Use a sensible default model for OpenRouter, but allow it to be overridden.
  const openRouterModel = process.env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o';
  
  plugins.push(
    openAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: openRouterModel,
      // OpenRouter requires these headers to identify your app.
      customHeaders: {
        'HTTP-Referer': 'https://github.com/firebase/studio',
        'X-Title': 'Electron IDE',
      },
    })
  );
  
  defaultModel = openRouterModel;
  console.log(`INFO: Using OpenRouter with model: ${defaultModel}`);

} else if (process.env.GOOGLE_API_KEY) {
  // Fallback to Google AI if an OpenRouter key is not found.
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);
} else {
  // Warn the user if no API keys are configured.
  console.warn("WARN: No Genkit API key found (OPENROUTER_API_KEY or GOOGLE_API_KEY). AI features will not work.");
  // Set a placeholder model to prevent crashes, although AI calls will fail.
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property here sets the default model for all 'ai' calls unless overridden.
  // This makes our flows more flexible, as they no longer need to hardcode a model name.
  model: defaultModel,
});
