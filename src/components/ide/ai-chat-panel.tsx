
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Copy, Check, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { chatWithAI, type ChatMessage as AIChatMessage, type ChatInput } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { FileOrFolder } from '@/types';

interface FileOperation {
  filePath: string;
  content: string;
}

interface DisplayMessage extends AIChatMessage {
  id: string;
  operations?: FileOperation[];
  isApplied?: boolean; // To track if operations for a message have been applied
}

interface AiChatPanelProps {
  projectFiles: FileOrFolder[];
  onFileOperation: (operation: FileOperation) => void;
  selectedFilePath: string | null;
}

interface CodeBlockProps {
  codeContent: string;
  language?: string;
  filePath?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ codeContent, language, filePath }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  
  const displayLanguage = filePath ? `${language} - ${filePath}` : language;

  return (
    <div className="relative my-2 bg-muted p-3 rounded-md shadow group">
      {displayLanguage && (
        <span className="absolute top-1 left-2 text-xs text-muted-foreground">{displayLanguage}</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        title="Copiar código"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        <span className="sr-only">Copiar código</span>
      </Button>
      <pre className="whitespace-pre-wrap text-sm font-code overflow-x-auto pt-4">
        {codeContent}
      </pre>
    </div>
  );
};

const MIN_PANEL_WIDTH = 280;
const DEFAULT_PANEL_WIDTH = 384;

export function AiChatPanel({ projectFiles, onFileOperation, selectedFilePath }: AiChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const initialMouseX = useRef(0);
  const initialPanelWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragHandleRef.current) {
      setIsDragging(true);
      initialMouseX.current = e.clientX;
      initialPanelWidth.current = panelWidth;
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = event.clientX - initialMouseX.current;
    let newWidth = initialPanelWidth.current - deltaX;
    if (newWidth < MIN_PANEL_WIDTH) newWidth = MIN_PANEL_WIDTH;
    setPanelWidth(newWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) setIsDragging(false);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const prepareProjectFilesForAI = useCallback(async (allProjectFiles: FileOrFolder[]): Promise<ChatInput['projectFiles']> => {
    const filesForAI: NonNullable<ChatInput['projectFiles']> = [];
    
    const processItem = async (item: FileOrFolder) => {
      if (item.type === 'file') {
        let contentToUse: string | undefined = item.content;
        if ((contentToUse === undefined || contentToUse === null) && item.handle && item.handle.kind === 'file') {
          try {
            const fsFileHandle = item.handle as FileSystemFileHandle;
            const fileData = await fsFileHandle.getFile();
            contentToUse = await fileData.text();
          } catch (err) {
            console.warn(`[AI Chat] Could not read content for AI from file: ${item.path}. Error:`, err);
            contentToUse = undefined; 
          }
        }
        if (typeof contentToUse === 'string') {
          filesForAI.push({ filePath: item.path, fileContent: contentToUse });
        }
      }
      if (item.children) {
        for (const child of item.children) {
          await processItem(child);
        }
      }
    };

    for (const item of allProjectFiles) {
      await processItem(item);
    }
    return filesForAI.length > 0 ? filesForAI : undefined;
  }, []);

  const fileOperationRegex = /\[START_FILE:([^\]]+)\]([\s\S]*?)\[END_FILE\]/g;

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: DisplayMessage = { id: Date.now().toString() + '-user', role: 'user', content: trimmedInput };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyForAI: AIChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      const currentProjectFilesForAI = await prepareProjectFilesForAI(projectFiles);
      
      const chatInput: ChatInput = {
         userMessage: trimmedInput, 
         history: historyForAI,
         selectedPath: selectedFilePath ?? undefined,
         projectFiles: currentProjectFilesForAI,
      };
      
      const response = await chatWithAI(chatInput);
      const aiResponseText = response.aiResponse;

      // Use a Map to automatically handle duplicate file paths, keeping only the last one.
      const operationMap = new Map<string, FileOperation>();
      let match;
      fileOperationRegex.lastIndex = 0; // Reset regex from previous executions
      while ((match = fileOperationRegex.exec(aiResponseText)) !== null) {
        const filePath = match[1].trim();
        const content = match[2];
        if (filePath && content !== undefined) {
          operationMap.set(filePath, { filePath, content });
        }
      }
      const operations = Array.from(operationMap.values());
      
      const summaryText = aiResponseText.replace(fileOperationRegex, '').trim();

      const aiMessage: DisplayMessage = {
        id: Date.now().toString() + '-model',
        role: 'model',
        content: summaryText,
        operations: operations.length > 0 ? operations : undefined,
        isApplied: false,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error('Error chatting with AI:', error);
      toast({
        variant: 'destructive',
        title: 'AI Chat Error',
        description: 'Failed to get a response from the AI.',
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleApplyChanges = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.operations) return;

    message.operations.forEach(op => {
      onFileOperation(op);
    });

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isApplied: true } : m));
    
    toast({
      title: "Alterações Aplicadas",
      description: `${message.operations.length} arquivo(s) foram modificados/criados.`,
    });
  };

  const handleCancelChanges = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isApplied: true, operations: undefined } : m));
    toast({
      title: "Alterações Canceladas",
      description: "Nenhuma alteração foi aplicada.",
    });
  };

  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(?:[\w.-]*)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
  
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words font-sans">{content.substring(lastIndex, match.index)}</span>);
      }
      const code = match[1];
      parts.push(<CodeBlock key={`code-${match.index}`} codeContent={code} />);
      lastIndex = codeBlockRegex.lastIndex;
    }
  
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words font-sans">{content.substring(lastIndex)}</span>);
    }
  
    return parts.length > 0 ? <>{parts}</> : <span className="whitespace-pre-wrap break-words font-sans">{content}</span>;
  };

  return (
    <Card
      style={{ width: `${panelWidth}px` }}
      className="flex flex-col h-full border-l border-border rounded-none shrink-0 relative bg-background text-foreground"
    >
      <div
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 h-full w-3 transform -translate-x-1/2 cursor-col-resize flex items-center justify-center z-20 group"
        title="Redimensionar painel"
      >
        <div className="h-10 w-1 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
      </div>
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-base font-semibold font-headline">AI Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn('max-w-[95%] rounded-lg px-3 py-2 text-sm shadow-sm overflow-x-auto', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                  {renderMessageContent(msg.content)}
                </div>
                {msg.role === 'model' && msg.operations && !msg.isApplied && (
                  <div className="mt-2 p-3 rounded-lg border bg-card w-full max-w-[95%] overflow-x-auto">
                    <h4 className="text-sm font-semibold mb-2">A IA propõe as seguintes alterações:</h4>
                    <ul className="space-y-1 mb-3">
                      {msg.operations.map((op) => (
                        <li key={op.filePath} className="text-xs flex items-center gap-2 text-muted-foreground">
                          <FileText size={14} className="shrink-0" />
                          <span className="font-mono whitespace-nowrap" title={op.filePath}>{op.filePath}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleCancelChanges(msg.id)}>
                        <XCircle className="mr-1" size={16} />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleApplyChanges(msg.id)} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="mr-1" size={16} />
                        Aplicar Alterações
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm bg-muted text-muted-foreground animate-pulse">
                  AI está pensando...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Pergunte à IA..."
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 h-9"
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading}>
            <Send size={16} />
            <span className="sr-only">Enviar mensagem</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
