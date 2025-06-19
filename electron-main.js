// electron-main.js
const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, // Largura um pouco maior para acomodar melhor o IDE
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Mantenha false por segurança
      contextIsolation: true, // Mantenha true por segurança
      // preload: path.join(__dirname, 'preload.js') // Opcional: para comunicação IPC segura, não incluído neste passo
    },
    icon: path.join(__dirname, 'public/favicon.ico') // Tentativa de adicionar um ícone, pode não funcionar em todos os OS sem build
  });

  // Carrega a aplicação Next.js.
  // Em desenvolvimento, carrega do servidor de desenvolvimento do Next.js.
  // Em produção, você tipicamente carregaria um arquivo HTML de um 'next export' ou um servidor empacotado.
  // Para este setup inicial, focamos no desenvolvimento.
  const startUrl = isDev
    ? 'http://localhost:9002' // Garanta que esta porta corresponde ao seu servidor Next.js
    : `file://${path.join(__dirname, './out/index.html')}`; // Placeholder para produção (requer 'next export')

  win.loadURL(startUrl);

  // Abre o DevTools automaticamente em modo de desenvolvimento
  if (isDev) {
    win.webContents.openDevTools();
  }
}

// Este método será chamado quando o Electron tiver finalizado
// a inicialização e estiver pronto para criar janelas do navegador.
// Algumas APIs podem ser usadas somente após este evento ocorrer.
app.whenReady().then(createWindow);

// Encerra quando todas as janelas forem fechadas, exceto no macOS. No macOS, é comum
// para aplicações e suas barras de menu permanecerem ativas até que o usuário
// saia explicitamente com Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // No macOS, é comum recriar uma janela no aplicativo quando o
  // ícone do dock é clicado e não há outras janelas abertas.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
