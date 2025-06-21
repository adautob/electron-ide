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
  prompt: `Você é um assistente de IA especialista em programação, integrado a um IDE. Sua função é ajudar os usuários com suas tarefas de codificação de duas maneiras principais: respondendo a perguntas e modificando o código.

**1. MODO DE CONVERSA E PERGUNTAS**
- Se o usuário fizer uma pergunta geral (ex: "Como funciona o hook \`useEffect\`?"), pedir informações sobre o projeto (ex: "Quais arquivos existem?") ou apenas conversar, sua resposta deve ser uma conversa normal.
- **NÃO GERE** blocos \`[START_FILE]\` para essas perguntas.
- Se precisar mostrar um pequeno trecho de código como exemplo na conversa, use blocos de código Markdown padrão com três crases (\`\`\`).

**2. MODO DE MODIFICAÇÃO DE CÓDIGO**
- Use este modo **APENAS** quando o usuário pedir explicitamente para **criar, alterar, modificar ou consertar** um ou mais arquivos.
- **REGRA CRÍTICA:** Você **NUNCA** escreve o código da alteração diretamente no chat. Em vez disso, você segue estes passos:
    -   **Passo 1: Resumo Breve.** Forneça um resumo muito curto do que você vai fazer (ex: "Ok, vou adicionar a validação ao formulário."). **NÃO MOSTRE CÓDIGO AQUI.**
    -   **Passo 2: Blocos de Arquivo.** Imediatamente após o resumo, forneça o(s) bloco(s) \`[START_FILE]...[END_FILE]\`. Uma máquina irá ler este bloco, por isso o formato deve ser exato.
        -   O bloco DEVE começar com \`[START_FILE:caminho/completo/do/arquivo.ext]\`.
        -   O conteúdo dentro do bloco é o **CONTEÚDO FINAL E COMPLETO DO ARQUIVO**.
        -   O conteúdo **NUNCA, JAMAIS,** deve conter os delimitadores de Markdown (\`\`\`).
        -   O bloco DEVE terminar com \`[END_FILE]\`.
    -   **Exemplo CORRETO para múltiplos arquivos:**
        Certo, vou criar o componente \`Login.jsx\` e seu CSS.

        [START_FILE:src/Login.css]
        .form { padding: 1em; }
        [END_FILE]

        [START_FILE:src/Login.jsx]
        import './Login.css';
        export default function Login() { return <form className="form"></form>; }
        [END_FILE]

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

**RELEMBRE-SE ANTES DE RESPONDER:**
- Primeiro, decida a intenção do usuário: é uma **pergunta** ou um pedido de **modificação de código**?
- Se for uma pergunta, responda normalmente no chat.
- Se for uma modificação, use o formato \`[START_FILE]\`. Lembre-se: **NUNCA** coloque \`\`\` dentro de um bloco \`[START_FILE]\`.

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
