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
  filePath: z.string().describe('The full path to the project file, e.g., /src/components/button.tsx or /file.txt for root files.'),
  fileContent: z.string().describe('The full text content of the project file.'),
});

const ChatInputSchema = z.object({
  userMessage: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point.'),
  projectFiles: z.array(ProjectFileSchema).optional().describe('An array of project files (path and content) to provide context to the AI.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  aiResponse: z.string().describe('The AI\'s response to the user message.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chatWithAI(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const prompt = `Você é um assistente de IA prestativo integrado a um editor de código.
Ajude o usuário com suas perguntas de programação, explicações de código ou consultas gerais.
Mantenha um tom conversacional e útil. Responda sempre em português brasileiro.

{{#if projectFiles}}
Para contexto, o usuário forneceu os seguintes arquivos do projeto e seu conteúdo:
{{#each projectFiles}}
---
Caminho do Arquivo: {{{this.filePath}}}
Conteúdo:
\`\`\`
{{{this.fileContent}}}
\`\`\`
---
{{/each}}
{{/if}}

Se o usuário pedir para modificar um arquivo, forneça o novo conteúdo completo que o usuário pode usar para substituir o conteúdo do arquivo.

{{#if history}}
Histórico da Conversa (mensagens anteriores):
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}
{{/if}}

Usuário (última mensagem): {{{userMessage}}}
Resposta da IA:`;
    
    const llmResponse = await ai.generate({
        prompt: prompt,
        history: input.history,
        model: 'googleai/gemini-2.0-flash',
        context: {
            userMessage: input.userMessage,
            history: input.history,
            projectFiles: input.projectFiles,
        },
        output: {
            format: 'text',
        }
    });

    return { aiResponse: llmResponse.text };
  }
);