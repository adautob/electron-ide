
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { chatWithAI, type ChatMessage as AIChatMessage, type ChatInput } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { FileOrFolder } from '@/types';

interface DisplayMessage extends AIChatMessage {
  id: string;
}

interface AiChatPanelProps {
  projectFiles: FileOrFolder[];
}

interface CodeBlockProps {
  codeContent: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ codeContent, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err);
      // Optionally, show a toast error
    }
  };

  return (
    <div className="relative my-2 bg-muted p-3 rounded-md shadow group">
      {language && (
        <span className="absolute top-1 left-2 text-xs text-muted-foreground">{language}</span>
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

const MIN_PANEL_WIDTH = 280; // Minimum width for the chat panel
const DEFAULT_PANEL_WIDTH = 384; // Equivalent to w-96

export function AiChatPanel({ projectFiles }: AiChatPanelProps) {
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
    // No max width, let it expand
    
    setPanelWidth(newWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
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
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
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
          filesForAI.push({
            filePath: item.path, // Use full path for AI context
            fileContent: contentToUse,
          });
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


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: trimmedInput,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyForAI: AIChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      const currentProjectFilesForAI = await prepareProjectFilesForAI(projectFiles);
      
      const chatInput: ChatInput = {
         userMessage: trimmedInput, 
         history: historyForAI,
      };
      if (currentProjectFilesForAI) {
        chatInput.projectFiles = currentProjectFilesForAI;
      }
      
      const response = await chatWithAI(chatInput);
      const aiMessage: DisplayMessage = {
        id: Date.now().toString() + '-model',
        role: 'model',
        content: response.aiResponse,
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

  const renderMessageContent = (content: string) => {
    const parts = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(?:([\w.-]+)\n)?([\s\S]*?)```/g; // Captures optional language and content
    let match;
  
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Text before the code block
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap font-sans">
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }
      // The code block
      const language = match[1]; // Optional language (e.g., html, javascript)
      const code = match[2].trim(); // Trim to remove leading/trailing newlines within the block
      parts.push(
        <CodeBlock key={`code-${match.index}`} codeContent={code} language={language} />
      );
      lastIndex = codeBlockRegex.lastIndex;
    }
  
    // Text remaining after the last code block
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap font-sans">
          {content.substring(lastIndex)}
        </span>
      );
    }
  
    return parts.length > 0 ? <>{parts}</> : <pre className="whitespace-pre-wrap font-sans">{content}</pre>;
  };

  return (
    <Card
      style={{ width: `${panelWidth}px` }}
      className="flex flex-col h-full border-l border-border rounded-none shrink-0 relative"
    >
      <div
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 h-full w-3 transform -translate-x-1/2 cursor-col-resize flex items-center justify-center z-20 group"
        title="Redimensionar painel"
      >
        <div className="h-10 w-1 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
      </div>
      <CardHeader className="p-3 border-b border-border">
        <CardTitle className="text-base font-semibold font-headline">AI Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[95%] rounded-lg px-3 py-2 text-sm shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {renderMessageContent(msg.content)}
                </div>
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
      <CardFooter className="p-3 border-t border-border">
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

