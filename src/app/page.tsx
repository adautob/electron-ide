
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileExplorer } from '@/components/ide/file-explorer';
import { CodeEditor } from '@/components/ide/code-editor';
import { IntegratedTerminal } from '@/components/ide/integrated-terminal';
import { IdeHeader } from '@/components/ide/ide-header';
import { PreferencesDialog } from '@/components/ide/preferences-dialog';
import { TerminalResizableWrapper } from '@/components/ide/terminal-resizable-wrapper';
import { AiChatPanel } from '@/components/ide/ai-chat-panel';
import type { FileOrFolder } from '@/types';
import { generateCodeFromComment } from '@/ai/flows/ai-code-completion';
import { aiCodeCompletionFromContext, type AICodeCompletionFromContextInput } from '@/ai/flows/ai-code-completion-from-context';
import { useToast } from '@/hooks/use-toast';

// Helper function to find an item by path in a nested structure
const findItemByPathRecursive = (items: FileOrFolder[], path: string): FileOrFolder | null => {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.children) {
      const found = findItemByPathRecursive(item.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

// Helper function to get the parent path of a file/folder path
const getParentPathRecursive = (itemPath: string): string | null => {
  if (!itemPath.includes('/')) {
    return null; 
  }
  return itemPath.substring(0, itemPath.lastIndexOf('/'));
};


export default function IdePage() {
  const [files, setFiles] = useState<FileOrFolder[]>([]);
  const [activeFile, setActiveFile] = useState<FileOrFolder | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to Electron IDE Terminal!']);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [openedDirectoryName, setOpenedDirectoryName] = useState<string | null>(null);
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const { toast } = useToast();

  const processDirectory = async (directoryHandle: FileSystemDirectoryHandle, currentPath: string = ''): Promise<FileOrFolder[]> => {
    const entries: FileOrFolder[] = [];
    const sortedSystemEntries = [];
    for await (const entry of directoryHandle.values()) {
      sortedSystemEntries.push(entry);
    }
    
    sortedSystemEntries.sort((a, b) => {
      if (a.kind === 'directory' && b.kind === 'file') return -1;
      if (a.kind === 'file' && b.kind === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedSystemEntries) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        entries.push({
          id: entryPath,
          name: entry.name,
          type: 'file',
          path: entryPath,
          handle: entry as FileSystemFileHandle,
        });
      } else if (entry.kind === 'directory') {
        entries.push({
          id: entryPath,
          name: entry.name,
          type: 'folder',
          path: entryPath,
          children: await processDirectory(entry as FileSystemDirectoryHandle, entryPath),
          handle: entry as FileSystemDirectoryHandle,
        });
      }
    }
    return entries;
  };

  const handleOpenFolder = async () => {
    try {
      if (!window.showDirectoryPicker) {
        toast({ variant: "destructive", title: "Erro", description: "Seu navegador não suporta a API para abrir pastas locais." });
        return;
      }
      const directoryHandle = await window.showDirectoryPicker();
      setRootDirectoryHandle(directoryHandle);
      const processedFiles = await processDirectory(directoryHandle);
      setFiles(processedFiles);
      setActiveFile(null);
      setEditorContent('');
      setOpenedDirectoryName(directoryHandle.name);
      toast({ title: "Pasta Aberta", description: `Pasta "${directoryHandle.name}" carregada.` });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Seleção de pasta cancelada pelo usuário.");
      } else {
        console.error("Erro ao abrir pasta:", error);
        toast({ variant: "destructive", title: "Erro ao Abrir Pasta", description: "Não foi possível carregar a pasta." });
      }
    }
  };
  
  const handleSelectFile = useCallback(async (file: FileOrFolder) => {
    if (file.type === 'file') {
      setActiveFile(file);
      if (file.content) {
        setEditorContent(file.content);
      } else if (file.handle && file.handle.kind === 'file') {
        try {
          const fsFileHandle = file.handle as FileSystemFileHandle;
          const fileData = await fsFileHandle.getFile();
          const text = await fileData.text();
          setEditorContent(text);
          setFiles(prevFiles => {
            const updateContent = (items: FileOrFolder[]): FileOrFolder[] => 
              items.map(item => {
                if (item.id === file.id) return { ...item, content: text };
                if (item.children) return { ...item, children: updateContent(item.children) };
                return item;
              });
            return updateContent(prevFiles);
          });
        } catch (error) {
          console.error("Erro ao ler arquivo:", error);
          toast({ variant: "destructive", title: "Erro ao Ler Arquivo", description: `Não foi possível ler ${file.name}.` });
          setEditorContent(`// Erro ao carregar ${file.name}`);
        }
      } else {
        setEditorContent(`// Conteúdo para ${file.name} (sem handle ou não é arquivo)\n`);
      }
    } else { 
      setActiveFile(file); 
      setEditorContent(''); 
    }
  }, [toast]);

  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    if (activeFile && activeFile.type === 'file') {
      setFiles(prevFiles => {
        const updateFileContent = (items: FileOrFolder[]): FileOrFolder[] => {
          return items.map(item => {
            if (item.id === activeFile.id) {
              return { ...item, content };
            }
            if (item.children) {
              return { ...item, children: updateFileContent(item.children) };
            }
            return item;
          });
        };
        return updateFileContent(prevFiles);
      });
    }
  }, [activeFile]);

  const handleSaveFile = async () => {
    if (!activeFile || activeFile.type !== 'file' || !activeFile.handle) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Nenhum arquivo selecionado ou o arquivo não pode ser salvo.',
      });
      return;
    }

    try {
      const fileHandle = activeFile.handle as FileSystemFileHandle;
      
      if (typeof fileHandle.requestPermission === 'function') {
        const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          toast({ variant: 'destructive', title: 'Permissão Negada', description: 'Permissão para salvar o arquivo foi negada.' });
          return;
        }
      }
      
      const writable = await fileHandle.createWritable();
      await writable.write(editorContent);
      await writable.close();
      toast({
        title: 'Arquivo Salvo',
        description: `"${activeFile.name}" foi salvo com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar arquivo:', error);
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError' || error.name === 'NotFoundError')) {
           toast({
              variant: 'destructive',
              title: 'Permissão ou Erro ao Salvar',
              description: 'Permissão negada ou arquivo não encontrado. Tente novamente ou reabra a pasta.',
          });
      } else {
          toast({
              variant: 'destructive',
              title: 'Erro ao Salvar',
              description: `Não foi possível salvar "${activeFile.name}".`,
          });
      }
    }
  };

  const getDirectoryHandleByPath = useCallback(async (path: string | null, currentRootHandle: FileSystemDirectoryHandle | null): Promise<FileSystemDirectoryHandle | null> => {
    if (!currentRootHandle) return null;
    if (path === null || path === '' || path === openedDirectoryName) {
      return currentRootHandle;
    }

    const pathSegments = path.split('/');
    let currentHandle: FileSystemDirectoryHandle | null = currentRootHandle;
    
    for (const segment of pathSegments) {
        if (!currentHandle) return null;
        try {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
        } catch (e) {
             console.warn(`Falha ao obter handle para "${segment}" em "${path}" diretamente, tentando encontrar no estado...`, e);
             
             let accumulatedPath = '';
             const segmentsToCurrent = pathSegments.slice(0, pathSegments.indexOf(segment) + 1);
             accumulatedPath = segmentsToCurrent.join('/');

             const findInFileOrFolder = (items: FileOrFolder[], targetPath: string): FileSystemDirectoryHandle | undefined => {
                for (const item of items) {
                    if (item.path === targetPath && item.type === 'folder' && item.handle?.kind === 'directory') {
                        return item.handle as FileSystemDirectoryHandle;
                    }
                    if (item.children) {
                        const found = findInFileOrFolder(item.children, targetPath);
                        if (found) return found;
                    }
                }
                return undefined;
            };
            currentHandle = findInFileOrFolder(files, accumulatedPath) || null;
            if (!currentHandle) {
                console.error(`Não foi possível encontrar handle de diretório para o segmento "${segment}" em "${path}" mesmo no estado.`);
                return null;
            }
        }
    }
    return currentHandle;
  }, [files, openedDirectoryName]);


  const refreshDirectoryInState = async (directoryPath: string | null, dirHandle: FileSystemDirectoryHandle) => {
    const relativePathForProcessDirectory = directoryPath === openedDirectoryName || directoryPath === null ? '' : directoryPath;
    const newChildren = await processDirectory(dirHandle, relativePathForProcessDirectory || '');

    if (directoryPath === null || directoryPath === openedDirectoryName || directoryPath === '') { 
      setFiles(newChildren);
    } else { 
      setFiles(prevFiles => {
        const updateChildren = (items: FileOrFolder[]): FileOrFolder[] => {
          return items.map(item => {
            if (item.path === directoryPath && item.type === 'folder') {
              return { ...item, children: newChildren };
            }
            if (item.children) {
              return { ...item, children: updateChildren(item.children) };
            }
            return item;
          });
        };
        return updateChildren(prevFiles);
      });
    }
  };
  
  const handleCreateItem = async (type: 'file' | 'folder', targetDirectoryPath: string | null) => {
    if (!rootDirectoryHandle) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta para criar itens." });
      return;
    }

    const itemName = prompt(`Digite o nome para ${type === 'file' ? 'o novo arquivo' : 'a nova pasta'}:`);
    if (!itemName || itemName.trim() === '') {
      toast({ title: "Cancelado", description: `Criação de ${type} cancelada.` });
      return;
    }

    const parentDirHandle = await getDirectoryHandleByPath(targetDirectoryPath, rootDirectoryHandle);

    if (!parentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Diretório pai "${targetDirectoryPath || openedDirectoryName || 'raiz'}" não encontrado.` });
      return;
    }
    
    try {
        if (type === 'file') {
            await parentDirHandle.getFileHandle(itemName);
        } else {
            await parentDirHandle.getDirectoryHandle(itemName);
        }
        toast({ variant: "destructive", title: "Erro ao Criar", description: `Um item chamado "${itemName}" já existe.` });
        return;
    } catch (e) {
        if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
            console.error("Erro ao verificar existência:", e);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao verificar existência do item."});
            return;
        }
    }

    try {
      let newItemHandle: FileSystemFileHandle | FileSystemDirectoryHandle;
      if (type === 'file') {
        newItemHandle = await parentDirHandle.getFileHandle(itemName, { create: true });
      } else {
        newItemHandle = await parentDirHandle.getDirectoryHandle(itemName, { create: true });
      }
      
      const pathForRefresh = parentDirHandle === rootDirectoryHandle ? null : targetDirectoryPath;
      await refreshDirectoryInState(pathForRefresh, parentDirHandle);
      
      toast({ title: `${type === 'file' ? 'Arquivo Criado' : 'Pasta Criada'}`, description: `"${itemName}" foi criado com sucesso.` });

      if (type === 'file' && newItemHandle.kind === 'file') {
        const newFilePath = targetDirectoryPath ? `${targetDirectoryPath}/${itemName}` : itemName;
        
        setTimeout(async () => {
            let fileToSelect: FileOrFolder | null = null;
            
            await refreshDirectoryInState(pathForRefresh, parentDirHandle);

            setFiles(currentFiles => {
                const findNewlyCreatedFile = (items: FileOrFolder[], path: string): FileOrFolder | null => {
                  for (const item of items) {
                    if (item.path === path && item.type === 'file') return item;
                    if (item.children) {
                      const found = findNewlyCreatedFile(item.children, path);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                fileToSelect = findNewlyCreatedFile(currentFiles, newFilePath);
                
                if (fileToSelect && !fileToSelect.handle && newItemHandle.kind === 'file') {
                    fileToSelect.handle = newItemHandle as FileSystemFileHandle;
                } else if (fileToSelect && fileToSelect.handle?.kind !== 'file' && newItemHandle.kind === 'file') {
                    fileToSelect.handle = newItemHandle as FileSystemFileHandle;
                }
                return currentFiles; 
            });

            if (fileToSelect) {
                 await handleSelectFile(fileToSelect);
                 setEditorContent(''); 
            } else {
                const tempFileToSelect : FileOrFolder = { 
                    id: newFilePath, 
                    name: itemName, 
                    type: 'file', 
                    path: newFilePath, 
                    handle: newItemHandle as FileSystemFileHandle 
                };
                await handleSelectFile(tempFileToSelect);
                setEditorContent('');
            }
        }, 250); 
      }

    } catch (error) {
      console.error(`Erro ao criar ${type}:`, error);
      toast({ variant: "destructive", title: `Erro ao Criar ${type}`, description: `Não foi possível criar "${itemName}". Verifique as permissões.` });
    }
  };

  const handleRenameItem = async (itemPath: string) => {
    if (!rootDirectoryHandle) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta." });
      return;
    }
    
    const itemToRename = findItemByPathRecursive(files, itemPath);
    if (!itemToRename) {
      toast({ variant: "destructive", title: "Erro", description: "Item não encontrado." });
      return;
    }

    if (itemPath === openedDirectoryName || (itemToRename.handle && itemToRename.handle === rootDirectoryHandle)) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Não é possível renomear a pasta raiz aberta." });
      return;
    }

    const newName = prompt(`Digite o novo nome para "${itemToRename.name}":`, itemToRename.name);
    if (!newName || newName.trim() === '' || newName === itemToRename.name) {
      toast({ title: "Cancelado", description: "Renomeação cancelada ou nome inalterado." });
      return;
    }

    const parentPath = getParentPathRecursive(itemPath); 
    const parentDirHandle = await getDirectoryHandleByPath(parentPath, rootDirectoryHandle);

    if (!parentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Diretório pai de "${itemPath}" não encontrado.` });
      return;
    }

    try {
      if (itemToRename.type === 'file') {
        await parentDirHandle.getFileHandle(newName);
      } else {
        await parentDirHandle.getDirectoryHandle(newName);
      }
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Um item chamado "${newName}" já existe.` });
      return;
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
        console.error("Erro ao verificar existência para renomear:", e);
        toast({ variant: "destructive", title: "Erro", description: "Falha ao verificar existência do novo nome."});
        return;
      }
    }
    
    try {
      if (!itemToRename.handle) {
        toast({ variant: "destructive", title: "Erro", description: "Handle do item não encontrado." });
        return;
      }
      
      const handleToMove = itemToRename.handle as any; // FileSystemFileHandle or FileSystemDirectoryHandle
      if (typeof handleToMove.move === 'function') {
         await handleToMove.move(newName);
      } else {
        console.error("FileSystemHandle.move() is not supported for this item or browser.");
        toast({
          variant: "destructive",
          title: "Operação Não Suportada",
          description: "A renomeação de arquivos/pastas pode não ser totalmente suportada pelo seu navegador ou para este item específico.",
        });
        return;
      }
      
      const pathForRefresh = parentDirHandle === rootDirectoryHandle ? null : parentPath;
      await refreshDirectoryInState(pathForRefresh, parentDirHandle);

      toast({ title: "Renomeado", description: `"${itemToRename.name}" foi renomeado para "${newName}".` });

      const newFullPath = parentPath ? `${parentPath}/${newName}` : newName;
      if (activeFile) {
        if (activeFile.path === itemPath) { 
          let newHandle: FileSystemFileHandle | FileSystemDirectoryHandle | undefined;
          try {
            if (itemToRename.type === 'file') {
              newHandle = await parentDirHandle.getFileHandle(newName);
            } else {
              newHandle = await parentDirHandle.getDirectoryHandle(newName);
            }
          } catch (err) {
            console.error("Error fetching handle for renamed item:", err);
          }
          setActiveFile(prev => ({
            ...prev!,
            name: newName,
            path: newFullPath,
            id: newFullPath,
            handle: newHandle || prev!.handle, 
          }));
        } else if (itemToRename.type === 'folder' && activeFile.path.startsWith(itemPath + '/')) { 
            const newActiveFilePath = activeFile.path.replace(itemPath, newFullPath);
            setActiveFile(prev => ({
                ...prev!,
                path: newActiveFilePath,
                id: newActiveFilePath,
            }));
        }
      }

    } catch (error) {
      console.error("Erro ao renomear:", error);
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Não foi possível renomear "${itemToRename.name}". Verifique as permissões ou se o item está em uso.` });
      const pathForRefreshOnError = parentDirHandle === rootDirectoryHandle ? null : parentPath;
      await refreshDirectoryInState(pathForRefreshOnError, parentDirHandle);
    }
  };

  const handleCommandSubmit = useCallback((command: string) => {
    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setTimeout(() => {
      if (command.toLowerCase() === 'ls') {
        if (openedDirectoryName) {
          const rootFileNames = files.map(f => f.name).join('  ');
          setTerminalOutput(prev => [...prev, rootFileNames || `(pasta ${openedDirectoryName} vazia)`]);
        } else {
           setTerminalOutput(prev => [...prev, 'Nenhuma pasta aberta. Use o botão "Abrir Pasta".']);
        }
      } else if (command.toLowerCase() === 'clear') {
        setTerminalOutput([`Terminal limpo. ${openedDirectoryName ? `Pasta atual: ${openedDirectoryName}` : 'Nenhuma pasta aberta.'}`]);
      } else {
        setTerminalOutput(prev => [...prev, `Comando não encontrado: ${command}`]);
      }
    }, 300);
  }, [files, openedDirectoryName]);

  const handleGenerateFromComment = async (comment: string, existingCode: string) => {
    toast({ title: "AI", description: "Gerando código do comentário..." });
    try {
      const result = await generateCodeFromComment({ comment, existingCode });
      setEditorContent(prev => `${prev}\n${result.codeSuggestion}`);
      toast({ title: "AI Sucesso", description: "Sugestão de código adicionada." });
    } catch (error) {
      console.error("AI Erro:", error);
      toast({ variant: "destructive", title: "AI Erro", description: "Falha ao gerar código." });
    }
  };

  const handleCompleteFromContext = async (codeSnippet: string, cursorPosition: number) => {
    toast({ title: "AI", description: "Gerando autocompletar..." });
    
    // Collect content of other open files or relevant files if needed
    // For now, sending only current file context
    const input: AICodeCompletionFromContextInput = {
      codeSnippet,
      cursorPosition,
      programmingLanguage: activeFile?.name.endsWith('.ts') || activeFile?.name.endsWith('.tsx') ? 'typescript' : 
                           activeFile?.name.endsWith('.js') || activeFile?.name.endsWith('.jsx') ? 'javascript' :
                           activeFile?.name.endsWith('.py') ? 'python' :
                           activeFile?.name.endsWith('.java') ? 'java' :
                           activeFile?.name.endsWith('.css') ? 'css' :
                           activeFile?.name.endsWith('.html') ? 'html' : 'plaintext',
      // otherFiles: [] // Potentially populate this later
    };

    try {
      const result = await aiCodeCompletionFromContext(input);
      if (result.suggestions && result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        setEditorContent(prev => {
          return prev.substring(0, cursorPosition) + suggestion + prev.substring(cursorPosition);
        });
        toast({ title: "AI Sucesso", description: `Sugestão: ${suggestion}` });
      } else {
        toast({ title: "AI", description: "Nenhuma sugestão encontrada." });
      }
    } catch (error) {
      console.error("AI Erro:", error);
      toast({ variant: "destructive", title: "AI Erro", description: "Falha ao obter autocompletar." });
    }
  };

  const handleDeleteItem = async (itemPath: string) => {
    if (!rootDirectoryHandle) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta." });
      return;
    }

    const itemToDelete = findItemByPathRecursive(files, itemPath);
    if (!itemToDelete) {
      toast({ variant: "destructive", title: "Erro", description: "Item não encontrado para deletar." });
      return;
    }

    if (itemPath === openedDirectoryName || (itemToDelete.handle && itemToDelete.handle === rootDirectoryHandle)) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Não é possível excluir a pasta raiz aberta." });
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja excluir "${itemToDelete.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) {
      toast({ title: "Cancelado", description: "Exclusão cancelada." });
      return;
    }

    const parentPath = getParentPathRecursive(itemPath);
    const parentDirHandle = await getDirectoryHandleByPath(parentPath, rootDirectoryHandle);

    if (!parentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Diretório pai de "${itemPath}" não encontrado.` });
      return;
    }

    try {
      await parentDirHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.type === 'folder' });
      
      toast({ title: "Excluído", description: `"${itemToDelete.name}" foi excluído com sucesso.` });

      if (activeFile) {
        if (activeFile.path === itemPath || (itemToDelete.type === 'folder' && activeFile.path.startsWith(itemPath + '/'))) {
          setActiveFile(null);
          setEditorContent('');
        }
      }
      
      const pathForRefresh = parentDirHandle === rootDirectoryHandle ? null : parentPath;
      await refreshDirectoryInState(pathForRefresh, parentDirHandle);

    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast({ variant: "destructive", title: "Erro ao Excluir", description: `Não foi possível excluir "${itemToDelete.name}". Verifique as permissões ou se o item está em uso.` });
      const pathForRefreshOnError = parentDirHandle === rootDirectoryHandle ? null : parentPath;
      await refreshDirectoryInState(pathForRefreshOnError, parentDirHandle);
    }
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <IdeHeader 
        onOpenPreferences={() => setIsPreferencesOpen(true)} 
        onOpenFolder={handleOpenFolder}
        onSaveFile={handleSaveFile}
        activeFile={activeFile}
      />
      <main className="flex flex-1 overflow-hidden">
        <FileExplorer
          files={files}
          onSelectFile={handleSelectFile}
          selectedFilePath={activeFile?.path || null}
          onCreateFile={(parentPath) => handleCreateItem('file', parentPath)}
          onCreateFolder={(parentPath) => handleCreateItem('folder', parentPath)}
          onRenameItem={handleRenameItem}
          onDeleteItem={handleDeleteItem}
          openedDirectoryName={openedDirectoryName}
          allFiles={files}
        />
        <div className="flex flex-1 flex-col overflow-hidden"> {/* Main content area: Editor + Terminal */}
          <CodeEditor
            content={editorContent}
            onContentChange={handleEditorChange}
            onGenerateFromComment={handleGenerateFromComment}
            onCompleteFromContext={handleCompleteFromContext}
            fileName={activeFile?.name || (files.length === 0 && !openedDirectoryName ? "Nenhum arquivo aberto" : (openedDirectoryName && !activeFile ? openedDirectoryName : "Selecione um arquivo"))}
          />
          <TerminalResizableWrapper initialHeight={180} minHeight={80} maxHeight={400}>
            <IntegratedTerminal
              output={terminalOutput}
              onCommandSubmit={handleCommandSubmit}
            />
          </TerminalResizableWrapper>
        </div>
        <AiChatPanel /> {/* AI Chat Panel */}
      </main>
      <PreferencesDialog isOpen={isPreferencesOpen} onOpenChange={setIsPreferencesOpen} />
    </div>
  );
}
