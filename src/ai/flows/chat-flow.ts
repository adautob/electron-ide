
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
  projectFiles: z.array(ProjectFileSchema).optional().describe('An array of project files (path and content) that the user currently has open or relevant to the conversation, to provide context to the AI.'),
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

  It's important to understand that you do not have direct access to the user's file system.
  However, for the purpose of this conversation, the user may provide you with the content of specific project files relevant to their query.
  When project files are provided (see below), you should use their content to answer questions about the code within those files.

  {{#if history}}
  Conversation History:
  {{#each history}}
  {{this.role}}: {{{this.content}}}
  {{/each}}
  {{/if}}

  {{#if projectFiles}}
  The following project file contents have been provided to you for context. You can refer to them if the user's query is about their code:
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

  User: {{{userMessage}}}
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

