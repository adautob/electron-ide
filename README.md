# Electron IDE (Next.js Version)

Este é um protótipo de um IDE desktop construído com Next.js, ShadCN UI, Tailwind CSS e Genkit para funcionalidades de IA.

## Pré-requisitos

- Node.js (v18 ou superior recomendado)
- npm (ou yarn)

## Configuração

1.  **Clone o repositório (se ainda não o fez):**
    ```bash
    git clone <url-do-repositorio>
    cd <nome-da-pasta-do-projeto>
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```
    ou
    ```bash
    yarn install
    ```

3.  **Configure as Variáveis de Ambiente para IA (Genkit):**
    As funcionalidades de IA utilizam Genkit com o plugin do Google AI. Você precisará de uma chave de API do Google Cloud.

    *   Crie um arquivo chamado `.env.local` na raiz do projeto.
    *   Adicione sua chave de API do Google a este arquivo:
        ```env
        GOOGLE_API_KEY=SUA_CHAVE_DE_API_AQUI
        ```
    *   **Nota:** Obtenha sua chave de API no [Google Cloud Console](https://console.cloud.google.com/). Certifique-se de que a "Generative Language API" (ou Vertex AI API) esteja ativada para o seu projeto. O arquivo `.env.local` é ignorado pelo Git para proteger sua chave.

## Executando Localmente

Para rodar a aplicação localmente, você precisará iniciar dois processos separados: o servidor de desenvolvimento do Next.js para a interface do IDE e o servidor do Genkit para as funcionalidades de IA.

1.  **Inicie o Servidor de Desenvolvimento do Next.js:**
    ```bash
    npm run dev
    ```
    A aplicação estará disponível em `http://localhost:9002` (ou outra porta, se a 9002 estiver ocupada).

2.  **Inicie o Servidor de Desenvolvimento do Genkit:**
    Abra um **novo terminal** (mantenha o servidor do Next.js rodando).
    Execute um dos seguintes comandos:
    *   Para iniciar o Genkit e observar alterações nos arquivos de IA (recomendado):
        ```bash
        npm run genkit:watch
        ```
    *   Para iniciar o Genkit uma vez:
        ```bash
        npm run genkit:dev
        ```
    Isso também iniciará a UI de desenvolvimento do Genkit, geralmente em `http://localhost:4000`, onde você pode inspecionar e testar seus flows de IA.

Agora você pode abrir `http://localhost:9002` no seu navegador para usar o IDE.

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento do Next.js.
- `npm run genkit:dev`: Inicia o servidor do Genkit.
- `npm run genkit:watch`: Inicia o servidor do Genkit com monitoramento de arquivos.
- `npm run build`: Compila a aplicação Next.js para produção.
- `npm run start`: Inicia um servidor de produção do Next.js (após `build`).
- `npm run lint`: Executa o ESLint.
- `npm run typecheck`: Verifica os tipos com TypeScript.

## Estrutura do Projeto (Principais Pastas)

- `src/app/`: Contém as páginas e layouts da aplicação Next.js (App Router).
- `src/components/`: Contém os componentes React reutilizáveis.
  - `src/components/ide/`: Componentes específicos da interface do IDE.
  - `src/components/ui/`: Componentes da biblioteca ShadCN UI.
- `src/ai/`: Contém a lógica relacionada à IA com Genkit.
  - `src/ai/flows/`: Define os flows do Genkit.
  - `src/ai/genkit.ts`: Configuração e inicialização do Genkit.
- `src/lib/`: Utilitários e lógicas gerais.
- `src/hooks/`: Hooks React customizados.
- `src/types/`: Definições de tipos TypeScript.
- `public/`: Arquivos estáticos.
