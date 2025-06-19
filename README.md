# Electron IDE (Next.js Version)

Este é um protótipo de um IDE desktop construído com Next.js, ShadCN UI, Tailwind CSS e Genkit para funcionalidades de IA, empacotado com Electron.

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
    Isso instalará as dependências do Next.js e do Electron.

3.  **Configure as Variáveis de Ambiente para IA (Genkit):**
    As funcionalidades de IA utilizam Genkit com o plugin do Google AI. Você precisará de uma chave de API do Google Cloud.

    *   Crie um arquivo chamado `.env.local` na raiz do projeto.
    *   Adicione sua chave de API do Google a este arquivo:
        ```env
        GOOGLE_API_KEY=SUA_CHAVE_DE_API_AQUI
        ```
    *   **Nota:** Obtenha sua chave de API no [Google Cloud Console](https://console.cloud.google.com/). Certifique-se de que a "Generative Language API" (ou Vertex AI API) esteja ativada para o seu projeto. O arquivo `.env.local` é ignorado pelo Git para proteger sua chave.

## Executando Localmente (Modo de Desenvolvimento)

Para rodar a aplicação localmente em modo de desenvolvimento com Electron, você precisará iniciar três processos separados:

1.  **Inicie o Servidor de Desenvolvimento do Next.js:**
    Este servidor servirá a interface do IDE para o Electron.
    ```bash
    npm run dev
    ```
    A aplicação Next.js estará disponível em `http://localhost:9002` (ou outra porta, se a 9002 estiver ocupada). O Electron irá carregar esta URL.

2.  **Inicie o Servidor de Desenvolvimento do Genkit (em um novo terminal):**
    Este servidor lida com as funcionalidades de IA.
    ```bash
    npm run genkit:watch
    ```
    ou para iniciar uma vez:
    ```bash
    npm run genkit:dev
    ```
    Isso também iniciará a UI de desenvolvimento do Genkit, geralmente em `http://localhost:4000`.

3.  **Inicie a Aplicação Electron (em um novo terminal):**
    Após os servidores Next.js e Genkit estarem rodando, inicie o Electron:
    ```bash
    npm run electron:dev
    ```
    Isso abrirá uma janela de desktop contendo sua aplicação IDE.

Agora você tem o IDE rodando como uma aplicação desktop!

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento do Next.js.
- `npm run genkit:dev`: Inicia o servidor do Genkit.
- `npm run genkit:watch`: Inicia o servidor do Genkit com monitoramento de arquivos.
- `npm run electron:dev`: Inicia a aplicação Electron (requer que `npm run dev` esteja rodando).
- `npm run build`: Compila a aplicação Next.js para produção (não inclui o empacotamento Electron).
- `npm run start`: Inicia um servidor de produção do Next.js (após `build`).
- `npm run lint`: Executa o ESLint.
- `npm run typecheck`: Verifica os tipos com TypeScript.

## Estrutura do Projeto (Principais Pastas)

- `electron-main.js`: Ponto de entrada principal para o processo Electron.
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

## Empacotamento para Produção (Próximos Passos)

Para distribuir sua aplicação como um executável (.exe, .dmg, .AppImage), você precisará usar uma ferramenta como `electron-builder` ou `electron-forge`. Isso envolve configurar scripts de build adicionais no `package.json` e potencialmente ajustar o `electron-main.js` para carregar arquivos estáticos gerados por `next build && next export`. Esta configuração básica não inclui o empacotamento para produção.
