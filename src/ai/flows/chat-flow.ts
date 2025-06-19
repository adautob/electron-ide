
'use server';
/**
 * @fileOverview A Genkit flow for handling chat conversations with an AI.
 *
 * - chatWithAI - A function that takes user input, conversation history, and project files, returns AI response.
 * - ChatInput - The input type for the chatWithAI function.
 * - ChatOutput - The return type for the chatWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ProjectFileSchema = z.object({
  filePath: z.string().describe('The full path to the project file, e.g., /src/components/button.tsx.'),
  fileContent: z.string().describe('The full text content of the project file.'),
});

const ChatInputSchema = z.object({
  userMessage: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point.'),
  projectFiles: z.array(ProjectFileSchema).optional().describe('An array of project files (path and content). The content of these files has been made available to you by the IDE.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  aiResponse: z.string().describe('The AI\'s response to the user message.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chatWithAI(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: {schema: ChatInputSchema},
  output: {schema: ChatOutputSchema},
  prompt: `You are a helpful AI assistant integrated into a code editor.
Assist the user with their programming questions, code explanations, or general queries.
Maintain a conversational and helpful tone.

Your knowledge of the user's project files is strictly limited to the content of the files explicitly provided to you in this conversation. You cannot browse the user's file system or access files not listed.

{{#if projectFiles}}
The IDE has shared the content of the following project file(s) with you for this conversation:
{{#each projectFiles}}
- {{{this.filePath}}}
{{/each}}
Use the content of these specific files as your primary source of information. When asked about files, refer to this list.
{{else}}
No specific file contents have been shared with you by the IDE for this conversation. You can only analyze file content if it's provided to you.
{{/if}}

{{#if history}}
Conversation History (previous messages):
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}
{{/if}}

{{#if projectFiles}}

For your reference, here is the detailed content of the shared project files mentioned above:
{{#each projectFiles}}
---
File Path: {{{this.filePath}}}
Content:
\`\`\`
{{{this.fileContent}}}
\`\`\`
---
{{/each}}
{{/if}}

User (latest message): {{{userMessage}}}
AI Response:`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const {output} = await chatPrompt(input);
    return output!;
  }
);

