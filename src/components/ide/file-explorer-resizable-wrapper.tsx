
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FileExplorerResizableWrapperProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
}

const MIN_EXPLORER_WIDTH = 150;
const DEFAULT_EXPLORER_WIDTH = 256; // Equivalent to w-64

export function FileExplorerResizableWrapper({
  children,
  initialWidth = DEFAULT_EXPLORER_WIDTH,
  minWidth = MIN_EXPLORER_WIDTH,
}: FileExplorerResizableWrapperProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const initialMouseX = useRef(0);
  const initialPanelWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragHandleRef.current) {
      setIsDragging(true);
      initialMouseX.current = e.clientX;
      initialPanelWidth.current = width;
      e.preventDefault(); 
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = event.clientX - initialMouseX.current;
    let newWidth = initialPanelWidth.current + deltaX;

    if (newWidth < minWidth) newWidth = minWidth;
    
    setWidth(newWidth);
  }, [isDragging, minWidth]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative h-full shrink-0 bg-sidebar text-sidebar-foreground border-r border-yellow-500"
    >
      {children}
      <div
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 h-full w-3 transform translate-x-1/2 cursor-col-resize flex items-center justify-center z-20 group"
        title="Redimensionar explorador"
      >
        <div className="h-10 w-1 bg-yellow-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
      </div>
    </div>
  );
}

