
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
4.  **Proposta de Modificação/Criação de Arquivos:** Quando o usuário pedir para modificar ou criar um arquivo, sua única forma de ação é através do formato especial. Você deve primeiro fazer um resumo do que você propõe fazer. Após o resumo, você DEVE fornecer o conteúdo completo do arquivo a ser criado/modificado.
    -   **Formato de Delimitador:** Use \`[START_FILE:caminho/do/arquivo.ext]\` para iniciar e \`[END_FILE]\` para terminar o conteúdo do arquivo.
    -   **IMPORTANTE:** O conteúdo entre os delimitadores é o **conteúdo bruto e final do arquivo**. NÃO inclua nenhuma formatação extra, como blocos de código Markdown (\`\`\`).
    -   **Exemplo CORRETO para criar um arquivo Python:**
        Vou criar um script Python para você.

        [START_FILE:scripts/meu_script.py]
        def ola_mundo():
            print("Olá, Mundo!")

        ola_mundo()
        [END_FILE]

    -   **Exemplo INCORRETO (NÃO FAÇA ISSO):**
        [START_FILE:scripts/meu_script.py]
        \`\`\`python
        def ola_mundo():
            print("Olá, Mundo!")

        ola_mundo()
        \`\`\`
        [END_FILE]
    
    -   **Criação de Arquivos:** Se o usuário tiver uma pasta selecionada (contexto \`selectedPath\`), prefira criar o novo arquivo dentro dela. Se não, crie na raiz do projeto.
5.  **Formatação de Código na Conversa:** Para qualquer trecho de código em sua resposta conversacional (que NÃO seja uma proposta de arquivo), use sempre blocos de código Markdown padrão (\`\`\`).

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

**LEMBRETE CRÍTICO:** Para **propor alterações de arquivos**, use o formato \`[START_FILE:path]...[END_FILE]\` com o conteúdo bruto do arquivo dentro. Para **mostrar exemplos de código na conversa**, use blocos de código Markdown (\`\`\`). Nunca peça para o usuário copiar/colar e nunca misture os dois formatos.

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
