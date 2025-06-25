
import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { customModel } from 'openrouter-kit';

const plugins: Plugin<any>[] = [];
let defaultModel: string | undefined;

// Prioritize OpenRouter if the API key is provided
if (process.env.OPENROUTER_API_KEY) {
  const modelName = process.env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o';
  plugins.push(
    customModel('openrouter', {
      apiKey: process.env.OPENROUTER_API_KEY,
      modelName: modelName,
    })
  );
  // The customModel plugin from openrouter-kit registers a model named 'default'
  // under the namespace you provide ('openrouter' in this case).
  defaultModel = 'openrouter/default';
  console.log(`INFO: Using OpenRouter with model: ${modelName}`);
}
// Fallback to Google AI if its key is provided
else if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);
}
// If no keys are found, warn the user.
else {
  console.warn(
    'WARN: No OPENROUTER_API_KEY or GOOGLE_API_KEY found. AI features will not work.'
  );
  // Set a placeholder model to prevent crashes, although AI calls will fail.
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property sets the default for all 'ai' calls unless overridden.
  model: defaultModel,
});
