"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileExplorer } from '@/components/ide/file-explorer';
import { CodeEditor } from '@/components/ide/code-editor';
import { IntegratedTerminal } from '@/components/ide/integrated-terminal';
import { IdeHeader } from '@/components/ide/ide-header';
import { PreferencesDialog } from '@/components/ide/preferences-dialog';
import { TerminalResizableWrapper } from '@/components/ide/terminal-resizable-wrapper';
import { AiChatPanel } from '@/components/ide/ai-chat-panel';
import { FileExplorerResizableWrapper } from '@/components/ide/file-explorer-resizable-wrapper';
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
      
      const options = { mode: 'readwrite' } as const;
      const permissionStatus = await directoryHandle.queryPermission(options);

      if (permissionStatus !== 'granted') {
        const requestedPermissionStatus = await directoryHandle.requestPermission(options);
        if (requestedPermissionStatus !== 'granted') {
           toast({
             variant: "destructive",
             title: "Permissão Negada",
             description: "A IA não poderá modificar ou criar arquivos. As funcionalidades de escrita estão desativadas.",
           });
        }
      }

      setRootDirectoryHandle(directoryHandle);
      const processedFiles = await processDirectory(directoryHandle, directoryHandle.name);
      setFiles(processedFiles);
      setActiveFile(null);
      setEditorContent('');
      setOpenedDirectoryName(directoryHandle.name);
      
      toast({ title: "Pasta Aberta", description: `Folder "${directoryHandle.name}" loaded.` });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Folder selection cancelled by user.");
      } else {
        console.error("Error opening folder:", error);
        toast({ variant: "destructive", title: "Erro ao Abrir Pasta", description: "Could not load folder." });
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
          // Update content in the main files state
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
          console.error("Error reading file:", error);
          toast({ variant: "destructive", title: "Erro ao Ler Arquivo", description: `Could not read ${file.name}.` });
          setEditorContent(`// Error loading ${file.name}`);
        }
      } else {
        setEditorContent(`// Content for ${file.name} (no handle or not a file)\n`);
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
        description: 'No file selected or file cannot be saved.',
      });
      return;
    }

    try {
      const fileHandle = activeFile.handle as FileSystemFileHandle;

      if (typeof (fileHandle as any).requestPermission === 'function') {
        const permission = await (fileHandle as any).requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          toast({ variant: 'destructive', title: 'Permission Denied', description: 'Permission to save file was denied.' });
          return;
        }
      }

      const writable = await fileHandle.createWritable();
      await writable.write(editorContent);
      await writable.close();
      toast({
        title: 'Arquivo Salvo',
        description: `"${activeFile.name}" was saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving file:', error);
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError' || error.name === 'NotFoundError')) {
           toast({
              variant: 'destructive',
              title: 'Permissão ou Erro ao Salvar',
              description: 'Permission denied or file not found. Try again or reopen the folder.',
          });
      } else {
          toast({
              variant: 'destructive',
              title: 'Erro ao Salvar',
              description: `Could not save "${activeFile.name}".`,
          });
      }
    }
  };

  const getDirectoryHandleByPath = useCallback(async (path: string | null, currentRootHandle: FileSystemDirectoryHandle | null): Promise<FileSystemDirectoryHandle | null> => {
    if (!currentRootHandle || !openedDirectoryName) return null;

    if (path === null || path === '' || path === openedDirectoryName) {
      return currentRootHandle;
    }

    let pathSegments: string[];
    if (path.startsWith(openedDirectoryName + '/')) {
        pathSegments = path.substring(openedDirectoryName.length + 1).split('/');
    } else if (path === openedDirectoryName) {
        return currentRootHandle;
    } else {
        console.warn(`getDirectoryHandleByPath received path "${path}" not prefixed with root "${openedDirectoryName}". Assuming relative from root.`);
        pathSegments = path.split('/');
    }

    if (pathSegments.length === 1 && pathSegments[0] === '') pathSegments = [];

    let currentHandle: FileSystemDirectoryHandle | null = currentRootHandle;

    for (const segment of pathSegments) {
        if (!currentHandle || segment === '') continue;
        try {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
        } catch (e) {
             console.warn(`Failed to get handle for "${segment}" in "${path}" directly, trying to find in state...`, e);

             let accumulatedPathForStateSearch = openedDirectoryName;
             const segmentsToCurrentSegment = path.startsWith(openedDirectoryName + '/')
                ? path.substring(openedDirectoryName.length + 1).split('/').slice(0, pathSegments.indexOf(segment) + 1)
                : path.split('/').slice(0, pathSegments.indexOf(segment) + 1);

             if (segmentsToCurrentSegment.length > 0 && segmentsToCurrentSegment.join('') !== '') {
                accumulatedPathForStateSearch += '/' + segmentsToCurrentSegment.join('/');
             }

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
            currentHandle = findInFileOrFolder(files, accumulatedPathForStateSearch) || null;
            if (!currentHandle) {
                console.error(`Could not find directory handle for segment "${segment}" in path "${path}". Accumulated path for state search: ${accumulatedPathForStateSearch}`);
                return null;
            }
        }
    }
    return currentHandle;
  }, [files, openedDirectoryName]);


  const refreshDirectoryInState = async (directoryPathToRefresh: string | null, dirHandleToProcess: FileSystemDirectoryHandle) => {
    const pathForProcessing = directoryPathToRefresh === null ? openedDirectoryName : directoryPathToRefresh;
    if (!pathForProcessing) {
        console.error("refreshDirectoryInState: Cannot refresh, pathForProcessing is undefined (openedDirectoryName might be null).");
        return;
    }

    const newChildren = await processDirectory(dirHandleToProcess, pathForProcessing);

    if (directoryPathToRefresh === null || directoryPathToRefresh === openedDirectoryName) {
      setFiles(newChildren);
    } else {
      setFiles(prevFiles => {
        const updateChildrenRecursive = (items: FileOrFolder[]): FileOrFolder[] => {
          return items.map(item => {
            if (item.path === directoryPathToRefresh && item.type === 'folder') {
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
    targetContainerPath: string | null // null means root of openedDirectoryName
  ): Promise<boolean> => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "No folder open to create items in." });
      return false;
    }

    if (!itemName || itemName.trim() === '' || itemName.includes('/') || itemName.includes('\\')) {
      toast({ title: "Nome Inválido", description: `Name for ${type} is invalid or contains slashes.` });
      return false;
    }

    const parentDirHandleToCreateIn = targetContainerPath === null
      ? rootDirectoryHandle
      : await getDirectoryHandleByPath(targetContainerPath, rootDirectoryHandle);

    if (!parentDirHandleToCreateIn) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory "${targetContainerPath || openedDirectoryName.split('/').pop()}" not found.` });
      return false;
    }

    try {
        if (type === 'file') {
            await parentDirHandleToCreateIn.getFileHandle(itemName);
        } else {
            await parentDirHandleToCreateIn.getDirectoryHandle(itemName);
        }
        const containerDisplayPath = targetContainerPath ? targetContainerPath.substring(targetContainerPath.lastIndexOf('/')+1) : (openedDirectoryName.split('/').pop() || openedDirectoryName);
        toast({ variant: "destructive", title: "Erro ao Criar", description: `An item named "${itemName}" already exists in "${containerDisplayPath}".` });
        return false;
    } catch (e) {
        if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
            console.error("Error checking existence:", e);
            toast({ variant: "destructive", title: "Erro", description: "Failed to check item existence."});
            return false;
        }
    }

    try {
      if (type === 'file') {
        await parentDirHandleToCreateIn.getFileHandle(itemName, { create: true });
      } else {
        await parentDirHandleToCreateIn.getDirectoryHandle(itemName, { create: true });
      }

      const pathToRefresh = targetContainerPath === null ? openedDirectoryName : targetContainerPath;
      await refreshDirectoryInState(pathToRefresh, parentDirHandleToCreateIn);

      const containerDisplayPath = targetContainerPath ? targetContainerPath.substring(targetContainerPath.lastIndexOf('/')+1) : (openedDirectoryName.split('/').pop() || openedDirectoryName);
      toast({ title: `${type === 'file' ? 'Arquivo Criado' : 'Pasta Criada'}`, description: `"${itemName}" was created successfully in "${containerDisplayPath}".` });
      return true;
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
      toast({ variant: "destructive", title: `Erro ao Criar ${type}`, description: `Could not create "${itemName}". Check permissions.` });
      return false;
    }
  };


  const handleCreateItem = async (type: 'file' | 'folder', targetDirectoryPath: string | null) => {
    const itemNameFromPrompt = prompt(`Enter the name for the new ${type}:`);
    if (!itemNameFromPrompt) {
      if (itemNameFromPrompt === '') {
         toast({ title: "Nome Inválido", description: `Name for ${type} cannot be empty.` });
      }
      return;
    }

    const success = await handleCreateFileSystemItemInternal(type, itemNameFromPrompt, targetDirectoryPath);

    if (success && type === 'file' && openedDirectoryName) {
        let newItemFullPath: string;
        if (targetDirectoryPath === null) { // created in root
            newItemFullPath = `${openedDirectoryName}/${itemNameFromPrompt}`;
        } else {
            newItemFullPath = `${targetDirectoryPath}/${itemNameFromPrompt}`;
        }

        setTimeout(async () => {
            const dirToRefreshHandle = targetDirectoryPath === null
                ? rootDirectoryHandle
                : await getDirectoryHandleByPath(targetDirectoryPath, rootDirectoryHandle);

            if (!dirToRefreshHandle) return;

            const stateRefreshPath = targetDirectoryPath === null ? openedDirectoryName : targetDirectoryPath;
            await refreshDirectoryInState(stateRefreshPath, dirToRefreshHandle);

            let fileToSelect: FileOrFolder | null = null;
            // Read files from state directly after timeout and state refresh
            setFiles(currentFiles => {
                fileToSelect = findItemByPathRecursive(currentFiles, newItemFullPath);
                return currentFiles;
            });


            if (fileToSelect) {
                 await handleSelectFile(fileToSelect);
                 setEditorContent('');
            } else {
                 console.warn("Could not auto-select newly created file from explorer action. Path was:", newItemFullPath);
            }
        }, 400);
      }
  };

  const handleRenameItem = async (itemPath: string, newName: string): Promise<boolean> => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "No folder open." });
      return false;
    }

    const itemToRename = findItemByPathRecursive(files, itemPath);
    if (!itemToRename) {
      toast({ variant: "destructive", title: "Erro", description: "Item not found." });
      return false;
    }

    if (itemPath === openedDirectoryName) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Cannot rename the root opened folder." });
      return false;
    }

    if (!newName || newName.trim() === '' || newName === itemToRename.name || newName.includes('/') || newName.includes('\\')) {
      toast({ title: "Nome Inválido", description: "Rename cancelled, name unchanged or invalid." });
      return false;
    }

    const parentItemPath = getParentPath(itemPath);

    const actualParentDirHandle = parentItemPath === null
      ? rootDirectoryHandle
      : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);

    if (!actualParentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory of "${itemPath}" not found.` });
      return false;
    }

    try {
      if (itemToRename.type === 'file') {
        await actualParentDirHandle.getFileHandle(newName);
      } else {
        await actualParentDirHandle.getDirectoryHandle(newName);
      }
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `An item named "${newName}" already exists.` });
      return false;
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
        console.error("Error checking existence for rename:", e);
        toast({ variant: "destructive", title: "Erro", description: "Failed to check existence of new name."});
        return false;
      }
    }

    try {
      if (!itemToRename.handle) {
        toast({ variant: "destructive", title: "Erro", description: "Item handle not found." });
        return false;
      }

      const handleToMove = itemToRename.handle as FileSystemFileHandle | FileSystemDirectoryHandle;
      let moved = false;
      if (typeof (handleToMove as any).move === 'function') {
         try {
            await (handleToMove as any).move(actualParentDirHandle, newName);
            moved = true;
         } catch (moveError) {
            console.warn("Attempted .move() failed:", moveError, "Falling back to state refresh.");
         }
      }

      const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefresh, actualParentDirHandle);

      if (moved) {
        toast({ title: "Renomeado", description: `"${itemToRename.name}" was renamed to "${newName}".` });
      } else {
         toast({ title: "Ação de Renomear", description: `Tentativa de renomear "${itemToRename.name}" para "${newName}". A lista de arquivos foi atualizada; verifique o resultado.` });
      }

      const newFullPath = parentItemPath ? `${parentItemPath}/${newName}` : (openedDirectoryName ? `${openedDirectoryName}/${newName}` : newName);
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
          if (itemToRename.type === 'folder') {
            setEditorContent('');
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
      return true;
    } catch (error) {
      console.error("Error renaming:", error);
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Could not rename "${itemToRename.name}". Check permissions or if the item is in use.` });
      const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
      if (pathToRefreshOnError && actualParentDirHandle) await refreshDirectoryInState(pathToRefreshOnError, actualParentDirHandle);
      return false;
    }
  };

  const handleRenameItemFromExplorer = (itemPath: string) => {
    const itemToRename = findItemByPathRecursive(files, itemPath);
    if (!itemToRename) return;
    const newNameFromPrompt = prompt(`Enter new name for "${itemToRename.name}":`, itemToRename.name);
    if (newNameFromPrompt) {
      handleRenameItem(itemPath, newNameFromPrompt);
    } else if (newNameFromPrompt === '') {
      toast({ title: "Nome Inválido", description: "Rename cancelled, name cannot be empty." });
    }
  };

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
      toast({ variant: "destructive", title: "Erro", description: "No folder open." });
      return;
    }

    const itemToDelete = findItemByPathRecursive(files, itemPath);
    if (!itemToDelete) {
      toast({ variant: "destructive", title: "Erro", description: "Item not found to delete." });
      return;
    }

    if (itemPath === openedDirectoryName) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Cannot delete the root opened folder." });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${itemToDelete.name}"${itemToDelete.type === 'folder' ? ' and all its contents' : ''}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const parentItemPath = getParentPath(itemPath);

    const parentDirHandle = parentItemPath === null
        ? rootDirectoryHandle
        : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


    if (!parentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory of "${itemPath}" not found.` });
      return;
    }

    try {
      await parentDirHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.type === 'folder' });

      toast({ title: "Excluído", description: `"${itemToDelete.name}" was deleted successfully.` });

      if (activeFile) {
        if (activeFile.path === itemPath || (itemToDelete.type === 'folder' && activeFile.path.startsWith(itemPath + '/'))) {
          setActiveFile(null);
          setEditorContent('');
        }
      }

      const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefresh, parentDirHandle);

    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ variant: "destructive", title: "Erro ao Excluir", description: `Could not delete "${itemToDelete.name}". Check permissions or if item is in use.` });
      const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
      if (pathToRefreshOnError && parentDirHandle) await refreshDirectoryInState(pathToRefreshOnError, parentDirHandle);
    }
  };

  const getOrCreateDirectoryHandleByPath = useCallback(async (
    path: string, 
    currentRootHandle: FileSystemDirectoryHandle | null
  ): Promise<FileSystemDirectoryHandle | null> => {
    if (!currentRootHandle || !openedDirectoryName) return null;

    if (!path || path === openedDirectoryName) {
      return currentRootHandle;
    }

    let pathSegments: string[];
    // Normalize path to be relative to the opened directory
    if (path.startsWith(openedDirectoryName + '/')) {
      pathSegments = path.substring(openedDirectoryName.length + 1).split('/');
    } else {
      pathSegments = path.split('/');
    }
    
    pathSegments = pathSegments.filter(p => p); // Remove empty segments from paths like "/src"

    let currentHandle: FileSystemDirectoryHandle = currentRootHandle;

    for (const segment of pathSegments) {
      try {
        currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true });
      } catch (e) {
        console.error(`Failed to get or create directory handle for segment "${segment}" in path "${path}"`, e);
        toast({ variant: "destructive", title: "Error Creating Directory", description: `Could not create path segment: ${segment}`});
        return null;
      }
    }
    return currentHandle;
  }, [openedDirectoryName, toast]);

  const handleFileOperationFromAI = useCallback(async (operation: { filePath: string; content: string }) => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "AI Error", description: "No folder open to perform file operations." });
      return;
    }
  
    const { filePath, content } = operation;
    const normalizedFilePath = filePath.startsWith(openedDirectoryName) 
      ? filePath
      : `${openedDirectoryName}/${filePath.startsWith('/') ? filePath.substring(1) : filePath}`;

    const item = findItemByPathRecursive(files, normalizedFilePath);
  
    if (item) { // File exists, modify it
      if (item.type === 'folder') {
        toast({ variant: "destructive", title: "AI Error", description: `Cannot write to '${normalizedFilePath}' as it is a folder.` });
        return;
      }
  
      const handle = item.handle as FileSystemFileHandle;
      if (!handle) {
        toast({ variant: "destructive", title: "AI Error", description: `File '${normalizedFilePath}' cannot be modified.` });
        return;
      }
  
      try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
  
        setFiles(prevFiles => {
          const updateContentRecursive = (items: FileOrFolder[]): FileOrFolder[] =>
            items.map(i => {
              if (i.id === item.id) return { ...i, content: content };
              if (i.children) return { ...i, children: updateContentRecursive(i.children) };
              return i;
            });
          return updateContentRecursive(prevFiles);
        });
  
        if (activeFile?.path === normalizedFilePath) {
          setEditorContent(content);
        }
        toast({ title: "AI: Arquivo Modificado", description: `O arquivo '${item.name}' foi modificado.` });
      } catch (e) {
        console.error("AI error writing to existing file:", e);
        toast({ variant: "destructive", title: "AI Error", description: `Failed to write to file '${normalizedFilePath}'.` });
      }
    } else { // File does not exist, create it
      const pathRelativeToRoot = normalizedFilePath.substring(openedDirectoryName.length + 1);
      const parentPath = getParentPath(pathRelativeToRoot);
      const fileName = pathRelativeToRoot.substring(pathRelativeToRoot.lastIndexOf('/') + 1);
  
      if (!fileName) {
        toast({ variant: "destructive", title: "AI Error", description: `Invalid file path for creation: '${normalizedFilePath}'.` });
        return;
      }
  
      const parentDirHandle = parentPath ? await getOrCreateDirectoryHandleByPath(parentPath, rootDirectoryHandle) : rootDirectoryHandle;
  
      if (!parentDirHandle) {
        return; // Error toast is shown inside getOrCreateDirectoryHandleByPath
      }
  
      try {
        const newFileHandle = await parentDirHandle.getFileHandle(fileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
  
        toast({ title: "AI: Arquivo Criado", description: `O arquivo '${fileName}' foi criado.` });
  
        const pathToRefresh = parentPath ? `${openedDirectoryName}/${parentPath}` : openedDirectoryName;
        await refreshDirectoryInState(pathToRefresh, parentDirHandle);
      } catch (e) {
        console.error("AI error creating new file:", e);
        toast({ variant: "destructive", title: "AI Error", description: `Failed to create and write to file '${normalizedFilePath}'.` });
      }
    }
  }, [files, rootDirectoryHandle, openedDirectoryName, getOrCreateDirectoryHandleByPath, activeFile, toast, refreshDirectoryInState]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <IdeHeader
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenFolder={handleOpenFolder}
        onSaveFile={handleSaveFile}
        activeFile={activeFile}
      />
      <main className="flex flex-1 overflow-hidden">
        <FileExplorerResizableWrapper>
          <FileExplorer
            files={files}
            onSelectFile={handleSelectFile}
            selectedFilePath={activeFile?.path || null}
            onCreateFile={(parentPath) => handleCreateItem('file', parentPath)}
            onCreateFolder={(parentPath) => handleCreateItem('folder', parentPath)}
            onRenameItem={handleRenameItemFromExplorer}
            onDeleteItem={handleDeleteItem}
            openedDirectoryName={openedDirectoryName}
            allFiles={files}
          />
        </FileExplorerResizableWrapper>
        <div className="flex flex-1 flex-col overflow-hidden">
          <CodeEditor
            content={editorContent}
            onContentChange={handleEditorChange}
            onGenerateFromComment={handleGenerateFromComment}
            onCompleteFromContext={handleCompleteFromContext}
            fileName={activeFile?.name || (files.length === 0 && !openedDirectoryName ? "No file open" : (openedDirectoryName && !activeFile ? (openedDirectoryName.split('/').pop() || openedDirectoryName) : "Select a file"))}
          />
          <TerminalResizableWrapper initialHeight={220} minHeight={80} maxHeight={500}>
            <IntegratedTerminal 
              files={files}
              openedDirectoryName={openedDirectoryName}
            />
          </TerminalResizableWrapper>
        </div>
        <AiChatPanel 
          projectFiles={files} 
          onFileOperation={handleFileOperationFromAI} 
          selectedFilePath={activeFile?.path ?? null}
        />
      </main>
      <PreferencesDialog isOpen={isPreferencesOpen} onOpenChange={setIsPreferencesOpen} />
    </div>
  );
}
