
'use server';
/**
 * @fileOverview AI code completion suggestions based on the surrounding code and optionally other project files.
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
  otherFiles: z.array(z.object({
    filePath: z.string().describe('The path of the other file, e.g., /src/components/button.tsx.'),
    fileContent: z.string().describe('The full text content of the other file.')
  })).optional().describe('Optional. Content of other relevant files to provide broader context.'),
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
and potentially other project files for context, you will suggest code completions
that are relevant.

Programming Language: {{{programmingLanguage}}}

Current File Content (cursor at character position {{{cursorPosition}}}):
\`\`\`
{{{codeSnippet}}}
\`\`\`
{{#if otherFiles}}

For additional context, here are the contents of other relevant files in the project:
{{#each otherFiles}}
---
File Path: {{{this.filePath}}}
Content:
\`\`\`
{{{this.fileContent}}}
\`\`\`
---
{{/each}}
{{/if}}

Provide code completion suggestions based on all the provided context.
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

