"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TerminalResizableWrapperProps {
  children: React.ReactNode;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function TerminalResizableWrapper({
  children,
  initialHeight = 200,
  minHeight = 100,
  maxHeight = 500,
}: TerminalResizableWrapperProps) {
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !wrapperRef.current) return;
    
    const newHeight = window.innerHeight - event.clientY - (wrapperRef.current.parentElement?.offsetTop || 0);
    
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      setHeight(newHeight);
    } else if (newHeight < minHeight) {
      setHeight(minHeight);
    } else if (newHeight > maxHeight) {
      setHeight(maxHeight);
    }
  }, [isDragging, minHeight, maxHeight]);

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

  return (
    <div ref={wrapperRef} style={{ height: `${height}px` }} className="relative shrink-0">
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 w-full h-2 cursor-row-resize bg-border hover:bg-accent transition-colors z-10"
        title="Resize terminal"
      />
      <div className="h-full pt-2 overflow-hidden"> {/* pt-2 to account for handle */}
        {children}
      </div>
    </div>
  );
}
