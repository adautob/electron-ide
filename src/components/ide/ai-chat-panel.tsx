
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { chatWithAI, type ChatMessage as AIChatMessage } from '@/ai/flows/chat-flow'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DisplayMessage extends AIChatMessage {
  id: string;
}

export function AiChatPanel() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      // Prepare history for the AI
      const historyForAI: AIChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      
      const response = await chatWithAI({ userMessage: trimmedInput, history: historyForAI });
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
      // Optionally, add the user message back to input or keep it in chat with an error indicator
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Card className="w-96 flex flex-col h-full border-l border-border rounded-none shrink-0">
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
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {/* For proper markdown/code rendering, a library might be needed in future */}
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm bg-muted text-muted-foreground animate-pulse">
                  AI is thinking...
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
            placeholder="Ask AI anything..."
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 h-9"
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading}>
            <Send size={16} />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
