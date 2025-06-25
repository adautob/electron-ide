
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/theme-provider';

export function IntegratedTerminal() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<{ type: 'prompt' | 'command' | 'response', text: string }[]>(
        [{ type: 'prompt', text: 'Simulated Terminal > ' }]
    );
    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { theme } = useTheme();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const command = input.trim();
        if (command) {
            const newOutput = [...output];
            newOutput[newOutput.length - 1].text += command; // Append command to the last prompt line
            newOutput.push({ type: 'response', text: `command not found: ${command}` });
            newOutput.push({ type: 'prompt', text: 'Simulated Terminal > ' });
            setOutput(newOutput);
        } else {
            // just a new line
             const newOutput = [...output];
             newOutput.push({ type: 'prompt', text: 'Simulated Terminal > ' });
             setOutput(newOutput);
        }
        setInput('');
    };

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
    }, [output]);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const terminalBg = theme === 'dark' ? 'bg-[#2C3E50]' : 'bg-[#f1f1f1]';
    const terminalFg = theme === 'dark' ? 'text-[#f8f8f2]' : 'text-black';

    const handleClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div 
            className={`h-full w-full p-2 font-code text-sm overflow-y-auto ${terminalBg} ${terminalFg}`}
            onClick={handleClick}
        >
            {output.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap">
                    {line.type === 'prompt' && index === output.length - 1 ? (
                        <form onSubmit={handleFormSubmit} className="inline-flex items-center w-full">
                            <span>{line.text}</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                className="bg-transparent border-none outline-none flex-1 text-inherit font-inherit"
                                autoFocus
                                spellCheck="false"
                            />
                        </form>
                    ) : (
                        <span>{line.text}</span>
                    )}
                </div>
            ))}
            <div ref={endOfOutputRef} />
        </div>
    );
}
