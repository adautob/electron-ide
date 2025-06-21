
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
  selectedPath: z.string().optional().describe('The path to the currently selected file or folder in the file explorer. This can be used as context for where to create new files.'),
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
4.  **Proposta de Modificação/Criação de Arquivos:** Quando o usuário pedir para modificar ou criar um arquivo, você deve primeiro fazer um resumo do que você propõe fazer. Após o resumo, você DEVE fornecer um ou mais blocos de código markdown que contêm o caminho completo do arquivo e o novo conteúdo. O usuário verá sua proposta e precisará confirmá-la antes que qualquer arquivo seja realmente alterado.
    -   **Formato do Bloco de Código:** \`\`\`linguagem:caminho/do/arquivo.ext\n...conteúdo...\`\`\`
    -   **MUITO IMPORTANTE:** O conteúdo do arquivo deve ser colocado *exatamente* como está, começando imediatamente na linha após a declaração do caminho. Não adicione linhas em branco extras antes do conteúdo. Tenha muito cuidado com código que contém aspas (", ') ou outros blocos de código markdown ( \`\`\` ). O bloco de código só deve ser fechado com um \`\`\` no final absoluto do conteúdo do arquivo.
    -   **Para criar arquivos:** Se o usuário especificar uma pasta, crie nela. Se o usuário tiver uma pasta selecionada no explorador (veja o contexto abaixo), prefira criar o novo arquivo dentro dela. Se não houver contexto, crie o arquivo na raiz do projeto. O caminho que você fornecer será criado se não existir.
    -   **Caminho do arquivo:** Forneça o caminho relativo à raiz do projeto. Por exemplo, \`src/components/Novo.tsx\` ou \`README.md\`.

Exemplo de resposta para criar um novo arquivo TSX:
Eu vou criar um novo componente React chamado 'NovoComponente' no diretório 'src/components/'. Ele será um componente simples que renderiza "Olá, Mundo!".

\`\`\`tsx:src/components/NovoComponente.tsx
export function NovoComponente() {
  return <div>Olá, Mundo!</div>;
}
\`\`\`

Exemplo para modificar um arquivo de texto existente:
Claro, vou atualizar o arquivo README.md com o novo conteúdo que você pediu.

\`\`\`text:README.md
Este é o novo conteúdo do README.
\`\`\`

{{#if selectedPath}}
---
**CONTEXTO ATUAL DO USUÁRIO:**
O usuário tem o seguinte arquivo/pasta selecionado no momento: \`{{selectedPath}}\`. Use isso como uma dica de onde criar novos arquivos se o usuário não especificar um local.
---
{{/if}}

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
