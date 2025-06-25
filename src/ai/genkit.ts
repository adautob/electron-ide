
import {genkit, type ModelReference, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

let plugins: Plugin<any>[] = [];
let defaultModel: string | undefined;

// OpenRouter has priority if the API key is provided.
if (process.env.OPENROUTER_API_KEY) {
  // When using OpenRouter, we will ONLY configure the openAI plugin.
  // This simplifies routing and avoids the prefix issue.
  plugins = [
    openAI({
      // No custom 'name' is needed as it's the only generator plugin.
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/firebase/genkit-samples',
        'X-Title': 'Electron IDE',
      },
      // No modelMapper is needed as the model name will be passed directly.
    })
  ];

  // The model name is used directly, without any prefixes.
  defaultModel = process.env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini';
  console.log(`INFO: Using OpenRouter. Default model set to: ${defaultModel}`);

} else if (process.env.GOOGLE_API_KEY) {
  // Fallback to Google AI if OpenRouter key is not present.
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);

} else {
  // Default fallback if no keys are found.
  console.warn(
    'WARN: No OPENROUTER_API_KEY or GOOGLE_API_KEY found. AI features will not work.'
  );
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property sets the default for all 'ai' calls unless overridden.
  model: defaultModel,
});
