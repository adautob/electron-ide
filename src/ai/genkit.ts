
import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

const plugins: Plugin<any>[] = [];
let defaultModel: string | undefined;

// OpenRouter has priority if the API key is provided.
if (process.env.OPENROUTER_API_KEY) {
  const modelName = process.env.OPENROUTER_MODEL_NAME || 'google/gemini-pro'; // A sensible default for OpenRouter
  plugins.push(
    openAI({
      name: 'openrouter', // Give the plugin a unique name
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      // Pass headers to identify our app to OpenRouter
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/firebase/genkit-samples',
        'X-Title': 'Electron IDE',
      },
    })
  );
  // Prefix the model with our custom plugin name for Genkit routing.
  defaultModel = `openrouter/${modelName}`;
  console.log(`INFO: Using OpenRouter. Genkit model: ${defaultModel}`);

} else if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);

} else {
  console.warn(
    'WARN: No OPENROUTER_API_KEY or GOOGLE_API_KEY found. AI features will not work.'
  );
  // Set a placeholder to prevent crashes, although AI calls will fail.
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property sets the default for all 'ai' calls unless overridden.
  model: defaultModel,
});
