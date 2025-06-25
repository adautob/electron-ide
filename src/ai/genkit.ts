
import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: Plugin<any>[] = [];
let defaultModel: string | undefined;

// NOTE: OpenRouter integration is temporarily disabled to resolve a blocking
// installation issue. We are defaulting to Google AI for now.
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
  console.log(`INFO: Using Google AI with model: ${defaultModel}`);
} else if (process.env.OPENROUTER_API_KEY) {
  console.warn(
    'WARN: OPENROUTER_API_KEY is set, but the integration is temporarily disabled to fix a stability issue. Falling back to Google AI. Set GOOGLE_API_KEY to use AI features.'
  );
  // Still need a fallback even if it won't work without a key
  plugins.push(googleAI());
  defaultModel = 'googleai/gemini-2.0-flash';
}
// If no keys are found, warn the user.
else {
  console.warn(
    'WARN: No GOOGLE_API_KEY found. AI features will not work.'
  );
  // Set a placeholder model to prevent crashes, although AI calls will fail.
  defaultModel = 'googleai/gemini-2.0-flash';
}

export const ai = genkit({
  plugins: plugins,
  // The 'model' property sets the default for all 'ai' calls unless overridden.
  model: defaultModel,
});
