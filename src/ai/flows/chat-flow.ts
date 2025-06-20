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

const chatPrompt = ai.definePrompt({
  name: 'ideChatPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: ChatInputSchema },
  prompt: `Você é um assistente de IA prestativo e especialista em programação, integrado a um editor de código. Sua principal função é ajudar o usuário a entender, modificar e escrever código.

**Instruções Importantes:**
1.  **Use o Contexto, mas seja flexível:** Sua principal fonte de informação são os arquivos do projeto e o histórico da conversa. Use-os sempre que forem relevantes. No entanto, se o usuário fizer uma pergunta geral sobre programação (por exemplo, "como escrever uma função em C" ou "o que é uma Promise em JavaScript"), você deve respondê-la, mesmo que não tenha relação com os arquivos do projeto.
2.  **Seja Proativo com o Contexto:** Se um arquivo for relevante para a pergunta do usuário, mencione-o e use seu conteúdo na resposta. Se a pergunta for sobre o projeto em geral ("o que temos no projeto?"), resuma a estrutura e o propósito dos arquivos fornecidos.
3.  **Responda em Português:** Todas as suas respostas devem ser em português brasileiro.
4.  **Modificação de Arquivos:** Se o usuário pedir para modificar ou criar um arquivo, você DEVE responder com um bloco de código markdown que contém o caminho completo do arquivo e o novo conteúdo. O caminho do arquivo deve ser anexado à linguagem do bloco de código, separado por dois pontos.

Exemplo para criar um novo arquivo TSX:
\`\`\`tsx:src/components/NovoComponente.tsx
export function NovoComponente() {
  return <div>Olá, Mundo!</div>;
}
\`\`\`

Exemplo para modificar um arquivo de texto existente:
\`\`\`text:README.md
Este é o novo conteúdo do README.
\`\`\`
Responda APENAS com o bloco de código se a intenção for modificar o arquivo. Você pode adicionar um breve texto de confirmação antes do bloco, se necessário.

{{#if projectFiles}}
---
**CONTEXTO DO PROJETO (Arquivos Fornecidos)**
{{#each projectFiles}}
Caminho do Arquivo: {{{this.filePath}}}
Conteúdo:
\`\`\`
{{{this.fileContent}}}
\`\`\`
{{/each}}
---
{{/if}}

{{#if history}}
**HISTÓRICO DA CONVERSA**
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}
---
{{/if}}

**NOVA MENSAGEM**
Usuário: {{{userMessage}}}
Resposta da IA:`,
});


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const llmResponse = await chatPrompt(input, {
      history: input.history,
    });
    
    return { aiResponse: llmResponse.text };
  }
);
