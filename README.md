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
    A aplicação Next.js estará disponível em `http://localhost:9002`. O Electron irá carregar esta URL.

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
    Isso abrirá uma janela de desktop contendo sua aplicação IDE, carregando a partir de `http://localhost:9002`.

## Executando Localmente (Modo de Produção Simulado)

Para simular a execução da aplicação Electron carregando os arquivos estáticos (como faria em produção após o empacotamento):

1.  **Construa e Exporte a Aplicação Next.js e Inicie o Electron:**
    Este comando único irá construir a aplicação Next.js, exportá-la para arquivos estáticos na pasta `out/`, e então iniciar o Electron. O Electron será instruído (via `NODE_ENV=production`) a carregar os arquivos de `out/index.html`.
    ```bash
    npm run start:prod
    ```
    As DevTools do Electron não abrirão automaticamente neste modo.

    **Nota:** Se você ainda não tiver o servidor Genkit rodando (de `npm run genkit:watch` ou `npm run genkit:dev`), as funcionalidades de IA não estarão disponíveis.

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento do Next.js.
- `npm run genkit:dev`: Inicia o servidor do Genkit.
- `npm run genkit:watch`: Inicia o servidor do Genkit com monitoramento de arquivos.
- `npm run build`: Compila a aplicação Next.js para produção.
- `npm run export`: Exporta a aplicação Next.js para arquivos HTML estáticos (requer `npm run build` primeiro ou que seja parte de um script combinado).
- `npm run start`: Inicia um servidor de produção do Next.js (após `build`, para servir dinamicamente, não usado pelo Electron em modo de produção simulado).
- `npm run electron:dev`: Inicia a aplicação Electron em modo de desenvolvimento (requer que `npm run dev` esteja rodando).
- `npm run start:prod`: Constrói, exporta e inicia a aplicação Electron carregando os arquivos estáticos (simula o modo de produção).
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
- `out/`: (Gerado por `npm run export`) Contém os arquivos estáticos da aplicação para produção.

## Empacotamento para Produção Real (Próximos Passos)

Para distribuir sua aplicação como um executável real (.exe, .dmg, .AppImage), você precisará usar uma ferramenta como `electron-builder` ou `electron-forge`. Isso envolve configurar scripts de build adicionais no `package.json` e potencialmente ajustar o `electron-main.js` para garantir que ele carregue os arquivos de `out/index.html` corretamente quando o aplicativo estiver empacotado. O script `npm run start:prod` simula o carregamento local desses arquivos estáticos.
