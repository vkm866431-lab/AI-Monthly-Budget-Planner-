import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Panel'}
    >
      <div
        className="fixed inset-0 bg-[#0B1120]/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm h-full bg-white dark:bg-[#111827] border-l border-[#E5E7EB] dark:border-[#263247] shadow-2xl flex flex-col">
        {title && (
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#263247] shrink-0">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#172033]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
