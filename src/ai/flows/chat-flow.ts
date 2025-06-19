
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
  prompt: `Você é um assistente de IA prestativo integrado a um editor de código.
Ajude o usuário com suas perguntas de programação, explicações de código ou consultas gerais.
Mantenha um tom conversacional e útil. Responda sempre em português brasileiro.

Seu conhecimento dos arquivos do projeto do usuário é estritamente limitado ao conteúdo dos arquivos explicitamente fornecidos a você nesta conversa. Você não pode navegar no sistema de arquivos do usuário ou acessar arquivos não listados abaixo.

{{#if projectFiles}}
O IDE compartilhou o conteúdo dos seguintes arquivos do projeto com você para esta conversa (esta é a lista completa de arquivos aos quais você tem acesso):
{{#each projectFiles}}
- {{{this.filePath}}}
{{/each}}
Use o conteúdo desses arquivos específicos como sua principal fonte de informação. Ao ser questionado sobre arquivos que você pode "ler" ou sobre a estrutura de arquivos que você "vê", refira-se a esta lista completa.
{{else}}
Nenhum conteúdo de arquivo específico foi compartilhado com você pelo IDE para esta conversa. Você só pode analisar o conteúdo do arquivo se ele for fornecido a você.
{{/if}}

{{#if history}}
Histórico da Conversa (mensagens anteriores):
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}
{{/if}}

{{#if projectFiles}}

Para sua referência, aqui está o conteúdo detalhado dos arquivos de projeto compartilhados mencionados acima:
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

Usuário (última mensagem): {{{userMessage}}}
Resposta da IA:`,
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

