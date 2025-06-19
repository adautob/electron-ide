
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
  projectFiles: z.array(ProjectFileSchema).optional().describe('An array of project files (path and content) relevant to the conversation. The content of these files has been made available to you by the IDE.'),
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

You do not have direct access to the user's file system to browse or open new files independently.
However, the IDE can provide you with the content of files from the user's project.

{{#if projectFiles}}
For this conversation, the IDE has shared the content of the following project file(s) with you:
{{#each projectFiles}}
- {{{this.filePath}}}
{{/each}}
You should use the content of these specific files as your primary source of information when answering questions about the code within them.
If the user asks if you can read a file, explain that you cannot browse their system, but you CAN work with the content of files that have been explicitly shared with you by the IDE for this chat, like the ones listed above (if any are listed).
{{else}}
No specific file contents have been shared with you by the IDE for this conversation yet. If the user asks about a file, explain that you can analyze its content if they make it available to you (e.g., by opening it in the editor, which then allows the IDE to share its content with you).
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

