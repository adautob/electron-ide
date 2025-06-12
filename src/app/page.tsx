"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileExplorer } from '@/components/ide/file-explorer';
import { CodeEditor } from '@/components/ide/code-editor';
import { IntegratedTerminal } from '@/components/ide/integrated-terminal';
import { IdeHeader } from '@/components/ide/ide-header';
import { PreferencesDialog } from '@/components/ide/preferences-dialog';
import { TerminalResizableWrapper } from '@/components/ide/terminal-resizable-wrapper';
import type { FileOrFolder } from '@/types';
import { generateCodeFromComment } from '@/ai/flows/ai-code-completion';
import { aiCodeCompletionFromContext } from '@/ai/flows/ai-code-completion-from-context';
import { useToast } from '@/hooks/use-toast';

const initialFiles: FileOrFolder[] = [
  { 
    id: '1', name: 'src', type: 'folder', path: '/src', children: [
      { 
        id: '2', name: 'app', type: 'folder', path: '/src/app', children: [
          { id: '3', name: 'page.tsx', type: 'file', path: '/src/app/page.tsx', content: "export default function Page() {\n  return <h1>Hello, Next.js!</h1>;\n}" },
          { id: '4', name: 'layout.tsx', type: 'file', path: '/src/app/layout.tsx', content: "// Root layout content" },
        ]
      },
      { 
        id: '5', name: 'components', type: 'folder', path: '/src/components', children: [
          { id: '6', name: 'button.tsx', type: 'file', path: '/src/components/button.tsx', content: "// Button component" }
        ]
      }
    ]
  },
  { id: '7', name: 'package.json', type: 'file', path: '/package.json', content: "{ \"name\": \"electron-ide\" }" },
  { id: '8', name: 'README.md', type: 'file', path: '/README.md', content: "# Electron IDE" }
];

export default function IdePage() {
  const [files, setFiles] = useState<FileOrFolder[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<FileOrFolder | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to Electron IDE Terminal!']);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial file if none selected
    if (!activeFile && files.length > 0) {
      const firstFile = findFirstFile(files);
      if (firstFile) {
        setActiveFile(firstFile);
        setEditorContent(firstFile.content || '');
      }
    }
  }, [files, activeFile]);

  const findFirstFile = (items: FileOrFolder[]): FileOrFolder | null => {
    for (const item of items) {
      if (item.type === 'file') return item;
      if (item.children) {
        const found = findFirstFile(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  const handleSelectFile = useCallback((file: FileOrFolder) => {
    if (file.type === 'file') {
      setActiveFile(file);
      setEditorContent(file.content || `// Content for ${file.name}\n`);
    } else {
      // Optionally handle folder selection (e.g. toggle, or do nothing for now)
      setActiveFile(file); // So it shows as selected in explorer
      // Don't change editor content for folders
    }
  }, []);

  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    if (activeFile && activeFile.type === 'file') {
      // This is where you'd typically mark the file as dirty or autosave
      // For this demo, we'll update the in-memory content
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
      setFiles(prevFiles => updateFileContent(prevFiles));
    }
  }, [activeFile]);

  const handleCommandSubmit = useCallback((command: string) => {
    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    // Simulate command execution
    setTimeout(() => {
      if (command.toLowerCase() === 'ls') {
        setTerminalOutput(prev => [...prev, 'src  package.json  README.md']);
      } else if (command.toLowerCase() === 'clear') {
        setTerminalOutput(['Welcome to Electron IDE Terminal!']);
      } else {
        setTerminalOutput(prev => [...prev, `Command not found: ${command}`]);
      }
    }, 300);
  }, []);

  const handleGenerateFromComment = async (comment: string, existingCode: string) => {
    toast({ title: "AI", description: "Generating code from comment..." });
    try {
      const result = await generateCodeFromComment({ comment, existingCode });
      setEditorContent(prev => `${prev}\n${result.codeSuggestion}`);
      toast({ title: "AI Success", description: "Code suggestion added." });
    } catch (error) {
      console.error("AI Error:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate code." });
    }
  };

  const handleCompleteFromContext = async (codeSnippet: string, cursorPosition: number) => {
    toast({ title: "AI", description: "Generating code completion..." });
    try {
      // For simplicity, programming language is hardcoded.
      const result = await aiCodeCompletionFromContext({ codeSnippet, cursorPosition, programmingLanguage: 'typescript' });
      if (result.suggestions && result.suggestions.length > 0) {
        // Insert the first suggestion. A real IDE would show a dropdown.
        const suggestion = result.suggestions[0];
        setEditorContent(prev => {
          return prev.substring(0, cursorPosition) + suggestion + prev.substring(cursorPosition);
        });
        toast({ title: "AI Success", description: `Suggestion: ${suggestion}` });
      } else {
        toast({ title: "AI", description: "No suggestions found." });
      }
    } catch (error) {
      console.error("AI Error:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to get completions." });
    }
  };

  // Placeholder file/folder operations
  const logAction = (action: string, path: string | null) => toast({ title: "File Action", description: `${action}: ${path || 'root'}`});
  const handleCreateFile = (parentPath: string | null) => logAction("Create File in", parentPath);
  const handleCreateFolder = (parentPath: string | null) => logAction("Create Folder in", parentPath);
  const handleRenameItem = (itemPath: string) => logAction("Rename Item", itemPath);
  const handleDeleteItem = (itemPath: string) => logAction("Delete Item", itemPath);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <IdeHeader onOpenPreferences={() => setIsPreferencesOpen(true)} />
      <main className="flex flex-1 overflow-hidden">
        <FileExplorer
          files={files}
          onSelectFile={handleSelectFile}
          selectedFilePath={activeFile?.path || null}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRenameItem={handleRenameItem}
          onDeleteItem={handleDeleteItem}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CodeEditor
            content={editorContent}
            onContentChange={handleEditorChange}
            onGenerateFromComment={handleGenerateFromComment}
            onCompleteFromContext={handleCompleteFromContext}
            fileName={activeFile?.name}
          />
          <TerminalResizableWrapper initialHeight={180} minHeight={80} maxHeight={400}>
            <IntegratedTerminal
              output={terminalOutput}
              onCommandSubmit={handleCommandSubmit}
            />
          </TerminalResizableWrapper>
        </div>
      </main>
      <PreferencesDialog isOpen={isPreferencesOpen} onOpenChange={setIsPreferencesOpen} />
    </div>
  );
}
