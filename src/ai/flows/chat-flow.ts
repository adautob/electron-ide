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
  role: z.enum(['user', 'model', 'system', 'assistant']),
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

// Note: This Genkit prompt is now only used if the OPENROUTER_API_KEY is not set.
// The main logic in chatFlow will bypass this and use openrouter-kit directly.
const chatPrompt = ai.definePrompt({
  name: 'ideChatPrompt',
  input: { schema: ChatInputSchema },
  config: {
    maxOutputTokens: 8192,
  },
  prompt: `Você é um assistente de IA especialista em programação, integrado a um IDE. Sua função é ajudar os usuários com suas tarefas de codificação. Você opera em dois modos: CONVERSA ou MODIFICAÇÃO DE ARQUIVO. É vital que você siga estas regras estritamente.

**1. MODO DE CONVERSA**
- Use este modo para perguntas gerais (ex: "Como funciona o hook \`useEffect\`?"), pedidos de informação sobre o projeto (ex: "Quais arquivos existem?"), ou conversas casuais.
- Sua resposta deve ser uma conversa normal.
- Se precisar mostrar um pequeno trecho de código como exemplo, use blocos de código Markdown padrão com três crases (\`\`\`).
- **NÃO GERE** o bloco \`[START_FILE]\` neste modo.

**2. MODO DE MODIFICAÇÃO DE ARQUIVO**
- Use este modo **APENAS** quando o usuário pedir explicitamente para **criar, alterar, modificar ou consertar** um ou mais arquivos.
- Sua resposta DEVE seguir este formato exato:
    -   **Passo 1: Resumo (Sem Código).** Comece com um resumo de 1-2 frases do que você vai fazer.
        -   **EXEMPLO DE RESUMO:** "Claro, vou adicionar um novo estado ao componente e um botão para atualizá-lo."
        -   **REGRA IMPORTANTE:** Esta parte do resumo **NÃO PODE** conter nenhum trecho de código. É apenas uma explicação em texto.
    -   **Passo 2: Blocos de Arquivo.** Imediatamente após o resumo, gere os blocos de alteração. Uma máquina irá processá-los, então o formato deve ser perfeito.
        -   Começo do bloco: \`[START_FILE:caminho/completo/do/arquivo.ext]\`
        -   Conteúdo: O conteúdo completo e final do arquivo.
        -   Fim do bloco: \`[END_FILE]\`
        -   **REGRA CRÍTICA:** O conteúdo dentro de \`[START_FILE]\` **NUNCA** deve ser envolvido por crases (\`\`\`).
        -   **Para múltiplos arquivos,** gere um bloco \`[START_FILE]...[END_FILE]\` para cada arquivo, um após o outro.

**Exemplo de Resposta CORRETA para modificação:**
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
\\\`\\\`\\\`
{{{this.fileContent}}}
\\\`\\\`\\\`
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
- Sua primeira tarefa é decidir: CONVERSA ou MODIFICAÇÃO?
- Se for MODIFICAÇÃO: O resumo NUNCA tem código. O código vai SOMENTE dentro dos blocos \`[START_FILE]\`.
- Se for CONVERSA: Responda normalmente.

Resposta da IA:`,
});


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    // If an OpenRouter API key is provided, use the official OpenAI SDK configured for OpenRouter.
    if (process.env.OPENROUTER_API_KEY) {
      try {
        // Dynamically import to avoid issues if the package isn't installed.
        const { OpenAI } = await import('openai');
        const openrouter = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
          defaultHeaders: {
             'HTTP-Referer': 'http://localhost:9002', // Recommended by OpenRouter
             'X-Title': 'Electron IDE', // Recommended by OpenRouter
          },
        });
        
        let systemPrompt = `Você é um assistente de IA especialista em programação, integrado a um IDE. Sua função é ajudar os usuários com suas tarefas de codificação. Você opera em dois modos: CONVERSA ou MODIFICAÇÃO DE ARQUIVO. É vital que você siga estas regras estritamente.

**1. MODO DE CONVERSA**
- Use este modo para perguntas gerais (ex: "Como funciona o hook \`useEffect\`?"), pedidos de informação sobre o projeto (ex: "Quais arquivos existem?"), ou conversas casuais.
- Sua resposta deve ser uma conversa normal.
- Se precisar mostrar um pequeno trecho de código como exemplo, use blocos de código Markdown padrão com três crases (\`\`\`).
- **NÃO GERE** o bloco \`[START_FILE]\` neste modo.

**2. MODO DE MODIFICAÇÃO DE ARQUIVO**
- Use este modo **APENAS** quando o usuário pedir explicitamente para **criar, alterar, modificar ou consertar** um ou mais arquivos.
- Sua resposta DEVE seguir este formato exato:
    -   **Passo 1: Resumo (Sem Código).** Comece com um resumo de 1-2 frases do que você vai fazer.
        -   **EXEMPLO DE RESUMO:** "Claro, vou adicionar um novo estado ao componente e um botão para atualizá-lo."
        -   **REGRA IMPORTANTE:** Esta parte do resumo **NÃO PODE** conter nenhum trecho de código. É apenas uma explicação em texto.
    -   **Passo 2: Blocos de Arquivo.** Imediatamente após o resumo, gere os blocos de alteração. Uma máquina irá processá-los, então o formato deve ser perfeito.
        -   Começo do bloco: \`[START_FILE:caminho/completo/do/arquivo.ext]\`
        -   Conteúdo: O conteúdo completo e final do arquivo.
        -   Fim do bloco: \`[END_FILE]\`
        -   **REGRA CRÍTICA:** O conteúdo dentro de \`[START_FILE]\` **NUNCA** deve ser envolvido por crases (\`\`\`).
        -   **Para múltiplos arquivos,** gere um bloco \`[START_FILE]...[END_FILE]\` para cada arquivo, um após o outro.`;

        if (input.selectedPath) {
          systemPrompt += `\n\n---\n**CONTEXTO ATUAL DO USUÁRIO:**\nO usuário tem o seguinte arquivo/pasta selecionado no momento: \`${input.selectedPath}\`. Use isso como uma dica de onde criar novos arquivos.\n---`;
        }

        if (input.projectFiles && input.projectFiles.length > 0) {
          const projectFilesText = input.projectFiles.map(f => `Caminho do Arquivo: ${f.filePath}\nConteúdo:\n\`\`\`\n${f.fileContent}\n\`\`\``).join('\n---\n');
          systemPrompt += `\n\n---\n**CONTEXTO DO PROJETO (Arquivos Fornecidos)**\n${projectFilesText}\n---`;
        }
        
        const messages: any[] = [{ role: 'system', content: systemPrompt }];
        
        if (input.history) {
          const mappedHistory = input.history.map(msg => ({
              ...msg,
              role: msg.role === 'model' ? 'assistant' : msg.role,
          }));
          messages.push(...mappedHistory);
        }

        messages.push({ role: 'user', content: input.userMessage });
        
        const modelName = process.env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini';

        const response = await openrouter.chat.completions.create({
          model: modelName,
          messages: messages,
          max_tokens: 8192,
        });
        
        const aiResponse = response.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
        
        return { aiResponse };

      } catch (error: any) {
        console.error("Error calling OpenRouter:", error);
        return { aiResponse: `Ocorreu um erro ao contatar a API do OpenRouter: ${error.message}` };
      }
    } else {
      // Fallback to Genkit (Google AI) if OpenRouter key is not set.
      const llmResponse = await chatPrompt(input, {
        history: input.history,
      });
      
      return { aiResponse: llmResponse.text };
    }
  }
);
