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
    As funcionalidades de IA utilizam Genkit e podem ser configuradas para usar **OpenRouter** (recomendado) ou a API do Google AI.

    *   Crie um arquivo chamado `.env.local` na raiz do projeto, copiando o arquivo `.env`.
    *   Configure suas chaves de API neste arquivo. O OpenRouter terá prioridade se a chave for fornecida.

    **Opção 1: OpenRouter (Recomendado)**
    Use o [OpenRouter](https://openrouter.ai/) para acessar uma variedade de modelos de diferentes provedores com uma única chave de API.

    *   Adicione sua chave de API do OpenRouter e, opcionalmente, o nome do modelo:
        ```env
        # Obtenha uma chave em https://openrouter.ai/
        OPENROUTER_API_KEY=sua-chave-openrouter-aqui
        
        # Opcional: Especifique o modelo a ser usado (ex: openai/gpt-4o, google/gemini-pro)
        # Se não for especificado, o padrão será 'openai/gpt-4o'.
        OPENROUTER_MODEL_NAME=openai/gpt-4o
        ```

    **Opção 2: Google AI (Alternativa)**
    Se você preferir usar a API do Google diretamente:

    *   Adicione sua chave de API do Google:
        ```env
        GOOGLE_API_KEY=SUA_CHAVE_DE_API_AQUI
        ```
    *   **Nota:** Obtenha sua chave de API no [Google Cloud Console](https://console.cloud.google.com/). Certifique-se de que a "Generative Language API" (ou Vertex AI API) esteja ativada para o seu projeto.

    **Importante:** O arquivo `.env.local` é ignorado pelo Git para proteger suas chaves.

## Executando Localmente (Modo de Desenvolvimento)

Para rodar a aplicação localmente em modo de desenvolvimento com Electron, você precisará iniciar três processos separados em terminais diferentes:

1.  **Inicie o Servidor de Desenvolvimento do Next.js:**
    Este servidor servirá a interface do IDE para o Electron.
    ```bash
    npm run dev
    ```
    A aplicação Next.js estará disponível em `http://localhost:9002`. O Electron irá carregar esta URL.

2.  **Inicie o Servidor de Desenvolvimento do Genkit:**
    Este servidor lida com as funcionalidades de IA.
    ```bash
    npm run genkit:watch
    ```
    ou para iniciar uma vez:
    ```bash
    npm run genkit:dev
    ```
    Isso também iniciará a UI de desenvolvimento do Genkit, geralmente em `http://localhost:4000`.

3.  **Inicie a Aplicação Electron:**
    Após os servidores Next.js e Genkit estarem rodando, inicie o Electron:
    ```bash
    npm run electron:dev
    ```
    Isso abrirá uma janela de desktop contendo sua aplicação IDE, carregando a partir de `http://localhost:9002`. As DevTools do Electron abrirão automaticamente.

## Executando Localmente (Modo de Produção Simulado)

Para simular a execução da aplicação Electron carregando a partir de um servidor de produção Next.js:

1.  **Construa a Aplicação Next.js:**
    ```bash
    npm run build
    ```

2.  **Inicie o Servidor de Produção do Next.js (em um novo terminal):**
    Este servidor servirá a aplicação Next.js otimizada.
    ```bash
    npm run start
    ```
    A aplicação Next.js estará disponível em `http://localhost:9002`.

3.  **Inicie a Aplicação Electron em Modo de Produção (em um novo terminal):**
    Após o servidor de produção do Next.js estar rodando, inicie o Electron:
    ```bash
    npm run start:prod
    ```
    Isso abrirá a aplicação Electron, carregando de `http://localhost:9002`. As DevTools do Electron não abrirão automaticamente neste modo.

    **Nota:** Se você ainda não tiver o servidor Genkit rodando (de `npm run genkit:watch` ou `npm run genkit:dev`), as funcionalidades de IA não estarão disponíveis.

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento do Next.js na porta 9002.
- `npm run genkit:dev`: Inicia o servidor do Genkit.
- `npm run genkit:watch`: Inicia o servidor do Genkit com monitoramento de arquivos.
- `npm run build`: Compila a aplicação Next.js para produção.
- `npm run start`: Inicia um servidor de produção do Next.js na porta 9002 (após `build`).
- `npm run lint`: Executa o ESLint.
- `npm run typecheck`: Verifica os tipos com TypeScript.
- `npm run electron:dev`: Inicia a aplicação Electron em modo de desenvolvimento (requer que `npm run dev` esteja rodando). Carrega de `http://localhost:9002`.
- `npm run start:prod`: Compila a aplicação Next.js e inicia o Electron em modo de produção (requer que `npm run start` esteja rodando para servir a aplicação). Carrega de `http://localhost:9002`.

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

## Empacotamento para Produção Real (Próximos Passos)

Para distribuir sua aplicação como um executável real (.exe, .dmg, .AppImage), você precisará usar uma ferramenta como `electron-builder` ou `electron-forge`. Isso envolve configurar scripts de build adicionais no `package.json` e potencialmente ajustar o `electron-main.js` para empacotar o servidor Next.js ou gerenciar seu ciclo de vida dentro do aplicativo empacotado. Os scripts atuais `npm run start` e `npm run start:prod` preparam e executam a aplicação de forma que um servidor Next.js esteja sempre ativo para o Electron carregar.
