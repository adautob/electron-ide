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
  config: {
    maxOutputTokens: 8192,
  },
  prompt: `Você é um assistente de IA prestativo e especialista em programação, integrado a um editor de código. Sua principal função é ajudar o usuário a entender, modificar e escrever código.

**Instruções Importantes:**
1.  **Use o Contexto, mas seja flexível:** Sua principal fonte de informação são os arquivos do projeto e o histórico da conversa. No entanto, se o usuário fizer uma pergunta geral de programação, responda-a normalmente.
2.  **Seja Proativo:** Se um arquivo for relevante, mencione-o. Se a pergunta for sobre o projeto, resuma a estrutura dos arquivos.
3.  **Responda em Português:** Todas as suas respostas devem ser em português brasileiro.
4.  **REGRA CRÍTICA: Como Propor Alterações de Arquivo:**
    -   Para modificar ou criar um arquivo, você DEVE usar um formato especial. Primeiro, **forneça um breve resumo em texto normal do que você vai alterar**. É crucial que você **NÃO** inclua o código completo das suas alterações na sua resposta de chat. O código completo deve ir **APENAS** dentro dos blocos \`[START_FILE]\`.
    -   Depois do resumo, forneça o(s) bloco(s) de alteração. Cada bloco DEVE começar com \`[START_FILE:caminho/completo/do/arquivo.ext]\` e terminar com \`[END_FILE]\`.
    -   **ABSOLUTAMENTE CRÍTICO:** O conteúdo dentro de um bloco \`[START_FILE]\` e \`[END_FILE]\` é o **CONTEÚDO BRUTO E EXATO DO ARQUIVO FINAL**. Ele **NUNCA DEVE CONTER** os delimitadores de código Markdown (\`\`\`). A sua resposta será processada por uma máquina que falhará se você incluir \`\`\` dentro de um bloco de arquivo.
    -   **Para múltiplos arquivos**, simplesmente forneça múltiplos blocos \`[START_FILE]...[END_FILE]\` em sequência.
    -   **Exemplo CORRETO (Múltiplos arquivos):**
        Ok, vou criar um novo componente 'MeuBotao' e um arquivo CSS para ele.

        [START_FILE:src/components/MeuBotao.css]
        .meu-botao {
          background-color: blue;
          color: white;
        }
        [END_FILE]

        [START_FILE:src/components/MeuBotao.jsx]
        import './MeuBotao.css';
        
        export default function MeuBotao() {
          return <button className="meu-botao">Clique Aqui</button>;
        }
        [END_FILE]

    -   **Exemplo INCORRETO (NÃO FAÇA ISTO):**
        [START_FILE:src/utils.js]
        \`\`\`javascript
        export const somar = (a, b) => a + b;
        \`\`\`
        [END_FILE]
5.  **Formatação de Código na Conversa (Apenas para exemplos):**
    -   Para qualquer trecho de código que você queira *mostrar* na sua resposta conversacional (que **NÃO** seja uma alteração de arquivo), use blocos de código Markdown padrão com três crases (\`\`\`).
    -   **Exemplo de código no chat:**
        Você pode usar a função assim:
        \`\`\`javascript
        import { somar } from './src/utils.js';
        console.log(somar(2, 3)); // 5
        \`\`\`

{{#if selectedPath}}
---
**CONTEXTO ATUAL DO USUÁRIO:**
O usuário tem o seguinte arquivo/pasta selecionado no momento: \`{{selectedPath}}\`. Use isso como uma dica de onde criar novos arquivos.
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

**LEMBRETE FINAL ANTES DE RESPONDER:** Lembre-se das regras mais importantes:
1.  **RESUMO PRIMEIRO:** Antes de qualquer bloco de arquivo, forneça um resumo breve do que você está fazendo.
2.  **NÃO REPITA CÓDIGO NO CHAT:** O código completo das alterações vai **SOMENTE** dentro dos blocos \`[START_FILE]\`. A sua resposta de chat (a parte conversacional) **NUNCA** deve conter esse mesmo código.
3.  **CONTEÚDO BRUTO DO ARQUIVO:** Blocos \`[START_FILE]\` contêm **APENAS o conteúdo bruto do arquivo**, sem \` \` \`.
4.  **EXEMPLOS NO CHAT:** Blocos \` \` \` são usados **APENAS para exemplos no chat**, fora dos blocos \`[START_FILE]\`.

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
