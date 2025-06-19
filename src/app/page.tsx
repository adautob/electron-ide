
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
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to Electron IDE Terminal! Type "help" for available commands.']);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [openedDirectoryName, setOpenedDirectoryName] = useState<string | null>(null);
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const { toast } = useToast();

  const [terminalCwdPath, setTerminalCwdPath] = useState<string | null>(null); // null for root of opened folder

  const getTerminalPromptDisplay = useCallback(() => {
    if (!openedDirectoryName) return '$';
    
    const basePromptName = openedDirectoryName.split('/').pop() || openedDirectoryName;

    if (terminalCwdPath === null) { 
      return `${basePromptName} $`;
    }
    
    const relativeCwdPath = terminalCwdPath.startsWith(openedDirectoryName + '/') 
      ? terminalCwdPath.substring(openedDirectoryName.length + 1) 
      : (terminalCwdPath === openedDirectoryName ? '' : terminalCwdPath);

    const displayPath = relativeCwdPath ? `${basePromptName}/${relativeCwdPath}` : basePromptName;
    const lastSegment = displayPath.split('/').pop() || basePromptName;
    
    return `${lastSegment} $`;
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
      // Use directoryHandle.name as the base for all paths in processDirectory
      const processedFiles = await processDirectory(directoryHandle, directoryHandle.name);
      setFiles(processedFiles);
      setActiveFile(null);
      setEditorContent('');
      setOpenedDirectoryName(directoryHandle.name); // Store only the name of the root opened folder
      setTerminalCwdPath(null); 
      setTerminalOutput([`Folder "${directoryHandle.name}" opened. Type "help" for available commands.`]);
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
      
      // Request permission (needed for some browsers/contexts after changes)
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

    // If path is null, empty, or same as openedDirectoryName, it's the root.
    if (path === null || path === '' || path === openedDirectoryName) {
      return currentRootHandle;
    }

    let pathSegments: string[];
    // Normalize path: remove root directory name prefix if present
    if (path.startsWith(openedDirectoryName + '/')) {
        pathSegments = path.substring(openedDirectoryName.length + 1).split('/');
    } else if (path === openedDirectoryName) { 
        return currentRootHandle; // Already handled, but good for clarity
    } else {
        // This case should ideally not happen if paths are consistently prefixed
        // but as a fallback, treat it as relative from root.
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
             // Fallback to finding from state if direct getDirectoryHandle fails (e.g., after rename not fully propagated)
             console.warn(`Failed to get handle for "${segment}" in "${path}" directly, trying to find in state...`, e);
             
             // Reconstruct the full path up to the current segment for searching in 'files' state
             let accumulatedPathForStateSearch = openedDirectoryName;
             const segmentsToCurrentSegment = path.startsWith(openedDirectoryName + '/') 
                ? path.substring(openedDirectoryName.length + 1).split('/').slice(0, pathSegments.indexOf(segment) + 1)
                : path.split('/').slice(0, pathSegments.indexOf(segment) + 1);

             if (segmentsToCurrentSegment.length > 0) {
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
    // The path used for processDirectory should be the actual path of dirHandleToProcess
    // If directoryPathToRefresh is null, it means we are refreshing the root, so use openedDirectoryName.
    // Otherwise, directoryPathToRefresh is the path of the directory itself.
    const pathForProcessing = directoryPathToRefresh === null ? openedDirectoryName : directoryPathToRefresh;
    if (!pathForProcessing) {
        console.error("refreshDirectoryInState: Cannot refresh, pathForProcessing is undefined (openedDirectoryName might be null).");
        return;
    }

    const newChildren = await processDirectory(dirHandleToProcess, pathForProcessing);

    if (directoryPathToRefresh === null || directoryPathToRefresh === openedDirectoryName) { 
      // Refreshing the root directory's direct children
      setFiles(newChildren);
    } else { 
      // Refreshing a subdirectory
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
    
    // targetContainerPath is the full path to the container directory (e.g., "myProject/src")
    // or null if the container is the root opened directory.
    const parentDirHandleToCreateIn = targetContainerPath === null
      ? rootDirectoryHandle
      : await getDirectoryHandleByPath(targetContainerPath, rootDirectoryHandle);

    if (!parentDirHandleToCreateIn) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory "${targetContainerPath || openedDirectoryName}" not found.` });
      return false;
    }
    
    // Check for existing item
    try {
        if (type === 'file') {
            await parentDirHandleToCreateIn.getFileHandle(itemName);
        } else {
            await parentDirHandleToCreateIn.getDirectoryHandle(itemName);
        }
        // If no error, item exists
        const containerDisplayPath = targetContainerPath ? targetContainerPath.substring(targetContainerPath.lastIndexOf('/')+1) : openedDirectoryName;
        toast({ variant: "destructive", title: "Erro ao Criar", description: `An item named "${itemName}" already exists in "${containerDisplayPath}".` });
        return false;
    } catch (e) {
        // Expect NotFoundError if item doesn't exist, otherwise it's a real error
        if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
            console.error("Error checking existence:", e);
            toast({ variant: "destructive", title: "Erro", description: "Failed to check item existence."});
            return false;
        }
        // NotFoundError means we can proceed with creation
    }

    try {
      if (type === 'file') {
        await parentDirHandleToCreateIn.getFileHandle(itemName, { create: true });
      } else {
        await parentDirHandleToCreateIn.getDirectoryHandle(itemName, { create: true });
      }
      
      // The path to refresh is the container where the item was created.
      // If targetContainerPath is null, it means the root, so use openedDirectoryName for refresh.
      const pathToRefresh = targetContainerPath === null ? openedDirectoryName : targetContainerPath;
      await refreshDirectoryInState(pathToRefresh, parentDirHandleToCreateIn);
      
      const containerDisplayPath = targetContainerPath ? targetContainerPath.substring(targetContainerPath.lastIndexOf('/')+1) : openedDirectoryName;
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
      } else { 
         // User cancelled or entered nothing
         // toast({ title: "Cancelado", description: `Creation of ${type} cancelled.` });
      }
      return;
    }

    const success = await handleCreateFileSystemItemInternal(type, itemNameFromPrompt, targetDirectoryPath);

    if (success && type === 'file' && openedDirectoryName) {
        // Construct the full path of the newly created file
        let newItemFullPath: string;
        if (targetDirectoryPath === null) { // Created in the root of the opened directory
            newItemFullPath = `${openedDirectoryName}/${itemNameFromPrompt}`;
        } else { // Created in a subdirectory
            newItemFullPath = `${targetDirectoryPath}/${itemNameFromPrompt}`;
        }
        
        // Small delay to ensure file system and state might be more consistent
        setTimeout(async () => {
            // Re-fetch the parent handle to ensure it's fresh
            const dirToRefreshHandle = targetDirectoryPath === null 
                ? rootDirectoryHandle 
                : await getDirectoryHandleByPath(targetDirectoryPath, rootDirectoryHandle);

            if (!dirToRefreshHandle) return;
            
            // Path to refresh in state is the container path
            const stateRefreshPath = targetDirectoryPath === null ? openedDirectoryName : targetDirectoryPath;
            await refreshDirectoryInState(stateRefreshPath, dirToRefreshHandle);

            // Find the newly created file in the *updated* files state to select it
            // Need to use a functional update for setFiles if findItemByPathRecursive relies on its result
            let fileToSelect: FileOrFolder | null = null;
            setFiles(currentFiles => { // Use functional update to ensure we are working with the latest state
                fileToSelect = findItemByPathRecursive(currentFiles, newItemFullPath);
                return currentFiles; // Return currentFiles as findItemByPathRecursive doesn't modify it
            });

            if (fileToSelect) {
                 await handleSelectFile(fileToSelect); // This will load content
                 setEditorContent(''); // Explicitly set to empty for a new file
            } else {
                 console.warn("Could not auto-select newly created file from explorer action. Path was:", newItemFullPath);
            }
        }, 400); 
      }
  };

  const handleRenameItem = async (itemPath: string) => {
    if (!rootDirectoryHandle || !openedDirectoryName) {
      toast({ variant: "destructive", title: "Erro", description: "No folder open." });
      return;
    }
    
    const itemToRename = findItemByPathRecursive(files, itemPath);
    if (!itemToRename) {
      toast({ variant: "destructive", title: "Erro", description: "Item not found." });
      return;
    }

    if (itemPath === openedDirectoryName) { // Prevent renaming the root folder itself via UI
      toast({ variant: "destructive", title: "Não Permitido", description: "Cannot rename the root opened folder." });
      return;
    }

    const newName = prompt(`Enter new name for "${itemToRename.name}":`, itemToRename.name);
    if (!newName || newName.trim() === '' || newName === itemToRename.name || newName.includes('/') || newName.includes('\\')) {
      if (newName !== null) { // Only toast if not cancelled
        toast({ title: "Nome Inválido", description: "Rename cancelled, name unchanged or invalid." });
      }
      return;
    }

    // Get the parent path of the item being renamed. This is where the renamed item will reside.
    const parentItemPath = getParentPath(itemPath); // e.g., "myProject/src" or "myProject" or null if itemPath is like "myProject/file.txt"
    
    // Get the handle of the actual parent directory in the file system.
    // If parentItemPath is null, it means the item is directly under openedDirectoryName, so actualParentDirHandle is rootDirectoryHandle.
    // Otherwise, get the handle for parentItemPath.
    const actualParentDirHandle = parentItemPath === null 
      ? rootDirectoryHandle 
      : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


    if (!actualParentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory of "${itemPath}" not found.` });
      return;
    }

    // Check if an item with the new name already exists in the parent directory
    try {
      if (itemToRename.type === 'file') {
        await actualParentDirHandle.getFileHandle(newName);
      } else { // folder
        await actualParentDirHandle.getDirectoryHandle(newName);
      }
      // If successful, an item with the new name exists
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `An item named "${newName}" already exists.` });
      return;
    } catch (e) {
      // We expect NotFoundError if the new name is available.
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
        console.error("Error checking existence for rename:", e);
        toast({ variant: "destructive", title: "Erro", description: "Failed to check existence of new name."});
        return;
      }
      // NotFoundError means we can proceed.
    }
    
    try {
      if (!itemToRename.handle) {
        toast({ variant: "destructive", title: "Erro", description: "Item handle not found." });
        return;
      }
      
      const handleToMove = itemToRename.handle as FileSystemFileHandle | FileSystemDirectoryHandle; 
      let moved = false;
      if (typeof (handleToMove as any).move === 'function') {
         try {
            await (handleToMove as any).move(actualParentDirHandle, newName);
            moved = true;
         } catch (moveError) {
            console.warn("Attempted .move() failed:", moveError);
         }
      }

      // Refresh the parent directory state
      const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefresh, actualParentDirHandle);

      if (moved) {
        toast({ title: "Renomeado (via move)", description: `"${itemToRename.name}" was renamed to "${newName}".` });
      } else {
        toast({ title: "Ação de Renomear", description: `Tentativa de renomear "${itemToRename.name}" para "${newName}". Por favor, verifique o explorador de arquivos. A atualização da lista foi feita.` });
      }


      // Update active file if it was the one renamed or is inside a renamed folder
      const newFullPath = parentItemPath ? `${parentItemPath}/${newName}` : (openedDirectoryName ? `${openedDirectoryName}/${newName}` : newName);
      if (activeFile) {
        if (activeFile.path === itemPath) { // If the active item itself was renamed
          // Try to get the new handle
          let newHandle: FileSystemFileHandle | FileSystemDirectoryHandle | undefined;
          try {
            if (itemToRename.type === 'file') {
              newHandle = await actualParentDirHandle.getFileHandle(newName);
            } else {
              newHandle = await actualParentDirHandle.getDirectoryHandle(newName);
            }
          } catch (err) {
            console.error("Error fetching handle for renamed item:", err);
            // Keep old handle if new one can't be fetched, path will still update
          }
          setActiveFile(prev => ({
            ...(prev!),
            name: newName,
            path: newFullPath,
            id: newFullPath, // Update ID to match new path
            handle: newHandle || prev!.handle, // Use new handle if available
          }));
          if (itemToRename.type === 'folder') {
            setEditorContent(''); // Clear editor if a folder was "active" (though editor shows no content for folders)
          }

        } else if (itemToRename.type === 'folder' && activeFile.path.startsWith(itemPath + '/')) { 
            // If active file was inside the renamed folder
            const newActiveFilePath = activeFile.path.replace(itemPath, newFullPath);
            setActiveFile(prev => ({
                ...(prev!),
                path: newActiveFilePath,
                id: newActiveFilePath, // Update ID
                // The handle for the active file inside a renamed folder might become stale.
                // Re-fetching it is complex here. User might need to re-select.
            }));
        }
      }

    } catch (error) {
      console.error("Error renaming:", error);
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Could not rename "${itemToRename.name}". Check permissions or if the item is in use.` });
      // Refresh parent dir state even on error to try to get consistent state
      const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefreshOnError, actualParentDirHandle);
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

    if (!openedDirectoryName && cmd !== 'clear' && cmd !== 'help') {
        newOutputLines.push('No folder open. Use the "Open Folder" button in the header.');
        setTerminalOutput(prev => [...prev, ...newOutputLines, `${getTerminalPromptDisplay()} `]);
        return;
    }

    switch (cmd) {
      case 'help':
        newOutputLines.push('Available commands:');
        newOutputLines.push('  help             - Show this help message.');
        newOutputLines.push('  ls               - List directory contents.');
        newOutputLines.push('  cd <directory>   - Change current directory.');
        newOutputLines.push('  cd ..            - Go to parent directory.');
        newOutputLines.push('  cd ~ or cd /     - Go to root of opened folder.');
        newOutputLines.push('  mkdir <name>     - Create a new directory in current location.');
        newOutputLines.push('  touch <name>     - Create a new empty file in current location.');
        newOutputLines.push('  rm <file>        - Delete a file.');
        newOutputLines.push('  rm -rf <folder>  - Delete a folder and its contents recursively.');
        newOutputLines.push('  clear            - Clear the terminal screen.');
        break;
      case 'ls': {
        const dirToListPath = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
        let itemsToList: FileOrFolder[] = [];

        if (!dirToListPath) { // Should not happen if openedDirectoryName is set
            newOutputLines.push(`ls: cannot access current directory: Not specified`);
            break;
        }

        if (dirToListPath === openedDirectoryName) { 
            itemsToList = files; // files are the children of openedDirectoryName
        } else {
            const cwdItem = findItemByPathRecursive(files, dirToListPath); 
            if (cwdItem && cwdItem.type === 'folder' && cwdItem.children) {
                itemsToList = cwdItem.children;
            } else {
                newOutputLines.push(`ls: cannot access '${dirToListPath.substring(dirToListPath.lastIndexOf('/') + 1)}': Directory not found or not a folder`);
                break;
            }
        }
        if (itemsToList.length === 0) {
          newOutputLines.push('(empty)');
        } else {
          newOutputLines.push(...itemsToList.map(item => `${item.name}${item.type === 'folder' ? '/' : ''}`));
        }
        break;
      }
      case 'cd': {
        if (!openedDirectoryName) break; 
        if (args.length === 0 || args[0] === '~' || args[0] === '/') {
          setTerminalCwdPath(null); 
          newOutputLines.push(`Navigating to: ${openedDirectoryName.split('/').pop() || '~'}`);
          break;
        }
        const targetDirName = args[0];
        if (targetDirName === '..') {
          if (terminalCwdPath === null) { // Already at root of opened folder
            newOutputLines.push(`Already at ${openedDirectoryName.split('/').pop() || '~'}.`);
          } else {
            const parentPath = getParentPath(terminalCwdPath); 
            if (parentPath === openedDirectoryName || parentPath === null) { 
                // Parent is the root opened folder itself, or terminalCwdPath was a direct child of root
                setTerminalCwdPath(null);
                newOutputLines.push(`Navigating to: ${openedDirectoryName.split('/').pop() || '~'}`);
            } else if (parentPath) {
                setTerminalCwdPath(parentPath);
                newOutputLines.push(`Navigating to: ${parentPath.substring(parentPath.lastIndexOf('/') + 1)}`);
            } else {
                // Should not happen if paths are correct
                newOutputLines.push(`Error: cannot determine parent of ${terminalCwdPath}`);
            }
          }
        } else {
          // Path to the directory where we are looking for targetDirName
          const baseDirForSearch = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
          if (!baseDirForSearch) break;

          const currentDirItem = findItemByPathRecursive(files, baseDirForSearch);
          // If terminalCwdPath is null, currentDirChildren are 'files' (root content).
          // Otherwise, currentDirChildren are children of the item at terminalCwdPath.
          const currentDirChildren = terminalCwdPath === null ? files : (currentDirItem?.children || []);

          const targetItem = currentDirChildren.find(item => item.name === targetDirName && item.type === 'folder');
          if (targetItem) {
            setTerminalCwdPath(targetItem.path); 
            newOutputLines.push(`Navigating to: ${targetItem.name}`);
          } else {
            const searchLocationName = baseDirForSearch === openedDirectoryName ? openedDirectoryName.split('/').pop() : baseDirForSearch.substring(baseDirForSearch.lastIndexOf('/')+1);
            newOutputLines.push(`cd: ${targetDirName}: Directory not found in '${searchLocationName || '~'}'.`);
          }
        }
        break;
      }
      case 'mkdir':
      case 'touch': {
        if (args.length === 0) {
          newOutputLines.push(`${cmd}: missing operand`);
          newOutputLines.push(`Try: ${cmd} <name>`);
          break;
        }
        const itemName = args[0];
        // targetContainerPath for creation is the current terminalCwdPath (or null for root)
        const success = await handleCreateFileSystemItemInternal(cmd === 'mkdir' ? 'folder' : 'file', itemName, terminalCwdPath);
        if (success) {
            newOutputLines.push(`${cmd}: created ${cmd === 'mkdir' ? 'directory' : 'file'} '${itemName}'`);
        } // Errors are handled by toast in handleCreateFileSystemItemInternal, but could also push to terminal
        break;
      }
      case 'rm': {
        if (!openedDirectoryName || !rootDirectoryHandle) {
          newOutputLines.push('rm: No folder open.');
          break;
        }
        if (args.length === 0) {
          newOutputLines.push('rm: missing operand');
          break;
        }

        let targetName: string;
        let isRecursiveDelete = false;

        if (args[0] === '-rf') {
          if (args.length < 2) {
            newOutputLines.push('rm: missing operand after -rf');
            break;
          }
          targetName = args[1];
          isRecursiveDelete = true;
        } else {
          targetName = args[0];
          if (args.includes("-rf")) { // e.g. rm file.txt -rf
            newOutputLines.push('rm: -rf should precede the target if used.');
            break;
          }
        }
        
        if (targetName === '.' || targetName === '..') {
            newOutputLines.push(`rm: cannot remove '${targetName}': Operation not permitted or path is special.`);
            break;
        }

        const baseDeletionPath = terminalCwdPath || openedDirectoryName;
        const fullPathToDelete = targetName.startsWith(openedDirectoryName + '/') // Absolute path provided
            ? targetName
            : `${baseDeletionPath}/${targetName}`;

        const itemToDelete = findItemByPathRecursive(files, fullPathToDelete);

        if (!itemToDelete) {
          newOutputLines.push(`rm: cannot remove '${targetName}': No such file or directory`);
          break;
        }
        
        if (fullPathToDelete === openedDirectoryName) {
            newOutputLines.push(`rm: cannot remove '${itemToDelete.name}': Operation not permitted (cannot remove root opened folder).`);
            break;
        }

        if (itemToDelete.type === 'folder' && !isRecursiveDelete) {
          newOutputLines.push(`rm: cannot remove '${itemToDelete.name}': Is a directory. Use -rf option.`);
          break;
        }
        if (itemToDelete.type === 'file' && isRecursiveDelete) {
          // `rm -rf file.txt` is valid, -rf is just ignored for files.
          // No error, proceed.
        }
        
        const confirmed = window.confirm(`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`);
        if (!confirmed) {
          newOutputLines.push(`Deletion of "${itemToDelete.name}" cancelled.`);
          break;
        }

        const parentItemPath = getParentPath(fullPathToDelete);
        const parentDirHandle = parentItemPath === null // Item is in root of openedDirectoryName
            ? rootDirectoryHandle
            : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);

        if (!parentDirHandle) {
          newOutputLines.push(`rm: cannot remove '${itemToDelete.name}': Parent directory handle not found.`);
          break;
        }

        try {
          await parentDirHandle.removeEntry(itemToDelete.name, { recursive: isRecursiveDelete || itemToDelete.type === 'folder' });
          newOutputLines.push(`Removed '${itemToDelete.name}'.`);

          if (activeFile) {
            if (activeFile.path === fullPathToDelete || (itemToDelete.type === 'folder' && activeFile.path.startsWith(fullPathToDelete + '/'))) {
              setActiveFile(null);
              setEditorContent('');
            }
          }
          
          const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
          await refreshDirectoryInState(pathToRefresh, parentDirHandle);

        } catch (error: any) {
          console.error("Error deleting item via rm:", error);
          newOutputLines.push(`rm: cannot remove '${itemToDelete.name}': ${error.message || 'Permission denied or item in use.'}`);
          // Attempt to refresh state even on error to sync
           const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
           if (pathToRefreshOnError) await refreshDirectoryInState(pathToRefreshOnError, parentDirHandle);
        }
        break;
      }
      case 'clear':
        setTerminalOutput([`Terminal cleared. Type "help" for available commands.`]); 
        // Add prompt after clearing for next input
        setTimeout(() => setTerminalOutput(prev => [...prev, `${getTerminalPromptDisplay()} `]),0);
        return; 
      default:
        newOutputLines.push(`Command not found: ${cmd}. Type "help" for available commands.`);
    }
    
    // Add a slight delay for newOutputLines to be processed before adding the next prompt line
    setTimeout(() => {
        if (newOutputLines.length > 0) {
            setTerminalOutput(prev => [...prev, ...newOutputLines, `${getTerminalPromptDisplay()} `]);
        } else {
             setTerminalOutput(prev => [...prev, `${getTerminalPromptDisplay()} `]);
        }
    }, 100);

  }, [files, openedDirectoryName, terminalCwdPath, getTerminalPromptDisplay, toast, handleCreateFileSystemItemInternal, handleSelectFile, rootDirectoryHandle, activeFile, getDirectoryHandleByPath, refreshDirectoryInState]);


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
      // TODO: Optionally include other relevant project files for broader context
      // otherFiles: [{ filePath: '/path/to/other/file.ts', fileContent: '...' }] 
    };

    try {
      const result = await aiCodeCompletionFromContext(input);
      if (result.suggestions && result.suggestions.length > 0) {
        // For simplicity, inserting the first suggestion. UI could show multiple.
        const suggestion = result.suggestions[0];
        setEditorContent(prev => {
          // Insert suggestion at cursor position
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

    if (itemPath === openedDirectoryName) { // Prevent deleting the root folder itself via UI
      toast({ variant: "destructive", title: "Não Permitido", description: "Cannot delete the root opened folder." });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`);
    if (!confirmed) {
      // toast({ title: "Cancelado", description: "Deletion cancelled." }); // Optional: toast for cancellation
      return;
    }

    // Get the parent path of the item to delete.
    const parentItemPath = getParentPath(itemPath);
    
    // Get the handle of the parent directory in the file system.
    // If parentItemPath is null, item is in root, so parent is rootDirectoryHandle.
    const parentDirHandle = parentItemPath === null 
        ? rootDirectoryHandle 
        : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


    if (!parentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory of "${itemPath}" not found.` });
      return;
    }

    try {
      // For folders, recursive must be true. removeEntry handles this.
      await parentDirHandle.removeEntry(itemToDelete.name, { recursive: itemToDelete.type === 'folder' });
      
      toast({ title: "Excluído", description: `"${itemToDelete.name}" was deleted successfully.` });

      // If active file was deleted or was inside deleted folder, clear it
      if (activeFile) {
        if (activeFile.path === itemPath || (itemToDelete.type === 'folder' && activeFile.path.startsWith(itemPath + '/'))) {
          setActiveFile(null);
          setEditorContent('');
        }
      }
      
      // Refresh the parent directory in the state
      const pathToRefresh = parentItemPath === null ? openedDirectoryName : parentItemPath;
      await refreshDirectoryInState(pathToRefresh, parentDirHandle);

    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ variant: "destructive", title: "Erro ao Excluir", description: `Could not delete "${itemToDelete.name}". Check permissions or if item is in use.` });
      // Attempt to refresh state even on error to try to get consistent state
      const pathToRefreshOnError = parentItemPath === null ? openedDirectoryName : parentItemPath;
      if (pathToRefreshOnError) await refreshDirectoryInState(pathToRefreshOnError, parentDirHandle);
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
        <FileExplorerResizableWrapper>
          <FileExplorer
            files={files}
            onSelectFile={handleSelectFile}
            selectedFilePath={activeFile?.path || null}
            onCreateFile={(parentPath) => handleCreateItem('file', parentPath)}
            onCreateFolder={(parentPath) => handleCreateItem('folder', parentPath)}
            onRenameItem={handleRenameItem}
            onDeleteItem={handleDeleteItem}
            openedDirectoryName={openedDirectoryName}
            allFiles={files} // Pass allFiles for context menu logic
          />
        </FileExplorerResizableWrapper>
        <div className="flex flex-1 flex-col overflow-hidden">
          <CodeEditor
            content={editorContent}
            onContentChange={handleEditorChange}
            onGenerateFromComment={handleGenerateFromComment}
            onCompleteFromContext={handleCompleteFromContext}
            fileName={activeFile?.name || (files.length === 0 && !openedDirectoryName ? "No file open" : (openedDirectoryName && !activeFile ? openedDirectoryName : "Select a file"))}
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

