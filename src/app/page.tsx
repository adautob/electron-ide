
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
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to Electron IDE Terminal! Type "help" for available commands.']);
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
      const processedFiles = await processDirectory(directoryHandle, directoryHandle.name);
      setFiles(processedFiles);
      setActiveFile(null);
      setEditorContent('');
      setOpenedDirectoryName(directoryHandle.name);
      setTerminalCwdPath(null); // Reset terminal CWD to root of new folder
      setTerminalOutput([`Folder "${directoryHandle.name}" opened. Type "help" for available commands. ${getTerminalPromptDisplay()}`]);
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
    if (!currentRootHandle) return null;
    if (path === null || path === '' || path === openedDirectoryName) {
      return currentRootHandle;
    }

    let pathSegments: string[];
    if (path.startsWith(currentRootHandle.name + '/')) {
        pathSegments = path.substring(currentRootHandle.name.length + 1).split('/');
    } else if (path === currentRootHandle.name) { 
        return currentRootHandle;
    } else {
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
             
             let accumulatedPath = openedDirectoryName || '';
             const segmentsToCurrent = pathSegments.slice(0, pathSegments.indexOf(segment) + 1);

             if (accumulatedPath && segmentsToCurrent.length > 0) accumulatedPath += '/' + segmentsToCurrent.join('/');
             else if (segmentsToCurrent.length > 0) accumulatedPath = segmentsToCurrent.join('/');
             else accumulatedPath = openedDirectoryName || '';


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
                console.error(`Could not find directory handle for segment "${segment}" in path "${path}". Accumulated path: ${accumulatedPath}`);
                return null;
            }
        }
    }
    return currentHandle;
  }, [files, openedDirectoryName]);


  const refreshDirectoryInState = async (directoryPath: string | null, dirHandle: FileSystemDirectoryHandle) => {
    const pathPrefixForProcessDirectory = directoryPath === null ? (openedDirectoryName || '') : directoryPath;
    const newChildren = await processDirectory(dirHandle, pathPrefixForProcessDirectory);

    if (directoryPath === null || directoryPath === openedDirectoryName) { 
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
    targetContainerPath: string | null 
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
      toast({ variant: "destructive", title: "Erro", description: `Parent directory "${targetContainerPath || openedDirectoryName}" not found.` });
      return false;
    }
    
    try {
        if (type === 'file') {
            await parentDirHandleToCreateIn.getFileHandle(itemName);
        } else {
            await parentDirHandleToCreateIn.getDirectoryHandle(itemName);
        }
        toast({ variant: "destructive", title: "Erro ao Criar", description: `An item named "${itemName}" already exists in "${targetContainerPath || openedDirectoryName}".` });
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
      
      const refreshPath = targetContainerPath === null ? openedDirectoryName : targetContainerPath;
      await refreshDirectoryInState(refreshPath, parentDirHandleToCreateIn);
      
      toast({ title: `${type === 'file' ? 'Arquivo Criado' : 'Pasta Criada'}`, description: `"${itemName}" was created successfully in "${targetContainerPath || openedDirectoryName}".` });
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
         toast({ title: "Cancelado", description: `Creation of ${type} cancelled.` });
      }
      return;
    }

    const success = await handleCreateFileSystemItemInternal(type, itemNameFromPrompt, targetDirectoryPath);

    if (success && type === 'file') {
        // Construct the full path of the newly created file
        let newItemFullPath: string;
        if (targetDirectoryPath === null) { // Created in the root of the opened directory
            newItemFullPath = `${openedDirectoryName}/${itemNameFromPrompt}`;
        } else { // Created in a subdirectory
            newItemFullPath = `${targetDirectoryPath}/${itemNameFromPrompt}`;
        }
        
        setTimeout(async () => {
            const dirToRefreshHandle = targetDirectoryPath === null ? rootDirectoryHandle : await getDirectoryHandleByPath(targetDirectoryPath, rootDirectoryHandle);
            if (!dirToRefreshHandle) return;
            
            const refreshPath = targetDirectoryPath === null ? openedDirectoryName : targetDirectoryPath;
            await refreshDirectoryInState(refreshPath, dirToRefreshHandle);

            let fileToSelect: FileOrFolder | null = null;
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

    if (itemPath === openedDirectoryName) {
      toast({ variant: "destructive", title: "Não Permitido", description: "Cannot rename the root opened folder." });
      return;
    }

    const newName = prompt(`Enter new name for "${itemToRename.name}":`, itemToRename.name);
    if (!newName || newName.trim() === '' || newName === itemToRename.name || newName.includes('/') || newName.includes('\\')) {
      if (newName !== null) { 
        toast({ title: "Nome Inválido", description: "Rename cancelled, name unchanged or invalid." });
      } else {
        toast({ title: "Cancelado", description: "Rename cancelled." });
      }
      return;
    }

    const parentItemPath = getParentPath(itemPath); 
    
    const actualParentDirHandle = parentItemPath === null 
      ? rootDirectoryHandle 
      : await getDirectoryHandleByPath(parentItemPath, rootDirectoryHandle);


    if (!actualParentDirHandle) {
      toast({ variant: "destructive", title: "Erro", description: `Parent directory of "${itemPath}" not found.` });
      return;
    }

    try {
      if (itemToRename.type === 'file') {
        await actualParentDirHandle.getFileHandle(newName);
      } else {
        await actualParentDirHandle.getDirectoryHandle(newName);
      }
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `An item named "${newName}" already exists.` });
      return;
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
        console.error("Error checking existence for rename:", e);
        toast({ variant: "destructive", title: "Erro", description: "Failed to check existence of new name."});
        return;
      }
    }
    
    try {
      if (!itemToRename.handle) {
        toast({ variant: "destructive", title: "Erro", description: "Item handle not found." });
        return;
      }
      
      const handleToMove = itemToRename.handle as FileSystemFileHandle | FileSystemDirectoryHandle; 
      if (typeof (handleToMove as any).move === 'function') {
         await (handleToMove as any).move(actualParentDirHandle, newName);
      } else {
        console.error("FileSystemHandle.move() is not supported for this item or browser.");
        toast({
          variant: "destructive",
          title: "Operação Não Suportada",
          description: "Rename may not be fully supported by your browser. Try reloading the folder.",
        });
        await refreshDirectoryInState(parentItemPath || openedDirectoryName, actualParentDirHandle);
        return;
      }
      
      await refreshDirectoryInState(parentItemPath || openedDirectoryName, actualParentDirHandle);

      toast({ title: "Renomeado", description: `"${itemToRename.name}" was renamed to "${newName}".` });

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

    } catch (error) {
      console.error("Error renaming:", error);
      toast({ variant: "destructive", title: "Erro ao Renomear", description: `Could not rename "${itemToRename.name}". Check permissions or if the item is in use.` });
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

    if (!openedDirectoryName && cmd !== 'clear' && cmd !== 'help') {
        newOutputLines.push('No folder open. Use the "Open Folder" button in the header.');
        setTerminalOutput(prev => [...prev, ...newOutputLines]);
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
        newOutputLines.push('  mkdir <name>     - Create a new directory.');
        newOutputLines.push('  touch <name>     - Create a new empty file.');
        newOutputLines.push('  clear            - Clear the terminal screen.');
        break;
      case 'ls': {
        const dirToListPath = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
        let itemsToList: FileOrFolder[] = [];

        if (dirToListPath === openedDirectoryName) { 
            itemsToList = files;
        } else {
            const cwdItem = findItemByPathRecursive(files, dirToListPath!); 
            if (cwdItem && cwdItem.type === 'folder' && cwdItem.children) {
                itemsToList = cwdItem.children;
            } else {
                newOutputLines.push(`ls: cannot access '${dirToListPath}': Directory not found or not a folder`);
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
        if (args.length === 0 || args[0] === '~' || args[0] === '/') {
          setTerminalCwdPath(null); 
          newOutputLines.push(`Navigating to: ${openedDirectoryName || '~'}`);
          break;
        }
        const targetDirName = args[0];
        if (targetDirName === '..') {
          if (terminalCwdPath === null) {
            newOutputLines.push('Already at the root of the opened folder.');
          } else {
            const parent = getParentPath(terminalCwdPath); 
            if (parent === openedDirectoryName || parent === null) { 
                setTerminalCwdPath(null);
                newOutputLines.push(`Navigating to: ${openedDirectoryName || '~'}`);
            } else {
                setTerminalCwdPath(parent);
                newOutputLines.push(`Navigating to: ${parent ? parent.substring(parent.lastIndexOf('/') + 1) : (openedDirectoryName || '~')}`);
            }
          }
        } else {
          const baseDirForSearch = terminalCwdPath === null ? openedDirectoryName : terminalCwdPath;
          const currentDirItem = findItemByPathRecursive(files, baseDirForSearch!);
          const currentDirChildren = currentDirItem?.children || (terminalCwdPath === null ? files : []);

          const targetItem = currentDirChildren.find(item => item.name === targetDirName && item.type === 'folder');
          if (targetItem) {
            setTerminalCwdPath(targetItem.path); 
            newOutputLines.push(`Navigating to: ${targetItem.name}`);
          } else {
            newOutputLines.push(`cd: ${targetDirName}: Directory not found in '${baseDirForSearch || openedDirectoryName}'.`);
          }
        }
        break;
      }
      case 'mkdir': {
        if (args.length === 0) {
          newOutputLines.push('mkdir: missing operand');
          newOutputLines.push('Try: mkdir <directory_name>');
          break;
        }
        const dirName = args[0];
        const containerPath = terminalCwdPath;
        await handleCreateFileSystemItemInternal('folder', dirName, containerPath);
        break;
      }
      case 'touch': {
        if (args.length === 0) {
          newOutputLines.push('touch: missing file operand');
          newOutputLines.push('Try: touch <file_name>');
          break;
        }
        const fileName = args[0];
        const containerPath = terminalCwdPath;
        await handleCreateFileSystemItemInternal('file', fileName, containerPath);
        break;
      }
      case 'clear':
        setTerminalOutput([`Terminal cleared. Type "help" for available commands. ${getTerminalPromptDisplay()}`]); 
        return; 
      default:
        newOutputLines.push(`Command not found: ${cmd}. Type "help" for available commands.`);
    }
    
    setTimeout(() => {
        if (newOutputLines.length > 0) {
            setTerminalOutput(prev => [...prev, ...newOutputLines]);
        }
    }, 100);

  }, [files, openedDirectoryName, terminalCwdPath, getTerminalPromptDisplay, toast, handleCreateFileSystemItemInternal, handleSelectFile]);


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

    const confirmed = window.confirm(`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`);
    if (!confirmed) {
      toast({ title: "Cancelado", description: "Deletion cancelled." });
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

