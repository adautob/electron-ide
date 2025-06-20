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

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const readFileTool = ai.defineTool(
      {
        name: 'readFile',
        description: 'Reads the content of a specific file from the project. Use this tool when you need to see the code or content of a file to answer a question or perform a task. You should only request files that are in the list provided by the IDE.',
        inputSchema: z.object({
          filePath: z.string().describe('The full path of the file to read, e.g., /src/app/page.tsx. Must be one of the files provided by the IDE.'),
        }),
        outputSchema: z.string().describe('The full content of the requested file, or an error message if the file cannot be read.'),
      },
      async ({ filePath }) => {
        const file = input.projectFiles?.find(f => f.filePath === filePath);
        if (file) {
          return `Content of ${filePath}:\n\n\`\`\`\n${file.fileContent}\n\`\`\``;
        }
        return `Error: File not found or access was denied. You can only read files from the provided list. Path requested: '${filePath}'`;
      }
    );
    
    const chatPrompt = ai.definePrompt({
      name: 'chatPrompt',
      input: {schema: ChatInputSchema},
      output: {schema: ChatOutputSchema},
      tools: [readFileTool],
      prompt: `Você é um assistente de IA prestativo integrado a um editor de código.
Ajude o usuário com suas perguntas de programação, explicações de código ou consultas gerais.
Mantenha um tom conversacional e útil. Responda sempre em português brasileiro.

Você tem acesso a uma lista de arquivos do projeto do usuário. Se precisar ver o conteúdo de um arquivo para responder à pergunta do usuário, use a ferramenta \`readFile\` fornecida. Não presuma o conteúdo de um arquivo; sempre use a ferramenta para lê-lo.

{{#if projectFiles}}
O IDE compartilhou a lista dos seguintes arquivos do projeto com você. Use a ferramenta \`readFile\` para ler o conteúdo de qualquer um destes arquivos quando necessário:
{{#each projectFiles}}
- {{{this.filePath}}}
{{/each}}
{{else}}
Nenhum arquivo de projeto foi compartilhado com você pelo IDE para esta conversa.
{{/if}}

Se o usuário pedir para modificar um arquivo, primeiro use a ferramenta \`readFile\` para obter seu conteúdo atual. Em seguida, forneça o novo conteúdo completo que o usuário pode usar para substituir o conteúdo do arquivo. Explique que você (o assistente de chat) não interage diretamente com o editor.

{{#if history}}
Histórico da Conversa (mensagens anteriores):
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}
{{/if}}

Usuário (última mensagem): {{{userMessage}}}
Resposta da IA:`,
    });

    const {output} = await chatPrompt(input);
    return output!;
  }
);
