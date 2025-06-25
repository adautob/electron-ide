
import {genkit, type ModelReference, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

let plugins: Plugin<any>[] = [];
let defaultModel: string | undefined;

// OpenRouter has priority if the API key is provided.
if (process.env.OPENROUTER_API_KEY) {
  plugins = [
    openAI({
      name: 'openrouter', // Give it a name to require a prefix
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/firebase/genkit-samples',
        'X-Title': 'Electron IDE',
      },
      modelMapper: (model: ModelReference<any> | string) => {
        const modelName = typeof model === 'string' ? model : model.name;
        if (modelName.startsWith('openrouter/')) {
          // Return the model name string without the prefix.
          return modelName.substring('openrouter/'.length);
        }
        return modelName;
      },
    }),
  ];

  // We add the prefix here so Genkit knows which plugin to use.
  // The modelMapper will remove it before sending to the API.
  defaultModel = `openrouter/${process.env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini'}`;
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
