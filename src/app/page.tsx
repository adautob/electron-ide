
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
const getParentPath = (itemPath: string | null): string | null => {
  if (itemPath === null || !itemPath.includes('/')) {
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

  const [terminalCwdPath, setTerminalCwdPath] = useState<string | null>(null); // null for root of opened folder

  const getTerminalPromptDisplay = useCallback(() => {
    if (!openedDirectoryName) return '$';
    
    if (terminalCwdPath === null) { 
      return `${openedDirectoryName} $`;
    }
    // terminalCwdPath is the full path. We want the last segment for display.
    const lastSegment = terminalCwdPath.substring(terminalCwdPath.lastIndexOf('/') + 1);
    return `${lastSegment || openedDirectoryName} $`; // Fallback to openedDirectoryName if lastSegment is empty (should not happen with valid paths)
  }, [openedDirectoryName, terminalCwdPath]);


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
      setTerminalCwdPath(null); // Reset terminal CWD to root of new folder
      setTerminalOutput([`Pasta "${directoryHandle.name}" aberta. ${getTerminalPromptDisplay()}`]);
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
            const updateContentRecursive = (items: FileOrFolder[]): FileOrFolder[] => 
              items.map(item => {
                if (item.id === file.id) return { ...item, content: text };
                if (item.children) return { ...item, children: updateContentRecursive(item.children) };
                return item;
              });
            return updateContentRecursive(prevFiles);
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
        const updateFileContentRecursive = (items: FileOrFolder[]): FileOrFolder[] => {
          return items.map(item => {
            if (item.id === activeFile.id) {
              return { ...item, content };
            }
            if (item.children) {
              return { ...item, children: updateFileContentRecursive(item.children) };
            }
            return item;
          });
        };
        return updateFileContentRecursive(prevFiles);
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
      
      if (typeof (fileHandle as any).requestPermission === 'function') { // Check if requestPermission exists
        const permission = await (fileHandle as any).requestPermission({ mode: 'readwrite' });
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
    if (path === null || path === '' || path === openedDirectoryName) { // Path is effectively the root directory opened
        // If openedDirectoryName itself is the path, currentRootHandle is what we want.
        // If path is null, it means the root.
      return currentRootHandle;
    }

    // Path is relative to the content of the opened directory, not including openedDirectoryName itself as the first segment.
    // Example: openedDirectoryName = "MyProject". Path to a subfolder "src" would be "MyProject/src".
    // We need to get "src" from currentRootHandle ("MyProject").

    let pathSegments: string[];
    if (path.startsWith(currentRootHandle.name + '/')) {
        pathSegments = path.substring(currentRootHandle.name.length + 1).split('/');
    } else if (path === currentRootHandle.name) { // Path is exactly the opened directory
        return currentRootHandle;
    }
     else {
        // This case should ideally not happen if 'path' is always relative to the root dir content or the root dir itself.
        // For safety, let's assume 'path' could be a direct sub-path if it doesn't include openedDirectoryName
        pathSegments = path.split('/');
        // console.warn(`Path "${path}" does not start with openedDirectoryName "${currentRootHandle.name}". Assuming direct subpath.`);
    }
    
    if (pathSegments.length === 1 && pathSegments[0] === '') pathSegments = [];


    let currentHandle: FileSystemDirectoryHandle | null = currentRootHandle;
    
    for (const segment of pathSegments) {
        if (!currentHandle || segment === '') continue; // Skip empty segments that might arise from splitting
        try {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
        } catch (e) {
             console.warn(`Falha ao obter handle para "${segment}" em "${path}" diretamente, tentando encontrar no estado...`, e);
             
             let accumulatedPath = openedDirectoryName || '';
             const segmentsToCurrent = pathSegments.slice(0, pathSegments.indexOf(segment) + 1);

             if (accumulatedPath) accumulatedPath += '/' + segmentsToCurrent.join('/');
             else accumulatedPath = segmentsToCurrent.join('/');


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
                console.error(`Não foi possível encontrar handle de diretório para o segmento "${segment}" em "${path}" mesmo no estado. AccPath: ${accumulatedPath}`);
                return null;
            }
        }
    }
    return currentHandle;
  }, [files, openedDirectoryName]);


  const refreshDirectoryInState = async (directoryPath: string | null, dirHandle: FileSystemDirectoryHandle) => {
    // directoryPath is the full path of the directory to refresh.
    // currentPath for processDirectory needs to be the path from where processDirectory starts scanning.
    // If directoryPath is 'MyProject/src', and dirHandle is for 'src', then currentPath for processDirectory should be 'MyProject/src'.
    const newChildren = await processDirectory(dirHandle, directoryPath || (openedDirectoryName || ''));

    if (directoryPath === null || directoryPath === openedDirectoryName) { // Refreshing the root
      setFiles(newChildren);
    } else { 
      setFiles(prevFiles => {
        const updateChildrenRecursive = (items: FileOrFolder[]): FileOrFolder[] => {
          return items.map(item => {
            if (item.path === directoryPath && item.type === 'folder') {
              return { ...item, children: newChildren };
            }
            if (item.children) {
              return { ...item, children: updateChildrenRecursive(item.children) };
            }
            return item;
          });
        };
        return updateChildrenRecursive(prevFiles);
      });
    }
  };
  
  const handleCreateFileSystemItemInternal = async (
    type: 'file' | 'folder',
    itemName: string,
    targetContainerPath: string | null // Full path of the container directory, or null for root of opened folder
  ): Promise<boolean> => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta para criar itens." });
      return false;
    }

    if (!itemName || itemName.trim() === '' || itemName.includes('/') || itemName.includes('\\')) {
      toast({ title: "Nome Inválido", description: `Nome para ${type} inválido ou contém barras.` });
      return false;
    }
    
    // targetContainerPath refers to a path *within* the openedDirectoryName structure
    // e.g. if openedDir is "MyProject", targetContainerPath could be "MyProject/src" or "MyProject" (for root items) or null (for root items)
    // getDirectoryHandleByPath expects the full path of the directory it should return a handle for.
    // If targetContainerPath is null, we want to create in rootDirectoryHandle.
    // If targetContainerPath is "MyProject/src", we want the handle for "src".
    const parentDirHandleToCreateIn = targetContainerPath === null
      ? rootDirectoryHandle
      : await getDirectoryHandleByPath(targetContainerPath, rootDirectoryHandle);

    if (!parentDirHandleToCreateIn) {
      toast({ variant: "destructive", title: "Erro", description: `Diretório pai "${targetContainerPath || openedDirectoryName}" não encontrado.` });
      return false;
    }
    
    try {
        if (type === 'file') {
            await parentDirHandleToCreateIn.getFileHandle(itemName);
        } else {
            await parentDirHandleToCreateIn.getDirectoryHandle(itemName);
        }
        toast({ variant: "destructive", title: "Erro ao Criar", description: `Um item chamado "${itemName}" já existe em "${targetContainerPath || openedDirectoryName}".` });
        return false;
    } catch (e) {
        if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
            console.error("Erro ao verificar existência:", e);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao verificar existência do item."});
            return false;
        }
    }

    try {
      if (type === 'file') {
        await parentDirHandleToCreateIn.getFileHandle(itemName, { create: true });
      } else {
        await parentDirHandleToCreateIn.getDirectoryHandle(itemName, { create: true });
      }
      
      // Path for refresh is the path of the directory *whose contents changed*.
      // If targetContainerPath is null, means root, so refresh root (itself).
      // rootDirectoryHandle.name is the name of the folder, e.g., "MyProject"
      // refreshDirectoryInState needs the full path of the directory to refresh.
      const refreshPath = targetContainerPath === null ? openedDirectoryName : targetContainerPath;
      await refreshDirectoryInState(refreshPath, parentDirHandleToCreateIn);
      
      toast({ title: `${type === 'file' ? 'Arquivo Criado' : 'Pasta Criada'}`, description: `"${itemName}" foi criado com sucesso em "${targetContainerPath || openedDirectoryName}".` });
      return true;
    } catch (error) {
      console.error(`Erro ao criar ${type}:`, error);
      toast({ variant: "destructive", title: `Erro ao Criar ${type}`, description: `Não foi possível criar "${itemName}". Verifique as permissões.` });
      return false;
    }
  };


  const handleCreateItem = async (type: 'file' | 'folder', targetDirectoryPath: string | null) => {
    const itemNameFromPrompt = prompt(`Digite o nome para ${type === 'file' ? 'o novo arquivo' : 'a nova pasta'}:`);
    if (!itemNameFromPrompt) { // User cancelled or entered empty
      if (itemNameFromPrompt === '') { // Specifically empty
         toast({ title: "Nome Inválido", description: `Nome para ${type} não pode ser vazio.` });
      } else { // Cancelled (null)
         toast({ title: "Cancelado", description: `Criação de ${type} cancelada.` });
      }
      return;
    }

    const success = await handleCreateFileSystemItemInternal(type, itemNameFromPrompt, targetDirectoryPath);

    if (success && type === 'file') {
        const newItemFullPath = targetDirectoryPath 
            ? `${targetDirectoryPath}/${itemNameFromPrompt}` 
            : `${openedDirectoryName}/${itemNameFromPrompt}`; // Assuming targetDirectoryPath is relative or null for root
        
        // This part for auto-selecting/opening is specific to FileExplorer interaction
        setTimeout(async () => {
            const dirToRefreshHandle = targetDirectoryPath === null ? rootDirectoryHandle : await getDirectoryHandleByPath(targetDirectoryPath, rootDirectoryHandle);
            if (!dirToRefreshHandle) return;
            
            // The path passed to refreshDirectoryInState should be the full path of the directory to refresh
            const refreshPath = targetDirectoryPath === null ? openedDirectoryName : targetDirectoryPath;
            await refreshDirectoryInState(refreshPath, dirToRefreshHandle);

            let fileToSelect: FileOrFolder | null = null;
            setFiles(currentFiles => {
                const findNewlyCreatedFileRecursive = (items: FileOrFolder[], path: string): FileOrFolder | null => {
                  for (const item of items) {
                    if (item.path === path && item.type === 'file') return item;
                    if (item.children) {
                      const found = findNewlyCreatedFileRecursive(item.children, path);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                // The `path` property in FileOrFolder is already the full path from the perspective of `processDirectory`
                // If `targetDirectoryPath` is null, the item is in the root, its path is `itemNameFromPrompt`
                // If `targetDirectoryPath` is "MyProject/src", its path is "MyProject/src/itemNameFromPrompt"
                // The `id` and `path` in `FileOrFolder` are generated by `processDirectory`.
                // `processDirectory` uses `currentPath` which is `targetDirectoryPath` when refreshing.
                // So the new item's path will be `targetDirectoryPath + '/' + itemNameFromPrompt` (if targetDirectoryPath)
                // or just `itemNameFromPrompt` (if targetDirectoryPath is null, meaning root).
                // This needs to align with how `FileOrFolder.path` is constructed.
                // `processDirectory` currentPath argument is the *prefix* for paths it generates.
                // If we refreshed `openedDirectoryName` (root), then `currentPath` for `processDirectory` was `openedDirectoryName`.
                // A new file `foo.txt` in root would have path `openedDirectoryName/foo.txt`.
                // If we refreshed `openedDirectoryName/src`, currentPath was `openedDirectoryName/src`.
                // A new file `bar.txt` in `src` would have path `openedDirectoryName/src/bar.txt`.

                let searchPath = itemNameFromPrompt;
                if (targetDirectoryPath) { // Created in a subfolder
                    searchPath = `${targetDirectoryPath}/${itemNameFromPrompt}`;
                } else if (openedDirectoryName) { // Created in root of opened folder
                    searchPath = `${openedDirectoryName}/${itemNameFromPrompt}`;
                }
                // If openedDirectoryName is null, this shouldn't be reached (no rootDirectoryHandle)

                fileToSelect = findItemByPathRecursive(currentFiles, searchPath);
                
                // Try to fetch handle if missing (it should have been set by processDirectory)
                if (fileToSelect && !fileToSelect.handle && fileToSelect.handle?.kind !== 'file' && dirToRefreshHandle) {
                    (async () => {
                        try {
                           fileToSelect!.handle = await dirToRefreshHandle.getFileHandle(itemNameFromPrompt);
                        } catch(e) { console.error("Failed to get handle for newly created file (explorer)", e);}
                    })();
                }
                return currentFiles; 
            });

            if (fileToSelect) {
                 await handleSelectFile(fileToSelect);
                 setEditorContent(''); 
            } else {
                 console.warn("Could not auto-select newly created file from explorer action.");
            }
        }, 400); // Timeout for state updates and FS operations to settle
      }
  };

  const handleRenameItem = async (itemPath: string) => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta." });
      return;
    }
    
    const itemToRename = findItemByPathRecursive(files, itemPath);
    if (!itemToRename) {
      toast({ variant: "destructive", title: "Erro", description: "Item não encontrado." });
      return;
    }

    if (itemPath === openedDirectoryName) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Não é possível renomear a pasta raiz aberta." });
      return;
    }

    const newName = prompt(`Digite o novo nome para "${itemToRename.name}":`, itemToRename.name);
    if (!newName || newName.trim() === '' || newName === itemToRename.name || newName.includes('/') || newName.includes('\\')) {
      if (newName !== null) { // Not cancelled
        toast({ title: "Nome Inválido", description: "Renomeação cancelada, nome inalterado ou inválido." });
      } else {
        toast({ title: "Cancelado", description: "Renomeação cancelada." });
      }
      return;
    }

    const parentItemPath = getParentPath(itemPath); 
    // parentItemPath is the full path of the parent dir, e.g. "MyProject/src" or "MyProject" or null (if itemPath is "MyProject/file.txt", parentItemPath is "MyProject")
    // getDirectoryHandleByPath needs the full path of the directory it should return.
    // If itemPath = "MyProject/file.txt", parentItemPath = "MyProject". getDirectoryHandleByPath("MyProject", rootDirHandle)
    // If itemPath = "MyProject/src/file.txt", parentItemPath = "MyProject/src". getDirectoryHandleByPath("MyProject/src", rootDirHandle)
    // If item is in root, parentItemPath is openedDirectoryName.
    
    const actualParentDirHandle = parentItemPath === null 
      ? rootDirectoryHandle 
      : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


    if (!actualParentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Diretório pai de "${itemPath}" não encontrado.` });
      return;
    }

    try {
      if (itemToRename.type === 'file') {
        await actualParentDirHandle.getFileHandle(newName);
      } else {
        await actualParentDirHandle.getDirectoryHandle(newName);
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
      
      const handleToMove = itemToRename.handle as FileSystemFileHandle | FileSystemDirectoryHandle; // Type assertion
      if (typeof (handleToMove as any).move === 'function') {
         await (handleToMove as any).move(actualParentDirHandle, newName);
      } else {
        // Fallback for browsers not supporting move, or specific handles. This might be complex.
        // For simplicity, we'll rely on move being available for now or show an error.
        console.error("FileSystemHandle.move() is not supported for this item or browser.");
        toast({
          variant: "destructive",
          title: "Operação Não Suportada",
          description: "A renomeação pode não ser totalmente suportada pelo seu navegador. Tente recarregar a pasta.",
        });
        // Attempt to refresh anyway, in case a manual move was done or for partial support
        await refreshDirectoryInState(parentItemPath || openedDirectoryName, actualParentDirHandle);
        return;
      }
      
      await refreshDirectoryInState(parentItemPath || openedDirectoryName, actualParentDirHandle);

      toast({ title: "Renomeado", description: `"${itemToRename.name}" foi renomeado para "${newName}".` });

      const newFullPath = parentItemPath ? `${parentItemPath}/${newName}` : `${openedDirectoryName}/${newName}`;
      if (activeFile) {
        if (activeFile.path === itemPath) { 
          let newHandle: FileSystemFileHandle | FileSystemDirectoryHandle | undefined;
          try {
            if (itemToRename.type === 'file') {
              newHandle = await actualParentDirHandle.getFileHandle(newName);
            } else {
              newHandle = await actualParentDirHandle.getDirectoryHandle(newName);
            }
          } catch (err) {
            console.error("Error fetching handle for renamed item:", err);
          }
          setActiveFile(prev => ({
            ...(prev!),
            name: newName,
            path: newFullPath,
            id: newFullPath,
            handle: newHandle || prev!.handle, 
          }));
          if (itemToRename.type === 'file' && editorContent && newHandle?.kind === 'file') {
            // Content remains, handle is updated
          } else if (itemToRename.type === 'folder') {
            setEditorContent(''); // Clear editor if a folder was renamed and active
          }

        } else if (itemToRename.type === 'folder' && activeFile.path.startsWith(itemPath + '/')) { 
            const newActiveFilePath = activeFile.path.replace(itemPath, newFullPath);
            setActiveFile(prev => ({
                ...(prev!),
                path: newActiveFilePath,
                id: newActiveFilePath,
            }));
        }
      }

    } catch (error) {
      console.error("Erro ao renomear:", error);
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Não foi possível renomear "${itemToRename.name}". Verifique as permissões ou se o item está em uso.` });
      await refreshDirectoryInState(parentItemPath || openedDirectoryName, actualParentDirHandle);
    }
  };

  const handleCommandSubmit = useCallback(async (command: string) => {
    if (!command.trim()) return;

    const currentPrompt = getTerminalPromptDisplay();
    setTerminalOutput(prev => [...prev, `${currentPrompt} ${command}`]);
    
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    let newOutputLines: string[] = [];

    if (!openedDirectoryName && cmd !== 'clear') {
        newOutputLines.push('Nenhuma pasta aberta. Use o botão "Abrir Pasta" no cabeçalho.');
        setTerminalOutput(prev => [...prev, ...newOutputLines]);
        return;
    }

    switch (cmd) {
      case 'ls': {
        // terminalCwdPath is the full path of the CWD, e.g. "MyProject/src" or "MyProject" or null for root
        const dirToListPath = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
        let itemsToList: FileOrFolder[] = [];

        if (dirToListPath === openedDirectoryName) { // Root of opened folder
            itemsToList = files;
        } else {
            const cwdItem = findItemByPathRecursive(files, dirToListPath!); // dirToListPath won't be null here
            if (cwdItem && cwdItem.type === 'folder' && cwdItem.children) {
                itemsToList = cwdItem.children;
            } else {
                newOutputLines.push(`ls: não foi possível acessar '${dirToListPath}': Diretório não encontrado ou não é uma pasta`);
                break;
            }
        }
        if (itemsToList.length === 0) {
          newOutputLines.push('(vazio)');
        } else {
          newOutputLines.push(...itemsToList.map(item => `${item.name}${item.type === 'folder' ? '/' : ''}`));
        }
        break;
      }
      case 'cd': {
        if (args.length === 0 || args[0] === '~' || args[0] === '/') {
          setTerminalCwdPath(null); 
          newOutputLines.push(`Navegando para: ${openedDirectoryName || '~'}`);
          break;
        }
        const targetDirName = args[0];
        if (targetDirName === '..') {
          if (terminalCwdPath === null) {
            newOutputLines.push('Já está no diretório raiz da pasta aberta.');
          } else {
            const parent = getParentPath(terminalCwdPath); // This will be "MyProject" if CWD was "MyProject/src"
            if (parent === openedDirectoryName || parent === null) { // Navigating up to the root
                setTerminalCwdPath(null);
                newOutputLines.push(`Navegando para: ${openedDirectoryName || '~'}`);
            } else {
                setTerminalCwdPath(parent);
                newOutputLines.push(`Navegando para: ${parent ? parent.substring(parent.lastIndexOf('/') + 1) : (openedDirectoryName || '~')}`);
            }
          }
        } else {
          const baseDirForSearch = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
          const currentDirItem = findItemByPathRecursive(files, baseDirForSearch!);
          const currentDirChildren = currentDirItem?.children || (terminalCwdPath === null ? files : []);

          const targetItem = currentDirChildren.find(item => item.name === targetDirName && item.type === 'folder');
          if (targetItem) {
            setTerminalCwdPath(targetItem.path); // targetItem.path is the full path
            newOutputLines.push(`Navegando para: ${targetItem.name}`);
          } else {
            newOutputLines.push(`cd: ${targetDirName}: Diretório não encontrado em '${baseDirForSearch || openedDirectoryName}'.`);
          }
        }
        break;
      }
      case 'mkdir': {
        if (args.length === 0) {
          newOutputLines.push('mkdir: operando faltando');
          newOutputLines.push('Tente: mkdir <nome_do_diretório>');
          break;
        }
        const dirName = args[0];
        // targetContainerPath for create is current terminalCwdPath, or openedDirectoryName if terminalCwdPath is null (root)
        const containerPath = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
        const success = await handleCreateFileSystemItemInternal('folder', dirName, containerPath);
        if (success) {
          // Message is handled by toast
        }
        break;
      }
      case 'touch': {
        if (args.length === 0) {
          newOutputLines.push('touch: operando faltando');
          newOutputLines.push('Tente: touch <nome_do_arquivo>');
          break;
        }
        const fileName = args[0];
        const containerPath = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
        const success = await handleCreateFileSystemItemInternal('file', fileName, containerPath);
        if (success) {
          // Message is handled by toast
        }
        break;
      }
      case 'clear':
        setTerminalOutput([`Terminal limpo. ${getTerminalPromptDisplay()}`]); // Use current prompt
        return; 
      default:
        newOutputLines.push(`Comando não encontrado: ${cmd}`);
    }
    
    setTimeout(() => {
        if (newOutputLines.length > 0) {
            setTerminalOutput(prev => [...prev, ...newOutputLines]);
        }
    }, 100);

  }, [files, openedDirectoryName, terminalCwdPath, getTerminalPromptDisplay, toast, getDirectoryHandleByPath, refreshDirectoryInState, handleSelectFile, rootDirectoryHandle, handleCreateFileSystemItemInternal]);


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
    
    const input: AICodeCompletionFromContextInput = {
      codeSnippet,
      cursorPosition,
      programmingLanguage: activeFile?.name.endsWith('.ts') || activeFile?.name.endsWith('.tsx') ? 'typescript' : 
                           activeFile?.name.endsWith('.js') || activeFile?.name.endsWith('.jsx') ? 'javascript' :
                           activeFile?.name.endsWith('.py') ? 'python' :
                           activeFile?.name.endsWith('.java') ? 'java' :
                           activeFile?.name.endsWith('.css') ? 'css' :
                           activeFile?.name.endsWith('.html') ? 'html' : 'plaintext',
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
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma pasta aberta." });
      return;
    }

    const itemToDelete = findItemByPathRecursive(files, itemPath);
    if (!itemToDelete) {
      toast({ variant: "destructive", title: "Erro", description: "Item não encontrado para deletar." });
      return;
    }

    if (itemPath === openedDirectoryName) { // Cannot delete the root opened folder itself
      toast({ variant: "destructive", title: "Não Permitido", description: "Não é possível excluir a pasta raiz aberta." });
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja excluir "${itemToDelete.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) {
      toast({ title: "Cancelado", description: "Exclusão cancelada." });
      return;
    }

    const parentItemPath = getParentPath(itemPath);
    // If parentItemPath is null, it means itemToDelete is directly under root, so its parent is rootDirectoryHandle
    const parentDirHandle = parentItemPath === null 
        ? rootDirectoryHandle 
        : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


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
      
      const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefresh, parentDirHandle);

    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast({ variant: "destructive", title: "Erro ao Excluir", description: `Não foi possível excluir "${itemToDelete.name}". Verifique as permissões ou se o item está em uso.` });
      const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefreshOnError, parentDirHandle);
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
        <div className="flex flex-1 flex-col overflow-hidden">
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
              currentPromptGetter={getTerminalPromptDisplay}
            />
          </TerminalResizableWrapper>
        </div>
        <AiChatPanel projectFiles={files} />
      </main>
      <PreferencesDialog isOpen={isPreferencesOpen} onOpenChange={setIsPreferencesOpen} />
    </div>
  );
}

