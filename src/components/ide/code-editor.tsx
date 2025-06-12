"use client";

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquarePlus } from 'lucide-react';
import React from 'react';

interface CodeEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onGenerateFromComment: (comment: string, existingCode: string) => void;
  onCompleteFromContext: (codeSnippet: string, cursorPosition: number) => void;
  fileName?: string | null;
}

export function CodeEditor({ 
  content, 
  onContentChange, 
  onGenerateFromComment, 
  onCompleteFromContext,
  fileName 
}: CodeEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleGenerate = () => {
    // For simplicity, let's assume the user selects a comment or types it
    // and we extract it. A more sophisticated approach would parse comments.
    const selection = textareaRef.current?.value.substring(textareaRef.current?.selectionStart, textareaRef.current?.selectionEnd);
    const comment = selection || "// TODO: Implement feature";
    onGenerateFromComment(comment, content);
  };

  const handleComplete = () => {
    const cursorPosition = textareaRef.current?.selectionStart ?? 0;
    onCompleteFromContext(content, cursorPosition);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-card">
      <div className="p-2 border-b border-border flex justify-between items-center shrink-0">
        <span className="text-sm font-medium">{fileName || "Untitled"}</span>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate} title="Generate code from comment/selection">
            <MessageSquarePlus size={16} className="mr-1" />
            Generate
          </Button>
          <Button variant="ghost" size="sm" onClick={handleComplete} title="Suggest code completion from context">
            <Sparkles size={16} className="mr-1" />
            Suggest
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Write your code here..."
        className="flex-1 w-full h-full p-4 font-code text-sm bg-card border-0 rounded-none focus-visible:ring-0 resize-none"
        spellCheck="false"
      />
    </div>
  );
}
