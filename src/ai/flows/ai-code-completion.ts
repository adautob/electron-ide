'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-assisted code completion based on comments.
 *
 * - `generateCodeFromComment`:  A function that takes a comment and surrounding code as input and returns code suggestions.
 * - `AICodeCompletionInput`: The input type for the `generateCodeFromComment` function.
 * - `AICodeCompletionOutput`: The output type for the `generateCodeFromComment` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICodeCompletionInputSchema = z.object({
  comment: z
    .string()
    .describe('A comment describing the code to be generated.'),
  existingCode: z
    .string()
    .optional()
    .describe('The existing code in the file to provide context.'),
});
export type AICodeCompletionInput = z.infer<typeof AICodeCompletionInputSchema>;

const AICodeCompletionOutputSchema = z.object({
  codeSuggestion: z
    .string()
    .describe('The AI-generated code suggestion based on the comment.'),
});
export type AICodeCompletionOutput = z.infer<typeof AICodeCompletionOutputSchema>;

export async function generateCodeFromComment(
  input: AICodeCompletionInput
): Promise<AICodeCompletionOutput> {
  return aiCodeCompletionFlow(input);
}

const aiCodeCompletionPrompt = ai.definePrompt({
  name: 'aiCodeCompletionPrompt',
  input: {schema: AICodeCompletionInputSchema},
  output: {schema: AICodeCompletionOutputSchema},
  prompt: `You are an AI code completion assistant. You will generate code suggestions based on a user-provided comment and existing code.  The code should be concise and directly implement the request in the comment.  The code should also integrate seamlessly with the existing code.

Comment: {{{comment}}}

Existing Code:
{{{existingCode}}}

Code Suggestion:`,
});

const aiCodeCompletionFlow = ai.defineFlow(
  {
    name: 'aiCodeCompletionFlow',
    inputSchema: AICodeCompletionInputSchema,
    outputSchema: AICodeCompletionOutputSchema,
  },
  async input => {
    const {output} = await aiCodeCompletionPrompt(input);
    return output!;
  }
);
