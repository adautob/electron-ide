
"use client";

import React from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // For HTML, XML
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
// Note: The CSS theme (e.g., prism-okaidia.css) is imported in globals.css

import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquarePlus } from 'lucide-react';

interface CodeEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onGenerateFromComment: (comment: string, existingCode: string) => void;
  onCompleteFromContext: (codeSnippet: string, cursorPosition: number) => void;
  fileName?: string | null;
}

const getLanguage = (fileName?: string | null): string => {
  if (!fileName) return 'clike'; // Default language if none detected
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'css':
      return 'css';
    case 'html':
    case 'xml':
    case 'svg':
      return 'markup';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    default:
      return 'clike'; // Fallback for unknown extensions
  }
};

const highlightCode = (code: string, lang: string) => {
  const language = Prism.languages[lang] || Prism.languages.clike;
  try {
    return Prism.highlight(code, language, lang);
  } catch (e) {
    console.error("Prism highlighting error:", e);
    return code; // Return original code on error
  }
};

export function CodeEditor({ 
  content, 
  onContentChange, 
  onGenerateFromComment, 
  onCompleteFromContext,
  fileName 
}: CodeEditorProps) {
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    const textarea = editorContainerRef.current?.querySelector('textarea');
    if (!textarea) return;
    
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const value = textarea.value;

    const selection = value.substring(selectionStart, selectionEnd);
    const comment = selection || "// TODO: Implement feature"; // Default if no text selected
    onGenerateFromComment(comment, content);
  };

  const handleComplete = () => {
    const textarea = editorContainerRef.current?.querySelector('textarea');
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart ?? 0;
    onCompleteFromContext(content, cursorPosition);
  };

  const currentLanguage = getLanguage(fileName);

  return (
    <div className="flex flex-col flex-1 h-full bg-card">
      <div className="p-2 border-b border-yellow-500 flex justify-between items-center shrink-0">
        <span className="text-sm font-medium">{fileName || "Untitled"} ({currentLanguage})</span>
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
      <div className="flex-1 w-full h-full relative code-editor-instance">
        <Editor
          ref={editorContainerRef}
          value={content}
          onValueChange={onContentChange}
          highlight={(code) => highlightCode(code, currentLanguage)}
          padding={16} // Corresponds to p-4 or 1rem
          style={{
            fontFamily: "'Source Code Pro', monospace",
            fontSize: 14,
            outline: 'none',
            minHeight: '100%', // Ensure editor takes full height of its container
          }}
          // ClassNames for internal elements of react-simple-code-editor
          // These are styled in globals.css to overlay textarea on pre correctly
          textareaClassName="editor-textarea" 
          preClassName="editor-pre"
          spellCheck="false"
          placeholder="Write your code here..."
        />
      </div>
    </div>
  );
}
