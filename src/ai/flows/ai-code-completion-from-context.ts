
'use server';
/**
 * @fileOverview AI code completion suggestions based on the surrounding code.
 *
 * - aiCodeCompletionFromContext - A function that handles the code completion process.
 * - AICodeCompletionFromContextInput - The input type for the aiCodeCompletionFromContext function.
 * - AICodeCompletionFromContextOutput - The return type for the aiCodeCompletionFromContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICodeCompletionFromContextInputSchema = z.object({
  codeSnippet: z
    .string()
    .describe('The surrounding code snippet to provide context for code completion.'),
  cursorPosition: z
    .number()
    .describe('The index position of the cursor within the code snippet.'),
  programmingLanguage: z
    .string()
    .describe('The programming language of the code snippet.'),
});
export type AICodeCompletionFromContextInput = z.infer<
  typeof AICodeCompletionFromContextInputSchema
>;

const AICodeCompletionFromContextOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of code completion suggestions.'),
});
export type AICodeCompletionFromContextOutput = z.infer<
  typeof AICodeCompletionFromContextOutputSchema
>;

export async function aiCodeCompletionFromContext(
  input: AICodeCompletionFromContextInput
): Promise<AICodeCompletionFromContextOutput> {
  return aiCodeCompletionFromContextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCodeCompletionFromContextPrompt',
  input: {schema: AICodeCompletionFromContextInputSchema},
  output: {schema: AICodeCompletionFromContextOutputSchema},
  prompt: `You are an AI code completion assistant. Given the surrounding code snippet, 
you will suggest code completions that are relevant to the context.

Programming Language: {{{programmingLanguage}}}
Code Snippet:
` +
'```\n{{{codeSnippet}}}\n```' +
`

Cursor Position: {{{cursorPosition}}}

Suggestions:
`,
});

const aiCodeCompletionFromContextFlow = ai.defineFlow(
  {
    name: 'aiCodeCompletionFromContextFlow',
    inputSchema: AICodeCompletionFromContextInputSchema,
    outputSchema: AICodeCompletionFromContextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
